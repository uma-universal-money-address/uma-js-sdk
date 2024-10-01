import { type BudgetRenewalPeriod } from "src/Nip47Types";

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
  renewalPeriod?: BudgetRenewalPeriod | undefined;
  expiration?: string;
  lastUsed?: string;
}
