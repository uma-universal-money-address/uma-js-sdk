import { z } from "zod";
import { CurrencySchema } from "./Currency.js";
import { KycStatus } from "./KycStatus.js";
import { PayeeDataSchema } from "./PayeeData.js";
import { PayerDataSchema } from "./PayerData.js";
import { isDomainLocalhost } from "./urlUtils.js";
import { optionalIgnoringNull } from "./zodUtils.js";

/** LnurlpRequest is the first request in the UMA protocol. It is sent by the VASP that is sending the payment to find out information about the receiver. */
export type LnurlpRequest = {
  /** ReceiverAddress is the address of the user at VASP2 that is receiving the payment. */
  receiverAddress: string;
  /** Nonce is a random string that is used to prevent replay attacks. */
  nonce: string;
  /** Signature is the base64-encoded signature of sha256(ReceiverAddress|Nonce|Timestamp). */
  signature: string;
  /** IsSubjectToTravelRule indicates VASP1 is a financial institution that requires travel rule information. */
  isSubjectToTravelRule: boolean;
  /** VaspDomain is the domain of the VASP that is sending the payment. It will be used by VASP2 to fetch the public keys of VASP1. */
  vaspDomain: string;
  /** Timestamp is the unix timestamp of when the request was sent. Used in the signature. */
  timestamp: Date;
  /**
   * The version of the UMA protocol that VASP2 has chosen for this transaction based on its own support and VASP1's specified preference in the LnurlpRequest.
   * For the version negotiation flow, see https://static.swimlanes.io/87f5d188e080cb8e0494e46f80f2ae74.png
   */
  umaVersion: string;
};

export const CounterPartyDataOptionSchema = z.object({
  mandatory: z.boolean(),
});

export type CounterPartyDataOption = z.infer<
  typeof CounterPartyDataOptionSchema
>;

/**
 * CounterPartyDataOptions describes which fields a vasp needs to know about the sender or receiver.
 * Used for payerData and payeeData.
 */
export const CounterPartyDataOptionsSchema = z.record(
  CounterPartyDataOptionSchema,
);

export type CounterPartyDataOptions = z.infer<
  typeof CounterPartyDataOptionsSchema
>;

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
  currencies: z.array(CurrencySchema),
  payerData: CounterPartyDataOptionsSchema,
  compliance: LnurlpComplianceResponseSchema,
  /**
   * The version of the UMA protocol that VASP2 has chosen for this transaction based on its own support and VASP1's specified preference in the LnurlpRequest.
   * For the version negotiation flow, see https://static.swimlanes.io/87f5d188e080cb8e0494e46f80f2ae74.png
   */
  umaVersion: z.string(),
});

export type LnurlpResponse = z.infer<typeof LnurlpResponseSchema>;

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

/**
 * The schema of the request sent by the sender to the receiver to retrieve an invoice.
 */
export const PayRequestSchema = z.object({
  /** The 3-character currency code that the receiver will receive for this payment. */
  convert: z.string(),
  /**
   * An amount (int64) followed optionally by a "." and the sending currency code. For example: "100.USD" would send
   * an amount equivalent to $1 USD. Note that the amount is specified in the smallest unit of the specified
   * currency (eg. cents for USD). Omitting the currency code will default to specifying the amount in millisats.
   */
  amount: z.coerce.string(),
  /** The data that the sender will send to the receiver to identify themselves. See LUD-18. */
  payerData: PayerDataSchema,
  /** The fields requested about the payee by the sending vasp, if any. */
  payeeData: optionalIgnoringNull(CounterPartyDataOptionsSchema),
});

/**
 * A class which wraps the `PayRequestSchema` and provides a more convenient interface for
 * creating and parsing PayRequests.
 *
 * NOTE: The `fromJson` and `toJson` methods are used to convert to and from JSON strings.
 * This is necessary because `JSON.stringify` will not include the correct field names.
 */
export class PayRequest {
  receivingCurrencyCode: string;
  sendingAmountCurrencyCode: string;
  amount: number;
  payerData: z.infer<typeof PayerDataSchema>;
  requestedPayeeData: CounterPartyDataOptions | undefined;

  constructor(
    receivingCurrencyCode: string,
    sendingAmountCurrencyCode: string,
    amount: number,
    payerData: z.infer<typeof PayerDataSchema>,
    requestedPayeeData?: CounterPartyDataOptions,
  ) {
    this.receivingCurrencyCode = receivingCurrencyCode;
    this.sendingAmountCurrencyCode = sendingAmountCurrencyCode;
    this.amount = amount;
    this.payerData = payerData;
    this.requestedPayeeData = requestedPayeeData;
  }

