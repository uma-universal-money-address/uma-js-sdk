import { z } from "zod";
import { MAJOR_VERSION } from "../version.js";
import { optionalIgnoringNull } from "../zodUtils.js";
import {
  CompliancePayeeDataSchema,
  PayeeDataSchema,
  type PayeeData,
} from "./PayeeData.js";

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

const V1PayReqResponsePaymentInfoSchema = z.object({
  /**
   * The amount that the receiver will receive in the receiving currency not including fees. The amount is specified
   * in the smallest unit of the currency (eg. cents for USD).
   */
  amount: optionalIgnoringNull(z.number()),
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

const V0PayReqResponsePaymentInfoSchema = z.object({
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
  /** multiplier is the conversion rate. It is the number of millisatoshis that the receiver will receive for 1 unit of the specified currency. */
  multiplier: z.number(),
  /** exchangeFeesMillisatoshi is the fees charged (in millisats) by the receiving VASP for this transaction. This is separate from the Multiplier. */
  exchangeFeesMillisatoshi: z.number(),
});

export const PayReqResponsePaymentInfoSchema =
  V0PayReqResponsePaymentInfoSchema.or(
    V1PayReqResponsePaymentInfoSchema,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ).transform((data): z.infer<typeof V1PayReqResponsePaymentInfoSchema> => {
    if ("exchangeFeesMillisatoshi" in data) {
      return {
        currencyCode: data.currencyCode,
        decimals: data.decimals,
        multiplier: data.multiplier,
        fee: data.exchangeFeesMillisatoshi,
      };
    }
    return data;
  });

export type PayReqResponsePaymentInfo = z.infer<
  typeof PayReqResponsePaymentInfoSchema
>;

const BasePayReqResponseSchema = z.object({
  /** The BOLT11 invoice that the sender will pay. */
  pr: z.string(),
  /** routes is usually just an empty list from legacy LNURL, which was replaced by route hints in the BOLT11 invoice. */
  routes: optionalIgnoringNull(z.array(RouteSchema)),
  payeeData: optionalIgnoringNull(PayeeDataSchema),
  /**
   * This field may be used by a WALLET to decide whether the initial LNURL link will
   * be stored locally for later reuse or erased. If disposable is null, it should be
   * interpreted as true, so if SERVICE intends its LNURL links to be stored it must
   * return `disposable: false`. UMA should always return `disposable: false`. See LUD-11.
   */
  disposable: optionalIgnoringNull(z.boolean()),
  /**
   * Defines a struct which can be stored and shown to the user on payment success. See LUD-09.
   */
  successAction: optionalIgnoringNull(z.record(z.string())),
});

export const V0PayReqResponseComplianceSchema = z.object({
  /** nodePubKey is the public key of the receiver's node if known. */
  nodePubKey: optionalIgnoringNull(z.string()),
  /** utxos is a list of UTXOs of channels over which the receiver will likely receive the payment. */
  utxos: z.array(z.string()),
  /** utxoCallback is the URL that the sender VASP will call to send UTXOs of the channel that the sender used to send the payment once it completes. */
  utxoCallback: optionalIgnoringNull(z.string()),
});

export const PayReqResponseComplianceSchema =
  V0PayReqResponseComplianceSchema.or(CompliancePayeeDataSchema);

const V1PayReqResponseSchema = BasePayReqResponseSchema.extend({
  converted: optionalIgnoringNull(V1PayReqResponsePaymentInfoSchema),
})
  .passthrough()
  .refine((data) => {
    // This refinement is needed to avoid swallowing V0 data.
    return (
      !("paymentInfo" in data || "compliance" in data) || "converted" in data
    );
  });

const V0PayReqResponseSchema = BasePayReqResponseSchema.extend({
  paymentInfo: optionalIgnoringNull(V0PayReqResponsePaymentInfoSchema),
  compliance: optionalIgnoringNull(V0PayReqResponseComplianceSchema),
});

export const PayReqResponseSchema = V1PayReqResponseSchema.or(
  V0PayReqResponseSchema,
).transform(
  (
    data,
  ): z.infer<typeof V1PayReqResponseSchema> & { umaMajorVersion: number } => {
    if ("paymentInfo" in data) {
      const initalPayeeData = data.payeeData || {};
      const payeeData = {
        ...initalPayeeData,
        compliance: PayReqResponseComplianceSchema.parse(data.compliance),
      };
      return {
        pr: data.pr,
        routes: data.routes,
        payeeData,
        disposable: data.disposable,
        successAction: data.successAction,
        converted: PayReqResponsePaymentInfoSchema.parse(data.paymentInfo),
        umaMajorVersion: 0,
      };
    }
    return {
      ...data,
      umaMajorVersion: MAJOR_VERSION,
    };
  },
);

export default class PayReqResponse {
  constructor(
    public readonly pr: string,
    public readonly routes: Route[],
    public readonly payeeData: PayeeData | undefined,
    public readonly converted: PayReqResponsePaymentInfo | undefined,
    public readonly disposable: boolean | undefined,
    public readonly successAction: Record<string, string> | undefined,
    public readonly umaMajorVersion: number,
  ) {}

  isUma(): this is PayReqResponse & {
    payeeData: PayeeData;
    converted: PayReqResponsePaymentInfo;
  } {
    return !!this.payeeData?.compliance && !!this.converted;
  }

  toJsonString(): string {
    return JSON.stringify(this.toJsonSchemaObject());
  }

  toJsonSchemaObject():
    | z.infer<typeof V0PayReqResponseSchema>
    | z.infer<typeof V1PayReqResponseSchema> {
    if (this.umaMajorVersion === 0) {
      return {
        pr: this.pr,
        routes: this.routes,
        payeeData: this.payeeData,
        disposable: this.disposable,
        successAction: this.successAction,
        paymentInfo: this.converted && {
          currencyCode: this.converted?.currencyCode,
          decimals: this.converted?.decimals,
          multiplier: this.converted?.multiplier,
          exchangeFeesMillisatoshi: this.converted?.fee,
        },
        compliance: this.payeeData?.compliance,
      };
    }
    return {
      pr: this.pr,
      routes: this.routes,
      payeeData: this.payeeData,
      disposable: this.disposable,
      successAction: this.successAction,
      converted: this.converted,
    };
  }

  static fromJson(json: string): PayReqResponse {
    return this.parse(JSON.parse(json));
  }

  static parse(data: unknown): PayReqResponse {
    let validated: z.infer<typeof PayReqResponseSchema>;
    try {
      validated = PayReqResponseSchema.parse(data);
    } catch (e) {
      throw new Error("invalid pay request response", { cause: e });
    }
    return this.fromSchema(validated);
  }

  static fromSchema(
    schema: z.infer<typeof PayReqResponseSchema>,
  ): PayReqResponse {
    return new PayReqResponse(
      schema.pr,
      schema.routes || [],
      schema.payeeData && PayeeDataSchema.parse(schema.payeeData),
      schema.converted &&
        PayReqResponsePaymentInfoSchema.parse(schema.converted),
      schema.disposable,
      schema.successAction,
      schema.umaMajorVersion,
    );
  }

  signablePayload(payerIdentifier: string, payeeIdentifier: string): string {
    const complianceData = this.payeeData?.compliance;
    if (!complianceData) {
      throw new Error("compliance is required, but not present in payeeData");
    }
    if (!complianceData.signatureNonce || !complianceData.signatureTimestamp) {
      throw new Error(
        "signatureNonce and signatureTimestamp are required. Is this a v0 response?",
      );
    }
    return `${payerIdentifier}|${payeeIdentifier}|${
      complianceData.signatureNonce
    }|${complianceData.signatureTimestamp.toString()}`;
  }
}
