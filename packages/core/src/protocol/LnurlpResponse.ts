import { z } from "zod";
import { optionalIgnoringNull } from "../zodUtils.js";
import {
  CounterPartyDataOptionsSchema,
  type CounterPartyDataOptions,
} from "./CounterPartyData.js";
import { CurrencySchema, type Currency } from "./Currency.js";
import { KycStatus } from "./KycStatus.js";

/** LnurlComplianceResponse is the `compliance` field  of the LnurlpResponse. */
export const LnurlpComplianceResponseSchema = z.object({
  /** KycStatus indicates whether VASP2 has KYC information about the receiver. */
  kycStatus: z.nativeEnum(KycStatus),
  /** Signature is the base64-encoded signature of sha256(ReceiverAddress|Nonce|Timestamp). */
  signature: z.string(),
  /** Nonce is a random string that is used to prevent replay attacks. */
  signatureNonce: z.string(),
  /** Timestamp is the unix timestamp of when the request was sent. Used in the signature. */
  signatureTimestamp: z.number(),
  /** IsSubjectToTravelRule indicates whether VASP2 is a financial institution that requires travel rule information. */
  isSubjectToTravelRule: z.boolean(),
  /** ReceiverIdentifier is the identifier of the receiver at VASP2. */
  receiverIdentifier: z.string(),
});

export type LnurlComplianceResponse = z.infer<
  typeof LnurlpComplianceResponseSchema
>;

/** The response to the LnurlpRequest. It is sent by the VASP that is receiving the payment to provide information to the sender about the receiver. */
export const LnurlpResponseSchema = z.object({
  tag: z.string(),
  callback: z.string(),
  minSendable: z.number(),
  maxSendable: z.number(),
  metadata: z.string(),
  currencies: optionalIgnoringNull(z.array(CurrencySchema)),
  payerData: optionalIgnoringNull(CounterPartyDataOptionsSchema),
  compliance: optionalIgnoringNull(LnurlpComplianceResponseSchema),
  /**
   * The version of the UMA protocol that VASP2 has chosen for this transaction based on its own support and VASP1's specified preference in the LnurlpRequest.
   * For the version negotiation flow, see https://static.swimlanes.io/87f5d188e080cb8e0494e46f80f2ae74.png
   */
  umaVersion: optionalIgnoringNull(z.string()),

  /**
   * The number of characters that the sender can include in the comment field of the pay request.
   */
  commentAllowed: optionalIgnoringNull(z.number()),

  /**
   * An optional nostr pubkey used for nostr zaps (NIP-57). If set, it should be a valid
   * BIP-340 public key in hex format.
   */
  nostrPubkey: optionalIgnoringNull(z.string()),

  /**
   * Should be set to true if the receiving VASP allows nostr zaps (NIP-57).
   */
  allowsNostr: optionalIgnoringNull(z.boolean()),
});

export type LnurlpResponse = z.infer<typeof LnurlpResponseSchema>;

export function isLnurlResponseForUma(
  response: LnurlpResponse,
): response is LnurlpResponse & {
  compliance: LnurlComplianceResponse;
  umaVersion: string;
  currencies: Currency[];
  payerData: CounterPartyDataOptions;
} {
  return (
    !!response.compliance &&
    !!response.umaVersion &&
    !!response.currencies &&
    !!response.payerData
  );
}

export function parseLnurlpResponse(jsonStr: string): LnurlpResponse {
  const parsed = JSON.parse(jsonStr);
  let validated: LnurlpResponse;
  try {
    validated = LnurlpResponseSchema.parse(parsed);
  } catch (e) {
    throw new Error("invalid lnurlp response", { cause: e });
  }
  return validated;
}

export function getSignableLnurlpResponsePayload(r: LnurlpResponse): string {
  if (!r.compliance) {
    throw new Error("compliance is required, but not present in response");
  }
  return [
    r.compliance.receiverIdentifier,
    r.compliance.signatureNonce,
    r.compliance.signatureTimestamp.toString(),
  ].join("|");
}