  toJsonSchemaObject(): z.infer<typeof PayRequestSchema> {
    return {
      convert: this.receivingCurrencyCode,
      amount:
        this.sendingAmountCurrencyCode == "SAT"
          ? this.amount.toString()
          : `${this.amount}.${this.sendingAmountCurrencyCode}`,
      payerData: this.payerData,
      payeeData: this.requestedPayeeData,
    };
  }

  /**
   * NOTE: This MUST be used when sending the PayRequest to the receiver rather than
   * `JSON.stringify` because the latter will not include the correct field names.
   * @returns a JSON string representation of the PayRequest.
   */
  toJson(): string {
    return JSON.stringify(this.toJsonSchemaObject());
  }

  static fromSchema(schema: z.infer<typeof PayRequestSchema>): PayRequest {
    let amount: number;
    let sendingAmountCurrencyCode: string;
    if (!schema.amount.includes(".")) {
      amount = z.coerce.number().int().parse(schema.amount);
      sendingAmountCurrencyCode = "SAT";
    } else if (schema.amount.split(".").length > 2) {
      throw new Error(
        "invalid amount string. Cannot contain more than one period. Example: '5000' for SAT or '5.USD' for USD.",
      );
    } else {
      const [amountStr, currencyCode] = schema.amount.split(".");
      amount = z.coerce.number().int().parse(amountStr);
      sendingAmountCurrencyCode = currencyCode;
    }

    return new PayRequest(
      schema.convert,
      sendingAmountCurrencyCode,
      amount,
      schema.payerData,
      schema.payeeData,
    );
  }

  static fromJson(jsonStr: string): PayRequest {
    const parsed = JSON.parse(jsonStr);
    let validated: z.infer<typeof PayRequestSchema>;
    try {
      validated = PayRequestSchema.parse(parsed);
    } catch (e) {
      throw new Error("invalid pay request", { cause: e });
    }
    return this.fromSchema(validated);
  }
}

export const RouteSchema = z.object({
  pubkey: z.string(),
  path: z.array(
    z.object({
      pubkey: z.string(),
      fee: z.number(),
      msatoshi: z.number(),
      channel: z.string(),
    }),
  ),
});

export type Route = z.infer<typeof RouteSchema>;

export const PayReqResponsePaymentInfoSchema = z.object({
  /**
   * The amount that the receiver will receive in the receiving currency not including fees. The amount is specified
   * in the smallest unit of the currency (eg. cents for USD).
   */
  amount: z.number(),
  /** currencyCode is the ISO 3-digit currency code that the receiver will receive for this payment. */
  currencyCode: z.string(),
  /**
   * Number of digits after the decimal point for the receiving currency. For example, in USD, by
   * convention, there are 2 digits for cents - $5.95. In this case, `decimals` would be 2. This should align with
   * the currency's `decimals` field in the LNURLP response. It is included here for convenience. See
   * [UMAD-04](https://github.com/uma-universal-money-address/protocol/blob/main/umad-04-lnurlp-response.md) for
   * details, edge cases, and examples.
   */
  decimals: z.number(),
  /** The conversion rate. It is the number of millisatoshis that the receiver will receive for 1 unit of the specified currency. */
  multiplier: z.number(),
  /**  The fees charged (in millisats) by the receiving VASP for this transaction. This is separate from the multiplier. */
  fee: z.number(),
});

export type PayReqResponsePaymentInfo = z.infer<
  typeof PayReqResponsePaymentInfoSchema
>;

/** PayReqResponse is the response sent by the receiver to the sender to provide an invoice. */
export const PayReqResponseSchema = z.object({
  /** The BOLT11 invoice that the sender will pay. */
  pr: z.string(),
  /** routes is usually just an empty list from legacy LNURL, which was replaced by route hints in the BOLT11 invoice. */
  routes: optionalIgnoringNull(z.array(RouteSchema)),
  converted: PayReqResponsePaymentInfoSchema,
  payeeData: PayeeDataSchema,
});

export type PayReqResponse = z.infer<typeof PayReqResponseSchema>;

/** PubKeyResponse is sent from a VASP to another VASP to provide its public keys. It is the response to GET requests at `/.well-known/lnurlpubkey`. */
export type PubKeyResponse = {
  /** SigningPubKey is used to verify signatures from a VASP. */
  signingPubKey: string;
  /** EncryptionPubKey is used to encrypt TR info sent to a VASP. */
  encryptionPubKey: string;
  /** [Optional] Seconds since epoch at which these pub keys must be refreshed. They can be safely cached until this expiration (or forever if null). */
  expirationTimestamp?: number;
};

