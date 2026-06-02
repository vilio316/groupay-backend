export interface SquadApiResponse<T = any> {
  status: number;
  success: boolean;
  message: string;
  data: T;
}

// ─── Initiate Payment ───────────────────────────────────────────────────────

export interface InitiatePaymentResponseData {
  auth_url: string | null;
  access_token: string | null;
  merchant_info: {
    merchant_response: string | null;
    merchant_name: string | null;
    merchant_logo: string | null;
    merchant_id: string;
  };
  currency: string;
  recurring: {
    frequency: number | null;
    duration: number | null;
    type: number;
    plan_code: string | null;
    customer_name: string | null;
  };
  is_recurring: boolean;
  plan_code: string | null;
  callback_url: string;
  transaction_ref: string;
  transaction_memo: string | null;
  transaction_amount: number;
  authorized_channels: string[];
  checkout_url: string;
}

// ─── Verify Transaction ──────────────────────────────────────────────────────

export interface VerifyTransactionResponseData {
  transaction_amount: number;
  transaction_ref: string;
  email: string;
  transaction_status: 'Success' | 'Failed' | 'Abandoned' | 'Pending';
  transaction_currency_id: string;
  created_at: string;
  transaction_type: string;
  merchant_name: string;
  merchant_business_name: string | null;
  gateway_transaction_ref: string;
  recurring: any | null;
  merchant_email: string;
  plan_code: string | null;
}

// ─── Charge Card ─────────────────────────────────────────────────────────────

export interface ChargeCardResponseData {
  transaction_amount: number;
  transaction_ref: string | null;
  email: string | null;
  transaction_status: string | null;
  transaction_currency_id: string | null;
  created_at: string;
  transaction_type: string | null;
  merchant_name: string | null;
  merchant_business_name: string | null;
  gateway_transaction_ref: string | null;
  recurring: any | null;
  merchant_email: string | null;
  plan_code: string | null;
}

// ─── Transfer ────────────────────────────────────────────────────────────────

export interface AccountLookupResponseData {
  account_name: string;
  account_number: string;
}

export interface FundTransferResponseData {
  transaction_reference: string;
  response_description: string;
  currency_id: string;
  amount: string;
  nip_transaction_reference: string;
  account_number: string;
  account_name: string;
  destination_institution_name: string;
}

export interface TransferRecord {
  account_number_credited: string;
  amount_debited: string;
  total_amount_debited: string;
  success: boolean;
  recipient: string;
  bank_code: string;
  transaction_reference: string;
  transaction_status: string;
  switch_transaction: any | null;
}

// ─── Refund ──────────────────────────────────────────────────────────────────

export interface RefundResponseData {
  gateway_refund_status: string;
  refund_status: number;
  refund_reference: string;
}

// ─── Simulate Payment ────────────────────────────────────────────────────────

export interface SimulatePaymentResponseData {
  message: string;
}

// ─── Query Transactions ──────────────────────────────────────────────────────

export interface TransactionRecord {
  id: number;
  transaction_amount: number;
  transaction_ref: string;
  email: string;
  merchant_id: string;
  merchant_amount: number;
  merchant_name: string;
  merchant_business_name: string;
  merchant_email: string;
  customer_email: string;
  customer_name: string;
  transaction_status: string;
  transaction_charges: number;
  transaction_currency_id: string;
  transaction_gateway_id: string;
  transaction_type: string;
  is_suspicious: boolean;
  is_refund: boolean;
  created_at: string;
}
