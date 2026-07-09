import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import { SquadService } from './squad.service';
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
  AllowAnonymous,
  OptionalAuth,
  Roles,
} from '@thallesp/nestjs-better-auth';

@Controller('squad')
export class SquadController {
  constructor(private readonly squadService: SquadService) {}

  @AllowAnonymous()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  handleWebhook(
    @Body() payload: Record<string, unknown>,
    @Headers('x-squad-signature') squadSignature?: string,
    @Headers('x-squad-encrypted-body') encryptedBody?: string,
  ) {
    return this.squadService.handleWebhook(
      payload,
      squadSignature ?? encryptedBody,
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PAYMENTS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * POST /squad/transaction/initiate
   * Initiates a payment and returns a checkout URL   */
  @Post('transaction/initiate')
  @HttpCode(HttpStatus.OK)
  initiatePayment(@Body() dto: InitiatePaymentDto) {
    return this.squadService.initiatePayment(dto);
  }

  /**
   * GET /squad/transaction/verify/:transactionRef
   * Verifies a transaction by its unique reference.
   */
  @Get('transaction/verify/:transactionRef')
  verifyTransaction(@Param('transactionRef') transactionRef: string) {
    return this.squadService.verifyTransaction(transactionRef);
  }

  /**
   * POST /squad/transaction/charge-card
   * Charges a previously tokenised card.
   */
  @Post('transaction/charge-card')
  @HttpCode(HttpStatus.OK)
  chargeCard(@Body() dto: ChargeCardDto) {
    return this.squadService.chargeCard(dto);
  }

  /**
   * PATCH /squad/transaction/cancel/recurring
   * Cancels an active recurring card token.
   */
  @Patch('transaction/cancel/recurring')
  cancelRecurringCharge(@Body() dto: CancelRecurringChargeDto) {
    return this.squadService.cancelRecurringCharge(dto);
  }

  /**
   * GET /squad/transaction
   * Queries all transactions with optional filters.
   * Required query params: currency, start_date, end_date, page, perpage
   */
  @Get('transaction')
  queryTransactions(@Query() query: QueryTransactionsDto) {
    return this.squadService.queryTransactions(query);
  }

  @Post('/virtual/:id')
  postVirtualAccount(@Body() dto: VirtualAccountDto, @Param('id') id: string) {
    return this.squadService.virtualAccount(dto, id);
  }

  // @Roles(['admin', 'reviewer'])
  // @Get('vendors/:vendorId/virtual-accounts')
  // getVendorVirtualAccounts(@Param('vendorId') vendorId: string) {
  //   return this.squadService.getVendorVirtualAccounts(vendorId);
  // }
  // ──────────────────────────────────────────────────────────────────────────
  // SANDBOX HELPERS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * POST /squad/simulate/payment
   * Simulates a payment into a dynamic virtual account (sandbox only).
   */
  @Post('simulate/payment')
  @HttpCode(HttpStatus.OK)
  simulatePayment(@Body() dto: SimulatePaymentDto) {
    return this.squadService.simulatePayment(dto);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TRANSFERS / PAYOUTS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * POST /squad/payout/lookup
   * Looks up an account name before initiating a transfer.
   */
  @Post('payout/lookup')
  @HttpCode(HttpStatus.OK)
  lookupAccount(@Body() dto: AccountLookupDto) {
    return this.squadService.lookupAccount(dto);
  }

  /**
   * POST /squad/payout/transfer
   * Transfers funds from your Squad wallet to a bank account.
   */
  @Post('payout/transfer')
  @HttpCode(HttpStatus.OK)
  fundTransfer(@Body() dto: FundTransferDto) {
    return this.squadService.fundTransfer(dto);
  }

  /**
   * POST /squad/payout/requery
   * Re-queries the status of a transfer.
   */
  @Post('payout/requery')
  @HttpCode(HttpStatus.OK)
  requeryTransfer(@Body() dto: RequeryTransferDto) {
    return this.squadService.requeryTransfer(dto);
  }

  /**
   * GET /squad/payout/list
   * Retrieves all transfers from your Squad wallet.
   */
  @Get('payout/list')
  getAllTransfers(@Query() query: GetAllTransfersDto) {
    return this.squadService.getAllTransfers(query);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // REFUNDS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * POST /squad/transaction/refund
   * Initiates a full or partial refund on a completed transaction.
   */
  @Post('transaction/refund')
  @HttpCode(HttpStatus.OK)
  initiateRefund(@Body() dto: RefundDto) {
    return this.squadService.initiateRefund(dto);
  }
}