/** UtxoWithAmount is a pair of utxo and amount transferred over that corresponding channel. It can be used to register payment for KYT. */
export const UtxoWithAmountSchema = z.object({
  /** Utxo The utxo of the channel over which the payment went through in the format of <transaction_hash>:<output_index>. */
  utxo: z.string(),
  /** Amount The amount of funds transferred in the payment in mSats. */
  amount: z.number(),
});

export type UtxoWithAmount = z.infer<typeof UtxoWithAmountSchema>;

/** PostTransactionCallback is sent between VASPs after the payment is complete. */
export const PostTransactionCallbackSchema = z.object({
  /** Utxos is a list of utxo/amounts corresponding to the VASPs channels. */
  utxos: z.array(UtxoWithAmountSchema),
  /** VaspDomain is the domain of the VASP that is sending the callback. It will be used by the VASP to fetch the public keys of its counterparty. */
  vaspDomain: z.string(),
  /** Signature is the base64-encoded signature of sha256(Nonce|Timestamp). */
  signature: z.string(),
  /** Nonce is a random string that is used to prevent replay attacks. */
  signatureNonce: z.string(),
  /** Timestamp is the unix timestamp of when the request was sent. Used in the signature. */
  signatureTimestamp: z.number(),
});

export type PostTransactionCallback = z.infer<
  typeof PostTransactionCallbackSchema
>;

export function parsePostTransactionCallback(
  jsonStr: string,
): PostTransactionCallback {
  const parsed = JSON.parse(jsonStr);
  let validated: PostTransactionCallback;
  try {
    validated = PostTransactionCallbackSchema.parse(parsed);
  } catch (e) {
    throw new Error("invalid post transaction callback", { cause: e });
  }
  return validated;
}

export function dateToUnixSeconds(date: Date) {
  return Math.floor(date.getTime() / 1000);
}

export function encodeToUrl(q: LnurlpRequest): URL {
  const receiverAddressParts = q.receiverAddress.split("@");
  if (receiverAddressParts.length !== 2) {
    throw new Error("invalid receiver address");
  }
  const scheme = isDomainLocalhost(receiverAddressParts[1]) ? "http" : "https";
  const lnurlpUrl = new URL(
    `${scheme}://${receiverAddressParts[1]}/.well-known/lnurlp/${receiverAddressParts[0]}`,
  );
  const queryParams = lnurlpUrl.searchParams;
  queryParams.set("signature", q.signature);
  queryParams.set("vaspDomain", q.vaspDomain);
  queryParams.set("nonce", q.nonce);
  queryParams.set("isSubjectToTravelRule", q.isSubjectToTravelRule.toString());
  queryParams.set("timestamp", String(dateToUnixSeconds(q.timestamp)));
  queryParams.set("umaVersion", q.umaVersion);
  lnurlpUrl.search = queryParams.toString();
  return lnurlpUrl;
}

export function parsePayReqResponse(jsonStr: string): PayReqResponse {
  const parsed = JSON.parse(jsonStr);
  let validated: PayReqResponse;
  try {
    validated = PayReqResponseSchema.parse(parsed);
  } catch (e) {
    throw new Error("invalid pay request response", { cause: e });
  }
  return validated;
}

export function getSignableLnurlpRequestPayload(q: LnurlpRequest): string {
  return [
    q.receiverAddress,
    q.nonce,
    String(dateToUnixSeconds(q.timestamp)),
  ].join("|");
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

export function getSignablePayRequestPayload(q: PayRequest): string {
  const complianceData = q.payerData.compliance;
  if (!complianceData) {
    throw new Error("compliance is required, but not present in payerData");
  }
  const payerIdentifier = q.payerData.identifier;
  if (!payerIdentifier) {
    throw new Error("payer identifier is missing");
  }
  return `${payerIdentifier}|${
    complianceData.signatureNonce
  }|${complianceData.signatureTimestamp.toString()}`;
}

export function getSignablePayReqResponsePayload(
  r: PayReqResponse,
  payerIdentifier: string,
  payeeIdentifier: string,
): string {
  const complianceData = r.payeeData.compliance;
  if (!complianceData) {
    throw new Error("compliance is required, but not present in payeeData");
  }
  return `${payerIdentifier}|${payeeIdentifier}|${
    complianceData.signatureNonce
  }|${complianceData.signatureTimestamp.toString()}`;
}

export function getSignablePostTransactionCallback(
  c: PostTransactionCallback,
): string {
  return [c.signatureNonce, c.signatureTimestamp.toString()].join("|");
}
