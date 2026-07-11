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

// ─── Initiate Payment ────────────────────────────────────────────────────────

export class InitiatePaymentDto {
  @IsEmail()
  email: string;

  @IsNumber()
  @Min(1)
  amount: number;

  @IsString()
  @IsIn(['inline'])
  initiate_type: string = 'inline';

  @IsString()
  @IsIn(['NGN', 'USD'])
  currency: string = 'NGN';

  @IsString()
  @IsOptional()
  transaction_ref?: string;

  @IsString()
  @IsOptional()
  customer_name?: string;

  @IsString()
  @IsOptional()
  callback_url?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  payment_channels?: Array<'card' | 'bank' | 'ussd' | 'transfer'>;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @IsBoolean()
  @IsOptional()
  pass_charge?: boolean;

  @IsBoolean()
  @IsOptional()
  is_recurring?: boolean;

  @IsString()
  @IsOptional()
  sub_merchant_id?: string;
}

// ─── Charge Card ─────────────────────────────────────────────────────────────

export class ChargeCardDto {
  @IsNumber()
  @Min(1)
  amount: number;

  @IsString()
  @IsNotEmpty()
  token_id: string;

  @IsString()
  @IsOptional()
  transaction_ref?: string;
}

// ─── Cancel Recurring Charge ─────────────────────────────────────────────────

export class CancelRecurringChargeDto {
  @IsArray()
  @IsString({ each: true })
  auth_code: string[];
}

// ─── Query Transactions ──────────────────────────────────────────────────────

export class QueryTransactionsDto {
  @IsString()
  @IsIn(['NGN', 'USD'])
  currency: string;

  @IsDateString()
  start_date: string;

  @IsDateString()
  end_date: string;

  @IsInt()
  @IsPositive()
  @Type(() => Number)
  page: number = 1;

  @IsInt()
  @IsPositive()
  @Type(() => Number)
  perpage: number = 20;

  @IsString()
  @IsOptional()
  reference?: string;
}

// ─── Simulate Transfer Payment (Sandbox) ────────────────────────────────────

export class SimulatePaymentDto {
  @IsString()
  @IsNotEmpty()
  virtual_account_number: string;

  @IsNotEmpty()
  amount: string;
}

// ─── Account Lookup ──────────────────────────────────────────────────────────

export class AccountLookupDto {
  @IsString()
  @IsNotEmpty()
  bank_code: string;

  @IsString()
  @IsNotEmpty()
  account_number: string;
}

// ─── Fund Transfer ───────────────────────────────────────────────────────────

export class FundTransferDto {
  @IsString()
  @IsNotEmpty()
  transaction_reference: string;

  @IsString()
  @IsNotEmpty()
  amount: string;

  @IsString()
  @IsNotEmpty()
  bank_code: string;

  @IsString()
  @IsNotEmpty()
  account_number: string;

  @IsString()
  @IsNotEmpty()
  account_name: string;

  @IsString()
  @IsIn(['NGN'])
  currency_id: string = 'NGN';

  @IsString()
  @IsNotEmpty()
  remark: string;
}

// ─── Re-query Transfer ───────────────────────────────────────────────────────

export class RequeryTransferDto {
  @IsString()
  @IsNotEmpty()
  transaction_reference: string;
}

// ─── Get All Transfers ───────────────────────────────────────────────────────

export class GetAllTransfersDto {
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  page: number = 1;

  @IsInt()
  @IsPositive()
  @Type(() => Number)
  perPage: number = 20;

  @IsString()
  @IsIn(['ASC', 'DESC'])
  dir: 'ASC' | 'DESC' = 'DESC';
}

// ─── Refund ──────────────────────────────────────────────────────────────────

export class RefundDto {
  @IsString()
  @IsNotEmpty()
  gateway_transaction_ref: string;

  @IsString()
  @IsNotEmpty()
  transaction_ref: string;

  @IsString()
  @IsIn(['Full', 'Partial'])
  refund_type: 'Full' | 'Partial';

  @IsString()
  @IsNotEmpty()
  reason_for_refund: string;

  @IsString()
  @IsOptional()
  refund_amount?: string;
}

//----Virtual Account ---------------------------------------------------------------
export class VirtualAccountDto {
  @IsString()
  @IsOptional()
  customer_identifier: string;

  @IsNotEmpty()
  first_name: string;

  @IsNotEmpty()
  last_name: string;

  @IsString()
  mobile_num: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  bvn: string;
  dob: string;

  @IsNotEmpty()
  address: string;
  gender: string;
  beneficiary_account: string;
}

export class VirtualAccountForCluster {
  @IsNotEmpty()
  @IsString()
  customer_identifier: string;

  @IsNotEmpty()
  @IsString()
  business_name: string;

  @IsNotEmpty()
  @IsString()
  mobile_num: string;

  @IsNotEmpty()
  @IsString()
  bvn: string;

  @IsNotEmpty()
  @IsString()
  beneficiary_account: string;
}
