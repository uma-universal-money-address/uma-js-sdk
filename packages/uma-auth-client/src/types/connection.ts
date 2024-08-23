export interface Currency {
  code: string;
  name: string;
  symbol: string;
  decimals: number;
  type: string;
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
  NONE = "none",
}

export enum ConnectionStatus {
  ACTIVE = "Active",
  PENDING = "Pending",
  INACTIVE = "Inactive",
}

export interface Connection {
  connectionId: string;
  clientId: string;
  name: string;
  createdAt: string;
  permissions: Permission[];
  amountInLowestDenom: number;
  amountInLowestDenomUsed: number;
  limitEnabled: boolean;
  currency: Currency;
  status: ConnectionStatus;
  limitFrequency?: LimitFrequency;
  expiration?: string;
  lastUsed?: string;
}
