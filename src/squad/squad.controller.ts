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
  VirtualAccountForCluster,
} from './dto/squad.dto';
import {
  AllowAnonymous,
  OptionalAuth,
} from '@thallesp/nestjs-better-auth';
import { ApiTags, ApiOperation, ApiBody, ApiResponse, ApiParam, ApiQuery, ApiExcludeEndpoint } from '@nestjs/swagger';

@ApiTags('Squad (Payment Gateway)')
@Controller('squad')
export class SquadController {
  constructor(private readonly squadService: SquadService) {}

  // ──────────────────────────────────────────────────────────────────────────
  // WEBHOOK
  // ──────────────────────────────────────────────────────────────────────────

  @AllowAnonymous()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
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

  @Post('transaction/initiate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Initiate a payment', description: 'Initiates a payment via Squad and returns a checkout URL for the customer to complete payment.' })
  @ApiBody({ type: InitiatePaymentDto, description: 'Payment initiation payload' })
  @ApiResponse({ status: 200, description: 'Payment initiated', schema: { example: { status: 'success', data: { checkout_url: 'https://checkout.squadco.com/...', transaction_ref: 'TXN_1712345678' } } } })
  initiatePayment(@Body() dto: InitiatePaymentDto) {
    return this.squadService.initiatePayment(dto);
  }

  @Get('transaction/verify/:transactionRef')
  @ApiOperation({ summary: 'Verify a transaction', description: 'Verifies the status of a transaction using its unique reference.' })
  @ApiParam({ name: 'transactionRef', description: 'The transaction reference to verify', example: 'TXN_1712345678' })
  @ApiResponse({ status: 200, description: 'Transaction verification result', schema: { example: { status: 'success', data: { amount: 50000, status: 'success', transaction_ref: 'TXN_1712345678' } } } })
  verifyTransaction(@Param('transactionRef') transactionRef: string) {
    return this.squadService.verifyTransaction(transactionRef);
  }

  @Post('transaction/charge-card')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Charge a saved card', description: 'Charges a previously tokenised card for a specified amount.' })
  @ApiBody({ type: ChargeCardDto, description: 'Card charge payload' })
  @ApiResponse({ status: 200, description: 'Card charged', schema: { example: { status: 'success', data: { amount: 10000, status: 'success', transaction_ref: 'TXN_1712345679' } } } })
  chargeCard(@Body() dto: ChargeCardDto) {
    return this.squadService.chargeCard(dto);
  }

  @Patch('transaction/cancel/recurring')
  @ApiOperation({ summary: 'Cancel recurring charge', description: 'Cancels an active recurring card charge using its authorization code.' })
  @ApiBody({ type: CancelRecurringChargeDto, description: 'Authorization codes to cancel' })
  @ApiResponse({ status: 200, description: 'Recurring charge cancelled' })
  cancelRecurringCharge(@Body() dto: CancelRecurringChargeDto) {
    return this.squadService.cancelRecurringCharge(dto);
  }

  @Get('transaction')
  @ApiOperation({ summary: 'Query transactions', description: 'Queries all transactions with optional date range, currency, and pagination filters.' })
  @ApiQuery({ name: 'currency', description: 'Currency code', example: 'NGN' })
  @ApiQuery({ name: 'start_date', description: 'Start date (ISO 8601)', example: '2026-01-01' })
  @ApiQuery({ name: 'end_date', description: 'End date (ISO 8601)', example: '2026-12-31' })
  @ApiQuery({ name: 'page', description: 'Page number', example: 1 })
  @ApiQuery({ name: 'perpage', description: 'Results per page', example: 20 })
  @ApiQuery({ name: 'reference', description: 'Optional transaction reference filter', required: false, example: 'TXN_1712345678' })
  @ApiResponse({ status: 200, description: 'Transactions queried successfully' })
  queryTransactions(@Query() query: QueryTransactionsDto) {
    return this.squadService.queryTransactions(query);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VIRTUAL ACCOUNTS
  // ──────────────────────────────────────────────────────────────────────────

  @Post('/virtual/:id')
  @ApiOperation({ summary: 'Create virtual account (user)', description: 'Creates a Squad virtual account number for a user to receive payments.' })
  @ApiParam({ name: 'id', description: 'The user ID', example: 'user_abc123' })
  @ApiBody({ type: VirtualAccountDto, description: 'Virtual account creation payload' })
  @ApiResponse({ status: 201, description: 'Virtual account created', schema: { example: { accountNumber: '1234567890', accountName: 'John Doe', bankName: 'Providus Bank' } } })
  postVirtualAccount(@Body() dto: VirtualAccountDto, @Param('id') id: string) {
    return this.squadService.virtualAccount(dto, id);
  }

  @Post('/virtual/cluster/:id')
  @ApiOperation({ summary: 'Create virtual account (cluster)', description: 'Creates a Squad virtual account number for a cluster to receive payments from members.' })
  @ApiParam({ name: 'id', description: 'The cluster ID', example: 'clust_abc123' })
  @ApiBody({ type: VirtualAccountForCluster, description: 'Cluster virtual account creation payload' })
  @ApiResponse({ status: 201, description: 'Cluster virtual account created', schema: { example: { accountNumber: '0987654321', accountName: 'Monthly Savings Group', bankName: 'Providus Bank' } } })
  createVirtualAccountForCluster(
    @Body() dto: VirtualAccountForCluster,
    @Param('id') id: string,
  ) {
    return this.squadService.virtualAccountForClusters(dto, id);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SANDBOX HELPERS
  // ──────────────────────────────────────────────────────────────────────────

  @Post('simulate/payment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Simulate payment (sandbox)', description: 'Simulates a payment into a dynamic virtual account. Only available in sandbox mode.' })
  @ApiBody({ type: SimulatePaymentDto, description: 'Simulation payload' })
  @ApiResponse({ status: 200, description: 'Payment simulated' })
  simulatePayment(@Body() dto: SimulatePaymentDto) {
    return this.squadService.simulatePayment(dto);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TRANSFERS / PAYOUTS
  // ──────────────────────────────────────────────────────────────────────────

  @Post('payout/lookup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lookup account name', description: 'Looks up an account name before initiating a transfer (name enquiry).' })
  @ApiBody({ type: AccountLookupDto, description: 'Bank code and account number to look up' })
  @ApiResponse({ status: 200, description: 'Account name returned', schema: { example: { status: 'success', data: { account_name: 'John Doe', account_number: '0123456789' } } } })
  lookupAccount(@Body() dto: AccountLookupDto) {
    return this.squadService.lookupAccount(dto);
  }

  @Post('payout/transfer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fund transfer (payout)', description: 'Transfers funds from your Squad wallet to a bank account.' })
  @ApiBody({ type: FundTransferDto, description: 'Transfer payload' })
  @ApiResponse({ status: 200, description: 'Transfer initiated', schema: { example: { status: 'success', data: { transaction_reference: 'TFR_1712345680', status: 'pending' } } } })
  fundTransfer(@Body() dto: FundTransferDto) {
    return this.squadService.fundTransfer(dto);
  }

  @Post('payout/requery')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Re-query transfer status', description: 'Re-queries the status of a previously initiated transfer.' })
  @ApiBody({ type: RequeryTransferDto, description: 'Transaction reference to re-query' })
  @ApiResponse({ status: 200, description: 'Transfer status returned' })
  requeryTransfer(@Body() dto: RequeryTransferDto) {
    return this.squadService.requeryTransfer(dto);
  }

  @Get('payout/list')
  @ApiOperation({ summary: 'List all transfers', description: 'Retrieves all transfers from your Squad wallet with pagination.' })
  @ApiQuery({ name: 'page', description: 'Page number', example: 1 })
  @ApiQuery({ name: 'perPage', description: 'Results per page', example: 20 })
  @ApiQuery({ name: 'dir', description: 'Sort direction', example: 'DESC' })
  @ApiResponse({ status: 200, description: 'Transfers list returned' })
  getAllTransfers(@Query() query: GetAllTransfersDto) {
    return this.squadService.getAllTransfers(query);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // REFUNDS
  // ──────────────────────────────────────────────────────────────────────────

  @Post('transaction/refund')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Initiate a refund', description: 'Initiates a full or partial refund on a completed transaction.' })
  @ApiBody({ type: RefundDto, description: 'Refund payload' })
  @ApiResponse({ status: 200, description: 'Refund initiated', schema: { example: { status: 'success', data: { refund_status: 'pending', gateway_transaction_ref: 'SQD_987654' } } } })
  initiateRefund(@Body() dto: RefundDto) {
    return this.squadService.initiateRefund(dto);
  }
}
