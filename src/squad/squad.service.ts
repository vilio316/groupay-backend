import {
  Injectable,
  Inject,
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

import * as fs from 'fs';
import * as path from 'path';

import {
  SQUAD_MODULE_OPTIONS,
  SQUAD_SANDBOX_BASE_URL,
  SQUAD_PRODUCTION_BASE_URL,
} from '../squad/squad.config';

import type { SquadModuleOptions } from '../squad/squad.config';
import {
  InitiatePaymentDto,
  ChargeCardDto,
  CancelRecurringChargeDto,
  QueryTransactionsDto,
  SimulatePaymentDto,
  AccountLookupDto,
  FundTransferDto,
  RequeryTransferDto,
  GetAllTransfersDto,
  RefundDto,
  VirtualAccountDto,
} from './dto/squad.dto';

import {
  SquadApiResponse,
  InitiatePaymentResponseData,
  VerifyTransactionResponseData,
  ChargeCardResponseData,
  AccountLookupResponseData,
  FundTransferResponseData,
  TransferRecord,
  RefundResponseData,
  TransactionRecord,
} from '../squad/squad.interfaces';

@Injectable()
export class SquadService {
  private readonly http: AxiosInstance;
  private readonly logger = new Logger(SquadService.name);

  constructor(
    @Inject(SQUAD_MODULE_OPTIONS) private readonly options: SquadModuleOptions,
    private readonly prisma: PrismaService,
  ) {
    const baseURL = options.isProduction
      ? SQUAD_PRODUCTION_BASE_URL
      : SQUAD_SANDBOX_BASE_URL;

    this.http = axios.create({
      baseURL,
      headers: {
        Authorization: `Bearer ${options.secretKey}`,
        'Content-Type': 'application/json',
      },
    });

    this.http.interceptors.response.use(
      (res) => res,
      (err: AxiosError) => {
        const status = err.response?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;
        const message =
          (err.response?.data as any)?.message ??
          err.message ??
          'Squad API error';
        this.logger.error(`Squad API error [${status}]: ${message}`);
        throw new HttpException({ message, raw: err.response?.data }, status);
      },
    );
  }

  async handleWebhook(payload: Record<string, any>, signature?: string) {
    console.log(payload);
    if (!this.isValidWebhookSignature(payload, signature)) {
      throw new UnauthorizedException('Invalid Squad webhook signature');
    }

    const data = this.resolveEventData(payload);
    const metadata = this.resolveWebhookMetadata(payload, data);
    const eventType = this.resolveWebhookEventType(payload, data);

    const isTransferEvent = this.isTransferEvent(eventType, data, metadata);
    const transactionReference = isTransferEvent
      ? undefined
      : this.resolveTransactionReference(data, metadata);
    const transferReference = this.resolveTransferReference(
      data,
      metadata,
      isTransferEvent,
    );

    const webhookEvent = await this.prisma.webhookEvent.create({
      data: {
        provider: 'squad',
        eventType,
        rawPayload: payload,
        signature: signature ?? null,
        processed: false,
      },
    });

    // if (!transactionReference && !transferReference) {
    //   await this.markWebhookUnprocessed(
    //     webhookEvent.id,
    //     'FINANCIAL_REFERENCE_MISSING',
    //   );

    //   return {
    //     received: true,
    //     processed: false,
    //     provider: 'squad',
    //     eventType,
    //     reason: 'FINANCIAL_REFERENCE_MISSING',
    //   };
    // }

    let persistedTransactionReference: string | null = null;
    let persistedTransferReference: string | null = null;

    try {
      if (transactionReference) {
        await this.persistTransactionFromWebhook(
          transactionReference,
          data,
          metadata,
        );
        persistedTransactionReference = transactionReference;
      }

      // if (transferReference) {
      //   const transferSaved = await this.persistTransferFromWebhook(
      //     transferReference,
      //     data,
      //     metadata,
      //   );

      //   if (!transferSaved) {
      //     await this.markWebhookUnprocessed(
      //       webhookEvent.id,
      //       'BANK_ACCOUNT_METADATA_MISSING',
      //       {
      //         transactionReference: persistedTransactionReference,
      //       },
      //     );

      //     return {
      //       received: true,
      //       processed: false,
      //       provider: 'squad',
      //       eventType,
      //       transactionReference: transactionReference ?? null,
      //       transferReference,
      //       reason: 'BANK_ACCOUNT_METADATA_MISSING',
      //     };
      //   }

      //   persistedTransferReference = transferReference;
      // }

      await this.prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          transactionReference: persistedTransactionReference,
          transferReference: persistedTransferReference,
        },
      });

      await this.prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          transactionReference: transactionReference ?? null,
          transferReference: transferReference ?? null,
          processed: true,
          processedAt: new Date(),
        },
      });

      return {
        received: true,
        processed: true,
        provider: 'squad',
        eventType,
        transactionReference: transactionReference ?? null,
        transferReference: transferReference ?? null,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Webhook processing failed';
      this.logger.error(
        `Squad webhook ${webhookEvent.id} persisted but processing failed: ${message}`,
      );

      await this.markWebhookUnprocessed(webhookEvent.id, message, {
        transactionReference: persistedTransactionReference,
        transferReference: persistedTransferReference,
      });

      return {
        received: true,
        processed: false,
        provider: 'squad',
        eventType,
        transactionReference: transactionReference ?? null,
        transferReference: transferReference ?? null,
        reason: 'WEBHOOK_PROCESSING_FAILED',
      };
    }
  }

  private async markWebhookUnprocessed(
    webhookEventId: string,
    reason: string,
    references: {
      transactionReference?: string | null;
      transferReference?: string | null;
    } = {},
  ) {
    await this.prisma.webhookEvent.update({
      where: { id: webhookEventId },
      data: {
        transactionReference: references.transactionReference ?? null,
        transferReference: references.transferReference ?? null,
        processed: false,
      },
    });
  }

  private async persistTransactionFromWebhook(
    transactionRef: string,
    data: Record<string, any>,
    metadata: Record<string, any>,
  ) {
    const amount = this.resolveAmount(data, metadata);
    const channel =
      this.resolveFirstStringFromSources(
        [data, metadata],
        [
          'channel',
          'payment_channel',
          'paymentChannel',
          'transaction_channel',
          'payment_method',
          'paymentMethod',
        ],
      ) ?? (data.virtual_account_number ? 'virtual-account' : 'SQUAD');
    const status =
      this.resolveFirstStringFromSources(
        [data, metadata],
        [
          'status',
          'transaction_status',
          'transactionStatus',
          'payment_status',
          'paymentStatus',
        ],
      ) ??
      (String(data.transaction_indicator ?? '').toUpperCase() === 'C'
        ? 'SUCCESS'
        : 'UNKNOWN');

    await this.prisma.transaction.upsert({
      where: { transactionRef },
      create: {
        transactionRef,
        amount,
        channel,
        status,
      },
      update: {
        amount,
        channel,
        status,
      },
    });
  }

  // private async persistTransferFromWebhook(
  //   transferReference: string,
  //   data: Record<string, any>,
  //   metadata: Record<string, any>,
  // ) {
  //   const bankAccountId = this.resolveFirstStringFromSources(
  //     [data, metadata],
  //     ['bankAccountId', 'bank_account_id'],
  //   );

  //   if (!bankAccountId) {
  //     this.logger.warn(
  //       `Skipping transfer persistence for ${transferReference}; no bankAccountId was present in webhook metadata`,
  //     );
  //     return false;
  //   }

  //   const bankAccount = await this.prisma..findFirst({
  //     where: {
  //       id: bankAccountId,
  //       vendorId,
  //     },
  //     select: { id: true },
  //   });

  //   if (!bankAccount) {
  //     this.logger.warn(
  //       `Skipping transfer persistence for ${transferReference}; bank account ${bankAccountId} was not found for vendor ${vendorId}`,
  //     );
  //     return false;
  //   }

  //   await this.prisma.transfer.upsert({
  //     where: { transferReference },
  //     create: {
  //       vendorId,
  //       bankAccountId,
  //       transferReference,
  //       amount: this.resolveAmount(data, metadata),
  //       currency:
  //         this.resolveFirstStringFromSources([data, metadata], [
  //           'currency',
  //           'currency_id',
  //           'currencyId',
  //         ]) ?? 'NGN',
  //       status:
  //         this.resolveFirstStringFromSources([data, metadata], ['status']) ??
  //         'UNKNOWN',
  //       rawPayload: data,
  //     },
  //     update: {
  //       amount: this.resolveAmount(data, metadata),
  //       currency:
  //         this.resolveFirstStringFromSources([data, metadata], [
  //           'currency',
  //           'currency_id',
  //           'currencyId',
  //         ]) ?? 'NGN',
  //       status:
  //         this.resolveFirstStringFromSources([data, metadata], ['status']) ??
  //         'UNKNOWN',
  //       rawPayload: data,
  //     },
  //   });

  //   return true;
  // }

  private resolveWebhookEventType(
    payload: Record<string, any>,
    data: Record<string, any>,
  ) {
    return (
      this.resolveFirstStringFromSources(
        [payload, data],
        ['eventType', 'event_type', 'Event', 'type', 'name'],
      ) ?? 'UNKNOWN'
    );
  }

  private resolveWebhookMetadata(
    payload: Record<string, any>,
    data: Record<string, any>,
  ) {
    const body =
      payload.body && typeof payload.body === 'object'
        ? (payload.body as Record<string, any>)
        : {};

    return {
      ...this.asRecord(body.metadata),
      ...this.asRecord(payload.metadata),
      ...this.asRecord(data.metadata),
    };
  }

  private resolveTransactionReference(
    data: Record<string, any>,
    metadata: Record<string, any>,
  ) {
    return this.resolveFirstStringFromSources(
      [data, metadata],
      [
        'transactionReference',
        'transactionRef',
        'TransactionRef',
        'transaction_ref',
        'transaction_reference',
        'paymentReference',
        'payment_reference',
        'reference',
      ],
    );
  }

  private resolveTransferReference(
    data: Record<string, any>,
    metadata: Record<string, any>,
    isTransferEvent: boolean,
  ) {
    return this.resolveFirstStringFromSources(
      [data, metadata],
      [
        'transferReference',
        'transferRef',
        'transfer_reference',
        'payoutReference',
        'payout_reference',
        ...(isTransferEvent
          ? ['transaction_reference', 'transactionReference', 'reference']
          : []),
      ],
    );
  }

  private isTransferEvent(
    eventType: string,
    data: Record<string, any>,
    metadata: Record<string, any>,
  ) {
    const normalizedEventType = eventType.toLowerCase();

    return (
      normalizedEventType.includes('transfer') ||
      normalizedEventType.includes('payout') ||
      Boolean(
        this.resolveFirstStringFromSources(
          [data, metadata],
          [
            'transferReference',
            'transferRef',
            'transfer_reference',
            'payoutReference',
            'payout_reference',
          ],
        ),
      )
    );
  }

  private asRecord(value: unknown) {
    return value && typeof value === 'object'
      ? (value as Record<string, any>)
      : {};
  }

  private resolveFirstStringFromSources(
    sources: Record<string, any>[],
    keys: string[],
  ) {
    for (const source of sources) {
      const value = this.resolveFirstValue(source, keys);

      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
    }

    return undefined;
  }

  private resolveFirstValueFromSources(
    sources: Record<string, any>[],
    keys: string[],
  ) {
    for (const source of sources) {
      const value = this.resolveFirstValue(source, keys);

      if (value !== undefined && value !== null && value !== '') {
        return value;
      }
    }

    return undefined;
  }

  private resolveFirstValue(data: Record<string, any>, keys: string[]) {
    for (const key of keys) {
      const value = data[key];

      if (value !== undefined && value !== null && value !== '') {
        return value;
      }
    }

    return undefined;
  }

  private isValidWebhookSignature(
    payload: Record<string, any>,
    signature?: string,
  ) {
    const webhookSecret = null;

    if (!webhookSecret) {
      this.logger.warn(
        'SQUAD_WEBHOOK_SECRET is not set; accepting Squad webhook without signature validation',
      );
      return true;
    }

    if (!signature) {
      return false;
    }

    const normalizedSignature = signature.replace(/^sha(512)=/i, '');
    const body = JSON.stringify(payload);
    const candidates = [
      createHmac('sha512', webhookSecret).update(body).digest('hex'),
    ];

    return candidates.some((candidate) =>
      this.safeCompare(normalizedSignature, candidate),
    );
  }

  private safeCompare(left: string, right: string) {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);

    return (
      leftBuffer.length === rightBuffer.length &&
      timingSafeEqual(leftBuffer, rightBuffer)
    );
  }

  private resolveEventData(payload: Record<string, any>) {
    return (payload.data ?? payload['Body'] ?? payload) as Record<string, any>;
  }

  // private async resolveVendorId(payload: Record<string, any>) {
  //   const data = this.resolveEventData(payload);
  //   const metadata = this.resolveWebhookMetadata(payload, data);
  //   const directVendorId = this.resolveFirstStringFromSources(
  //     [metadata, data],
  //     ['vendor_id', 'vendorId'],
  //   );

  //   if (directVendorId) {
  //     return directVendorId;
  //   }

  //   const customerIdentifier = this.resolveFirstStringFromSources(
  //     [metadata, data],
  //     ['customer_identifier', 'customerIdentifier'],
  //   );

  //   if (customerIdentifier) {
  //     const vendor = await this.prisma.vendor.findUnique({
  //       where: { id: customerIdentifier },
  //       select: { id: true },
  //     });

  //     if (vendor) {
  //       return vendor.id;
  //     }

  //     const virtualAccount = await this.prisma.virtualAccount.findFirst({
  //       where: {
  //         provider: 'squad',
  //         customerIdentifier,
  //       },
  //       select: { vendorId: true },
  //       orderBy: { createdAt: 'desc' },
  //     });

  //     if (virtualAccount) {
  //       return virtualAccount.vendorId;
  //     }
  //   }

  //   const virtualAccountNumber = this.resolveFirstStringFromSources(
  //     [metadata, data],
  //     ['virtual_account_number', 'virtualAccountNumber'],
  //   );

  //   if (virtualAccountNumber) {
  //     const virtualAccount = await this.prisma.virtualAccount.findUnique({
  //       where: {
  //         provider_virtualAccountNumber: {
  //           provider: 'squad',
  //           virtualAccountNumber,
  //         },
  //       },
  //       select: { vendorId: true },
  //     });

  //     return virtualAccount?.vendorId;
  //   }

  //   return undefined;
  // }

  private resolveAmount(
    data: Record<string, any>,
    metadata: Record<string, any> = {},
  ) {
    const amount =
      this.resolveFirstValueFromSources(
        [data, metadata],
        [
          'principal_amount',
          'principalAmount',
          'settled_amount',
          'settledAmount',
          'amount',
          'amount_paid',
          'amountPaid',
          'transfer_amount',
          'transferAmount',
        ],
      ) ?? 0;
    const parsed = Number(amount);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PAYMENTS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Initiate a payment and obtain a checkout URL.
   * POST /transaction/initiate
   */
  async initiatePayment(
    dto: InitiatePaymentDto,
  ): Promise<SquadApiResponse<InitiatePaymentResponseData>> {
    const { data } = await this.http.post<
      SquadApiResponse<InitiatePaymentResponseData>
    >('/transaction/initiate', dto);
    return data;
  }

  /**
   * Verify a transaction by its unique reference.
   * GET /transaction/verify/:transaction_ref
   */
  async verifyTransaction(
    transactionRef: string,
  ): Promise<SquadApiResponse<VerifyTransactionResponseData>> {
    const { data } = await this.http.get<
      SquadApiResponse<VerifyTransactionResponseData>
    >(`/transaction/verify/${transactionRef}`);
    return data;
  }

  /**
   * Charge a previously tokenised card using its token_id.
   * POST /transaction/charge_card
   */
  async chargeCard(
    dto: ChargeCardDto,
  ): Promise<SquadApiResponse<ChargeCardResponseData>> {
    const { data } = await this.http.post<
      SquadApiResponse<ChargeCardResponseData>
    >('/transaction/charge_card', dto);
    return data;
  }

  /**
   * Cancel an active recurring card token.
   * PATCH /transaction/cancel/recurring
   */
  async cancelRecurringCharge(
    dto: CancelRecurringChargeDto,
  ): Promise<SquadApiResponse<{ auth_code: string[] }>> {
    const { data } = await this.http.patch<
      SquadApiResponse<{ auth_code: string[] }>
    >('/transaction/cancel/recurring', dto);
    return data;
  }

  /**
   * Query all transactions with optional filters.
   * GET /transaction
   */
  async queryTransactions(
    query: QueryTransactionsDto,
  ): Promise<SquadApiResponse<TransactionRecord[]>> {
    const { data } = await this.http.get<SquadApiResponse<TransactionRecord[]>>(
      '/transaction',
      { params: query },
    );
    return data;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SANDBOX ONLY
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Simulate a transfer payment into a dynamic virtual account (sandbox only).
   * POST /virtual-account/simulate/payment
   */
  async simulatePayment(
    dto: SimulatePaymentDto,
  ): Promise<SquadApiResponse<string>> {
    if (this.options.isProduction) {
      throw new HttpException(
        'simulatePayment is only available in the sandbox environment.',
        HttpStatus.BAD_REQUEST,
      );
    }
    const { data } = await this.http.post<SquadApiResponse<string>>(
      '/virtual-account/simulate/payment',
      dto,
    );
    return data;
  }

  // async getVendorVirtualAccounts(vendorId: string) {
  //   const vendor = await this.prisma.vendor.findUnique({
  //     where: { id: vendorId },
  //     select: { id: true },
  //   });

  //   if (!vendor) {
  //     throw new BadRequestException('Vendor not found');
  //   }

  //   const virtualAccounts = await this.prisma.virtualAccount.findMany({
  //     where: {
  //       vendorId,
  //       provider: 'squad',
  //     },
  //     orderBy: { createdAt: 'desc' },
  //   });

  //   return {
  //     success: true,
  //     count: virtualAccounts.length,
  //     data: virtualAccounts,
  //   };
  // }

  async virtualAccount(dto): Promise<SquadApiResponse<any>> {
    const { data } = await this.http.post('/virtual-account', dto);
    return data;
  }

  //Virtual Account Generation for users
  // async virtualAccount(dto: VirtualAccountDto): Promise<SquadApiResponse<any>> {
  //   const { vendorId: explicitVendorId, ...squadDto } = dto;
  //   const vendorId = await this.resolveVirtualAccountVendorId(
  //     explicitVendorId,
  //     dto.customer_identifier,
  //   );

  //   if (!vendorId) {
  //     throw new BadRequestException(
  //       'A valid vendorId or vendor customer_identifier is required',
  //     );
  //   }

  //   const { data } = await this.http.post('/virtual-account', squadDto);
  //   const responseData = this.asRecord(data?.data ?? data);
  //   const virtualAccountNumber = this.resolveFirstStringFromSources(
  //     [responseData],
  //     ['virtual_account_number', 'virtualAccountNumber', 'account_number'],
  //   );

  //   if (!virtualAccountNumber) {
  //     throw new BadRequestException(
  //       'Squad response did not include a virtual account number',
  //     );
  //   }

  //   const virtualAccount = await this.prisma.virtualAccount.upsert({
  //     where: {
  //       provider_virtualAccountNumber: {
  //         provider: 'squad',
  //         virtualAccountNumber,
  //       },
  //     },
  //     create: {
  //       vendorId,
  //       provider: 'squad',
  //       customerIdentifier: dto.customer_identifier,
  //       virtualAccountNumber,
  //       currency:
  //         this.resolveFirstStringFromSources([responseData], [
  //           'currency',
  //           'currency_id',
  //           'currencyId',
  //         ]) ?? 'NGN',
  //       active: true,
  //       rawResponse: data as any,
  //     },
  //     update: {
  //       vendorId,
  //       customerIdentifier: dto.customer_identifier,
  //       currency:
  //         this.resolveFirstStringFromSources([responseData], [
  //           'currency',
  //           'currency_id',
  //           'currencyId',
  //         ]) ?? 'NGN',
  //       active: true,
  //       rawResponse: data as any,
  //     },
  //   });

  //   return {
  //     ...data,
  //     virtualAccount,
  //   };
  // }

  // private async resolveVirtualAccountVendorId(
  //   explicitVendorId?: string,
  //   customerIdentifier?: string,
  // ) {
  //   const candidate = explicitVendorId ?? customerIdentifier;

  //   if (!candidate) {
  //     return undefined;
  //   }

  //   const vendor = await this.prisma.vendor.findUnique({
  //     where: { id: candidate },
  //     select: { id: true },
  //   });

  //   return vendor?.id;
  // }

  // ──────────────────────────────────────────────────────────────────────────
  // TRANSFERS / PAYOUTS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Look up an account name before initiating a transfer.
   * POST /payout/account/lookup
   */
  async lookupAccount(
    dto: AccountLookupDto,
  ): Promise<SquadApiResponse<AccountLookupResponseData>> {
    const { data } = await this.http.post<
      SquadApiResponse<AccountLookupResponseData>
    >('/payout/account/lookup', dto);
    return data;
  }

  /**
   * Transfer funds from your Squad wallet to a bank account.
   * POST /payout/transfer
   */
  async fundTransfer(
    dto: FundTransferDto,
  ): Promise<SquadApiResponse<FundTransferResponseData>> {
    const { data } = await this.http.post<
      SquadApiResponse<FundTransferResponseData>
    >('/payout/transfer', dto);
    return data;
  }

  /**
   * Re-query the status of a previously initiated transfer.
   * POST /payout/requery
   */
  async requeryTransfer(
    dto: RequeryTransferDto,
  ): Promise<SquadApiResponse<FundTransferResponseData>> {
    const { data } = await this.http.post<
      SquadApiResponse<FundTransferResponseData>
    >('/payout/requery', dto);
    return data;
  }

  /**
   * Retrieve all transfers made from your Squad wallet.
   * GET /payout/list
   */
  async getAllTransfers(
    query: GetAllTransfersDto,
  ): Promise<SquadApiResponse<TransferRecord[]>> {
    const { data } = await this.http.get<SquadApiResponse<TransferRecord[]>>(
      '/payout/list',
      { params: query },
    );
    return data;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // REFUNDS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Initiate a full or partial refund on a completed transaction.
   * POST /transaction/refund
   */
  async initiateRefund(
    dto: RefundDto,
  ): Promise<SquadApiResponse<RefundResponseData>> {
    const { data } = await this.http.post<SquadApiResponse<RefundResponseData>>(
      '/transaction/refund',
      dto,
    );
    return data;
  }
}
