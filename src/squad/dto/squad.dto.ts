import {
  IsString,
  IsNumber,
  IsEmail,
  IsBoolean,
  IsOptional,
  IsArray,
  IsIn,
  IsObject,
  Min,
  IsNotEmpty,
  IsDateString,
  IsInt,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ─── Initiate Payment ────────────────────────────────────────────────────────

export class InitiatePaymentDto {
  @ApiProperty({ description: 'Customer email address', example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Amount in kobo (e.g. 50000 = ₦500)', example: 50000 })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ description: 'Initiation type', default: 'inline', example: 'inline' })
  @IsString()
  @IsIn(['inline'])
  initiate_type: string = 'inline';

  @ApiProperty({ description: 'Currency code', default: 'NGN', example: 'NGN' })
  @IsString()
  @IsIn(['NGN', 'USD'])
  currency: string = 'NGN';

  @ApiPropertyOptional({ description: 'Unique transaction reference (auto-generated if omitted)', example: 'TXN_1712345678' })
  @IsString()
  @IsOptional()
  transaction_ref?: string;

  @ApiPropertyOptional({ description: 'Customer name for the transaction', example: 'John Doe' })
  @IsString()
  @IsOptional()
  customer_name?: string;

  @ApiPropertyOptional({ description: 'URL to redirect after payment', example: 'https://groupay.com/dashboard' })
  @IsString()
  @IsOptional()
  callback_url?: string;

  @ApiPropertyOptional({ description: 'Restrict payment to specific channels', example: ['card', 'bank', 'ussd', 'transfer'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  payment_channels?: Array<'card' | 'bank' | 'ussd' | 'transfer'>;

  @ApiPropertyOptional({ description: 'Arbitrary metadata attached to the transaction' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Pass transaction charge to customer', example: true })
  @IsBoolean()
  @IsOptional()
  pass_charge?: boolean;

  @ApiPropertyOptional({ description: 'Whether this is a recurring payment', example: false })
  @IsBoolean()
  @IsOptional()
  is_recurring?: boolean;

  @ApiPropertyOptional({ description: 'Sub-merchant ID for marketplace payments' })
  @IsString()
  @IsOptional()
  sub_merchant_id?: string;

  @ApiPropertyOptional({ description: 'User ID making the payment (required if PIN is set)' })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({ description: '4-digit PIN for verification (required if PIN is set)' })
  @IsString()
  @IsOptional()
  pin?: string;
}

// ─── Charge Card ─────────────────────────────────────────────────────────────

export class ChargeCardDto {
  @ApiProperty({ description: 'Amount in kobo', example: 10000 })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ description: 'Token ID from a previously saved card', example: 'tok_abc123' })
  @IsString()
  @IsNotEmpty()
  token_id: string;

  @ApiPropertyOptional({ description: 'Unique transaction reference', example: 'TXN_1712345679' })
  @IsString()
  @IsOptional()
  transaction_ref?: string;
}

// ─── Cancel Recurring Charge ─────────────────────────────────────────────────

export class CancelRecurringChargeDto {
  @ApiProperty({ description: 'Array of authorization codes to cancel', example: ['auth_code_1', 'auth_code_2'] })
  @IsArray()
  @IsString({ each: true })
  auth_code: string[];
}

// ─── Query Transactions ──────────────────────────────────────────────────────

export class QueryTransactionsDto {
  @ApiProperty({ description: 'Currency code', example: 'NGN' })
  @IsString()
  @IsIn(['NGN', 'USD'])
  currency: string;

  @ApiProperty({ description: 'Start date (ISO 8601)', example: '2026-01-01' })
  @IsDateString()
  start_date: string;

  @ApiProperty({ description: 'End date (ISO 8601)', example: '2026-12-31' })
  @IsDateString()
  end_date: string;

  @ApiProperty({ description: 'Page number for pagination', default: 1, example: 1 })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  page: number = 1;

  @ApiProperty({ description: 'Results per page', default: 20, example: 20 })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  perpage: number = 20;

  @ApiPropertyOptional({ description: 'Filter by transaction reference' })
  @IsString()
  @IsOptional()
  reference?: string;
}

// ─── Simulate Transfer Payment (Sandbox) ────────────────────────────────────

export class SimulatePaymentDto {
  @ApiProperty({ description: 'Virtual account number to simulate payment into', example: '9876543210' })
  @IsString()
  @IsNotEmpty()
  virtual_account_number: string;

  @ApiProperty({ description: 'Amount to simulate (as string)', example: '5000' })
  @IsNotEmpty()
  amount: string;
}

// ─── Account Lookup ──────────────────────────────────────────────────────────

export class AccountLookupDto {
  @ApiProperty({ description: 'Bank code', example: '058' })
  @IsString()
  @IsNotEmpty()
  bank_code: string;

  @ApiProperty({ description: 'Account number to look up', example: '0123456789' })
  @IsString()
  @IsNotEmpty()
  account_number: string;
}

// ─── Fund Transfer ───────────────────────────────────────────────────────────

export class FundTransferDto {
  @ApiProperty({ description: 'Unique transaction reference for this transfer', example: 'TFR_1712345680' })
  @IsString()
  @IsNotEmpty()
  transaction_reference: string;

  @ApiProperty({ description: 'Amount as string', example: '100000' })
  @IsString()
  @IsNotEmpty()
  amount: string;

  @ApiProperty({ description: 'Bank code of the recipient bank', example: '058' })
  @IsString()
  @IsNotEmpty()
  bank_code: string;

  @ApiProperty({ description: 'Recipient account number', example: '0123456789' })
  @IsString()
  @IsNotEmpty()
  account_number: string;

  @ApiProperty({ description: 'Recipient account name', example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  account_name: string;

  @ApiProperty({ description: 'Currency', default: 'NGN', example: 'NGN' })
  @IsString()
  @IsIn(['NGN'])
  currency_id: string = 'NGN';

  @ApiProperty({ description: 'Transfer remark/narration', example: 'Payout for savings plan' })
  @IsString()
  @IsNotEmpty()
  remark: string;
}

// ─── Re-query Transfer ───────────────────────────────────────────────────────

export class RequeryTransferDto {
  @ApiProperty({ description: 'Transaction reference to re-query', example: 'TFR_1712345680' })
  @IsString()
  @IsNotEmpty()
  transaction_reference: string;
}

// ─── Get All Transfers ───────────────────────────────────────────────────────

export class GetAllTransfersDto {
  @ApiProperty({ description: 'Page number', default: 1, example: 1 })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  page: number = 1;

  @ApiProperty({ description: 'Results per page', default: 20, example: 20 })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  perPage: number = 20;

  @ApiProperty({ description: 'Sort direction', default: 'DESC', example: 'DESC' })
  @IsString()
  @IsIn(['ASC', 'DESC'])
  dir: 'ASC' | 'DESC' = 'DESC';
}

// ─── Refund ──────────────────────────────────────────────────────────────────

export class RefundDto {
  @ApiProperty({ description: 'Gateway transaction reference from Squad', example: 'SQD_987654' })
  @IsString()
  @IsNotEmpty()
  gateway_transaction_ref: string;

  @ApiProperty({ description: 'Your internal transaction reference', example: 'TXN_1712345678' })
  @IsString()
  @IsNotEmpty()
  transaction_ref: string;

  @ApiProperty({ description: 'Refund type', example: 'Partial' })
  @IsString()
  @IsIn(['Full', 'Partial'])
  refund_type: 'Full' | 'Partial';

  @ApiProperty({ description: 'Reason for the refund', example: 'Customer requested cancellation' })
  @IsString()
  @IsNotEmpty()
  reason_for_refund: string;

  @ApiPropertyOptional({ description: 'Refund amount (required for Partial refunds)', example: '25000' })
  @IsString()
  @IsOptional()
  refund_amount?: string;
}

// ─── Virtual Account (User) ──────────────────────────────────────────────────

export class VirtualAccountDto {
  @ApiPropertyOptional({ description: 'Customer identifier', example: 'user_abc123' })
  @IsString()
  @IsOptional()
  customer_identifier: string;

  @ApiProperty({ description: 'First name of the account holder', example: 'John' })
  @IsNotEmpty()
  first_name: string;

  @ApiProperty({ description: 'Last name of the account holder', example: 'Doe' })
  @IsNotEmpty()
  last_name: string;

  @ApiProperty({ description: 'Mobile number', example: '08031234567' })
  @IsString()
  mobile_num: string;

  @ApiProperty({ description: 'Email address', example: 'john@example.com' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'BVN (Bank Verification Number)', example: '12345678901' })
  @IsNotEmpty()
  bvn: string;

  @ApiProperty({ description: 'Date of birth (YYYY-MM-DD)', example: '1995-06-15' })
  dob: string;

  @ApiProperty({ description: 'Residential address', example: '14B Adeola Odeku Street, VI, Lagos' })
  @IsNotEmpty()
  address: string;

  @ApiPropertyOptional({ description: 'Gender', example: 'male' })
  gender: string;

  @ApiPropertyOptional({ description: 'Beneficiary account for settlements' })
  beneficiary_account: string;
}

// ─── Virtual Account (Cluster) ───────────────────────────────────────────────

export class VirtualAccountForCluster {
  @ApiProperty({ description: 'Customer/business identifier', example: 'SQUAD_101' })
  @IsNotEmpty()
  @IsString()
  customer_identifier: string;

  @ApiProperty({ description: 'Business or cluster name', example: 'Monthly Savings Group' })
  @IsNotEmpty()
  @IsString()
  business_name: string;

  @ApiProperty({ description: 'Mobile number of the requester', example: '08031234567' })
  @IsNotEmpty()
  @IsString()
  mobile_num: string;

  @ApiProperty({ description: 'BVN of the requester', example: '12345678901' })
  @IsNotEmpty()
  @IsString()
  bvn: string;

  @ApiProperty({ description: 'Beneficiary account for settlements', example: '0123456789' })
  @IsNotEmpty()
  @IsString()
  beneficiary_account: string;
}
