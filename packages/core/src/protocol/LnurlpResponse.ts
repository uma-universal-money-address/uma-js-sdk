import { z } from "zod";
import { optionalIgnoringNull } from "../zodUtils.js";
import {
  CounterPartyDataOptionsSchema,
  type CounterPartyDataOptions,
} from "./CounterPartyData.js";
import { CurrencySchema, Currency } from "./Currency.js";
import { KycStatus } from "./KycStatus.js";

/** The response to the LnurlpRequest. It is sent by the VASP that is receiving the payment to provide information to the sender about the receiver. */
export class LnurlpResponse {
  public tag: string = "payRequest";

  constructor(
    /** The URL that the sender will call for the payreq request. */
    public callback: string,
    /** The minimum amount that the sender can send in millisatoshis. */
    public minSendable: number,
    /** The maximum amount that the sender can send in millisatoshis. */
    public maxSendable: number,
    /** JSON-encoded metadata that the sender can use to display information to the user. */
    public metadata: string,
    /** Compliance-related data from the receiving VASP. */
    public compliance?: LnurlComplianceResponse,
    /**
     * The version of the UMA protocol that VASP2 has chosen for this transaction based on its own support and VASP1's specified preference in the LnurlpRequest.
     * For the version negotiation flow, see https://static.swimlanes.io/87f5d188e080cb8e0494e46f80f2ae74.png
     */
    public umaVersion?: string,
    /** The list of currencies that the receiver accepts in order of preference. */
    public currencies?: Currency[],
    /** The data about the payer that the sending VASP must provide in order to send a payment. */
    public payerData?: CounterPartyDataOptions,
    /**
     * The number of characters that the sender can include in the comment field of the pay request.
     */
    public commentAllowed?: number,
    /**
     * An optional nostr pubkey used for nostr zaps (NIP-57). If set, it should be a valid
     * BIP-340 public key in hex format.
     */
    public nostrPubkey?: string,
    /**
     * Should be set to true if the receiving VASP allows nostr zaps (NIP-57).
     */
    public allowsNostr?: boolean,
  ) {}

  isUma(): this is {
    compliance: LnurlComplianceResponse;
    umaVersion: string;
    currencies: Currency[];
    payerData: CounterPartyDataOptions;
  } {
    return (
      !!this.compliance &&
      !!this.umaVersion &&
      !!this.currencies &&
      !!this.payerData
    );
  }

  signablePayload(): string {
    if (!this.compliance) {
      throw new Error("compliance is required, but not present in response");
    }
    return [
      this.compliance.receiverIdentifier,
      this.compliance.signatureNonce,
      this.compliance.signatureTimestamp.toString(),
    ].join("|");
  }

  toJsonSchemaObject(): z.infer<typeof LnurlpResponseSchema> {
    return {
      tag: this.tag,
      callback: this.callback,
      minSendable: this.minSendable,
      maxSendable: this.maxSendable,
      metadata: this.metadata,
      compliance: this.compliance,
      umaVersion: this.umaVersion,
      currencies: this.currencies?.map((c) => c.toJsonSchemaObject()),
      payerData: this.payerData,
      commentAllowed: this.commentAllowed,
      nostrPubkey: this.nostrPubkey,
      allowsNostr: this.allowsNostr,
    };
  }

  toJsonString(): string {
    return JSON.stringify(this.toJsonSchemaObject());
  }

  static fromJson(jsonStr: string): LnurlpResponse {
    return LnurlpResponse.parse(JSON.parse(jsonStr));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static parse(data: any): LnurlpResponse {
    let validated: z.infer<typeof LnurlpResponseSchema>;
    try {
      validated = LnurlpResponseSchema.parse(data);
    } catch (e) {
      throw new Error("invalid lnurlp response", { cause: e });
    }
    const currencies = data.currencies?.map((c: unknown) => Currency.parse(c));
    return new LnurlpResponse(
      validated.callback,
      validated.minSendable,
      validated.maxSendable,
      validated.metadata,
      validated.compliance,
      validated.umaVersion,
      currencies,
      validated.payerData,
      validated.commentAllowed,
      validated.nostrPubkey,
      validated.allowsNostr,
    );
  }
}

/** LnurlComplianceResponse is the `compliance` field  of the LnurlpResponse. */
const LnurlpComplianceResponseSchema = z.object({
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

const LnurlpResponseSchema = z.object({
  tag: z.string(),
  callback: z.string(),
  minSendable: z.number(),
  maxSendable: z.number(),
  metadata: z.string(),
  currencies: optionalIgnoringNull(z.array(CurrencySchema)),
  payerData: optionalIgnoringNull(CounterPartyDataOptionsSchema),
  compliance: optionalIgnoringNull(LnurlpComplianceResponseSchema),
  umaVersion: optionalIgnoringNull(z.string()),
  commentAllowed: optionalIgnoringNull(z.number()),
  nostrPubkey: optionalIgnoringNull(z.string()),
  allowsNostr: optionalIgnoringNull(z.boolean()),
});
