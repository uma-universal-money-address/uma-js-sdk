export interface Currency {
  code: string;
  name: string;
  symbol: string;
  decimals: number;
}

export enum PermissionType {
  SEND_PAYMENTS = "send_payments",
  READ_BALANCE = "read_balance",
  READ_TRANSACTIONS = "read_transactions",
}

export interface Permission {
  type: PermissionType;
  description: string;
}

export enum LimitFrequency {
  DAILY = "daily",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
  YEARLY = "yearly",
  NONE = "none",
}

export enum ConnectionStatus {
  ACTIVE = "Active",
  PENDING = "Pending",
  INACTIVE = "Inactive",
}

export interface Connection {
  name?: string;
  amountInLowestDenom: number;
  amountInLowestDenomUsed: number;
  limitEnabled: boolean;
  currency: Currency;
  limitFrequency?: LimitFrequency;
  expiration?: string;
  lastUsed?: string;
}
