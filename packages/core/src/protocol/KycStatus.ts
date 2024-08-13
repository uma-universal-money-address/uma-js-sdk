export enum KycStatus {
  Unknown = "UNKNOWN",
  NotVerified = "NOT_VERIFIED",
  Pending = "PENDING",
  Verified = "VERIFIED",
}

export function kycStatustoBytes(k: KycStatus): Uint8Array {
  return new TextEncoder().encode(kycStatusToString(k));
}

export function kycStatusFromBytes(bytes: Uint8Array): KycStatus {
  return kycStatusFromString(new TextDecoder().decode(bytes));
}

export function kycStatusFromString(s: string): KycStatus {
  switch (s) {
    default:
      return KycStatus.Unknown;
    case "UNKNOWN":
      return KycStatus.Unknown;
    case "NOT_VERIFIED":
      return KycStatus.NotVerified;
    case "PENDING":
      return KycStatus.Pending;
    case "VERIFIED":
      return KycStatus.Verified;
  }
}

export function kycStatusToString(k: KycStatus): string {
  switch (k) {
    default:
      return "undefined";
    case KycStatus.Unknown:
      return KycStatus.Unknown;
    case KycStatus.NotVerified:
      return KycStatus.NotVerified;
    case KycStatus.Pending:
      return KycStatus.Pending;
    case KycStatus.Verified:
      return KycStatus.Verified;
  }
}
