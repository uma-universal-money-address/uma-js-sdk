export type Method =
  | "get_info"
  | "get_balance"
  | "make_invoice"
  | "pay_invoice"
  | "pay_keysend"
  | "lookup_invoice"
  | "list_transactions"
  | "lookup_user"
  | "fetch_quote"
  | "execute_quote"
  | "pay_to_address";

export type GetInfoResponse = {
  alias: string;
  color: string;
  pubkey: string;
  network: string;
  block_height: number;
  block_hash: string;
  methods: Method[];
  lud16?: string;
  currencies?: Currency[];
};

export type GetBalanceRequest = {
  currency_code?: string;
};

export type GetBalanceResponse = {
  balance: number; // msats or currency if specified.
  currency_code?: string;
};

export type PayResponse = {
  preimage: string;
};

export interface ListTransactionsRequest {
  from?: number;
  until?: number;
  limit?: number;
  offset?: number;
  unpaid?: boolean;
  type?: "incoming" | "outgoing";
}

export type ListTransactionsResponse = {
  transactions: Transaction[];
};

export type TransactionFx = {
  receiving_currency_code: string;
  total_receiving_amount: number;
  multiplier: number;
  // Remaining fields only available for outgoing payments:
  sending_currency_code?: string;
  total_sending_amount?: number;
  fees?: number;
};

export type Transaction = {
  type: string;
  invoice: string;
  description: string;
  description_hash: string;
  preimage: string;
  payment_hash: string;
  amount: number;
  fees_paid: number;
  settled_at: number;
  created_at: number;
  expires_at: number;
  fx?: TransactionFx;
  metadata?: Record<string, unknown>;
};

export type Currency = {
  code: string;
  name: string;
  symbol: string;
  multiplier: number;
  min: number;
  max: number;
  decimals: number;
};

export type PayInvoiceRequest = {
  invoice: string;
  amount?: number; // msats
};

export type PayKeysendRequest = {
  amount: number; //msat
  pubkey: string;
  preimage?: string;
  tlv_records?: { type: number; value: string }[];
};

export type MakeInvoiceRequest = {
  amount: number; //msat
  description?: string;
  description_hash?: string;
  expiry?: number; // in seconds
};

export type LookupInvoiceRequest = {
  payment_hash: string;
};

// Note: when we have multiple receiver types like bolt12 etc, these will be optional and it is
// expected that exactly one of the fields is set.
export type Receiver = {
  lud16: string;
};

export type LookupUserRequest = {
  receiver: Receiver;
  base_sending_currency_code?: string;
};

export type LookupUserResponse = {
  receiver: Receiver;
  currencies: Currency[];
};

export type FetchQuoteRequest = {
  receiver: Receiver;
  sending_currency_code: string;
  receiving_currency_code: string;
  locked_currency_side: "SENDING" | "RECEIVING";
  locked_currency_amount: number;
};

export type Quote = {
  payment_hash: string;
  sending_currency_code: string;
  receiving_currency_code: string;
  total_receiving_amount: number;
  total_sending_amount: number;
  multiplier: number; // receiving unit per sending unit
  fees: number; // in sending currency
  expires_at: number;
};

export type ExecuteQuoteRequest = {
  payment_hash: string;
};

export type ExecuteQuoteResponse = {
  preimage: string;
};

export type PayToAddressRequest = {
  receiver: Receiver;
  sending_currency_code: string;
  sending_currency_amount: number;
  receiving_currency_code?: string;
};

export type PayToAddressResponse = {
  preimage: string;
  quote: Quote;
};

export class Nip47Error extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

/**
 * A NIP-47 response was received, but with an error code (see https://github.com/nostr-protocol/nips/blob/master/47.md#error-codes)
 */
export class Nip47WalletError extends Nip47Error {}

export class Nip47TimeoutError extends Nip47Error {}
export class Nip47PublishTimeoutError extends Nip47TimeoutError {}
export class Nip47ReplyTimeoutError extends Nip47TimeoutError {}
export class Nip47PublishError extends Nip47Error {}
export class Nip47ResponseDecodingError extends Nip47Error {}
export class Nip47ResponseValidationError extends Nip47Error {}
export class Nip47UnexpectedResponseError extends Nip47Error {}
