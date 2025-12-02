import { z } from "zod";
import { UmaError } from "../errors.js";
import { ErrorCode } from "../generated/errorCodes.js";
import { signPayload } from "../signingUtils.js";
import { MAJOR_VERSION } from "../version.js";
import { optionalIgnoringNull } from "../zodUtils.js";
import {
  CompliancePayeeDataSchema,
  PayeeDataSchema,
  type PayeeData,
} from "./PayeeData.js";
export class PayReqResponse {
  constructor(
    /** The BOLT11 invoice that the sender will pay. */
    public readonly pr: string,
    /**
     * The data about the receiver that the sending VASP requested in the payreq request.
     * Required for UMA.
     */
    public readonly payeeData: PayeeData | undefined,
    /**
     * Information about the payment that the receiver will receive. Includes
     * Final currency-related information for the payment. Required for UMA.
     */
    public readonly converted: PayReqResponsePaymentInfo | undefined,
    /**
     * This field may be used by a WALLET to decide whether the initial LNURL link will
     * be stored locally for later reuse or erased. If disposable is null, it should be
     * interpreted as true, so if SERVICE intends its LNURL links to be stored it must
     * return `disposable: false`. UMA should always return `disposable: false`. See LUD-11.
     */
    public readonly disposable: boolean | undefined,
    /**
     * Defines a struct which can be stored and shown to the user on payment success. See LUD-09.
     */
    public readonly successAction: Record<string, string> | undefined,
    /**
     * The major version of the UMA protocol that this currency adheres to. This is not
     * serialized to JSON.
     */
    public readonly umaMajorVersion: number,
    /**
     * Usually just an empty list from legacy LNURL, which was replaced by route
     * hints in the BOLT11 invoice.
     */
    public readonly routes: Route[] = [],
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

  toJSON(): string {
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

  /**
   * Appends a backing signature to the PayReqResponse.
   *
   * @param signingPrivateKey The private key used to sign the payload
   * @param domain The domain of the VASP that is signing the payload
   * @param payerIdentifier The identifier of the payer
   * @param payeeIdentifier The identifier of the payee
   * @returns A new PayReqResponse with the additional backing signature
   */
  async appendBackingSignature(
    signingPrivateKey: Uint8Array,
    domain: string,
    payerIdentifier: string,
    payeeIdentifier: string,
  ): Promise<PayReqResponse> {
    if (!this.isUma()) {
      return this;
    }

    if (!this.payeeData?.compliance) {
      throw new UmaError(
        "compliance is required for signing",
        ErrorCode.MISSING_REQUIRED_UMA_PARAMETERS,
      );
    }

    const signablePayload = this.signablePayload(
      payerIdentifier,
      payeeIdentifier,
    );
    const signature = await signPayload(signablePayload, signingPrivateKey);

    const newBackingSignatures = [
      ...(this.payeeData.compliance.backingSignatures || []),
      {
        domain,
        signature,
      },
    ];

    const updatedCompliance = {
      ...this.payeeData.compliance,
      backingSignatures: newBackingSignatures,
    };

    const updatedPayeeData = {
      ...this.payeeData,
      compliance: updatedCompliance,
    };

    return new PayReqResponse(
      this.pr,
      updatedPayeeData,
      this.converted,
      this.disposable,
      this.successAction,
      this.umaMajorVersion,
      this.routes,
    );
  }

  static fromJson(json: string): PayReqResponse {
    return this.parse(JSON.parse(json));
  }

  static parse(data: unknown): PayReqResponse {
    let validated: z.infer<typeof PayReqResponseSchema>;
    try {
      validated = PayReqResponseSchema.parse(data);
    } catch (e) {
      throw new UmaError(
        `invalid pay request response ${e}`,
        ErrorCode.PARSE_PAYREQ_RESPONSE_ERROR,
      );
    }
    return this.fromSchema(validated);
  }

  static fromSchema(
    schema: z.infer<typeof PayReqResponseSchema>,
  ): PayReqResponse {
    return new PayReqResponse(
      schema.pr,
      schema.payeeData && PayeeDataSchema.parse(schema.payeeData),
      schema.converted &&
        PayReqResponsePaymentInfoSchema.parse(schema.converted),
      schema.disposable,
      schema.successAction,
      schema.umaMajorVersion,
      schema.routes || [],
    );
  }

  signablePayload(payerIdentifier: string, payeeIdentifier: string): string {
    const complianceData = this.payeeData?.compliance;
    if (!complianceData) {
      throw new UmaError(
        "compliance is required, but not present in payeeData",
        ErrorCode.MISSING_REQUIRED_UMA_PARAMETERS,
      );
    }
    if (!complianceData.signatureNonce || !complianceData.signatureTimestamp) {
      throw new UmaError(
        "signatureNonce and signatureTimestamp are required. Is this a v0 response?",
        ErrorCode.MISSING_REQUIRED_UMA_PARAMETERS,
      );
    }
    return `${payerIdentifier}|${payeeIdentifier}|${
      complianceData.signatureNonce
    }|${complianceData.signatureTimestamp.toString()}`;
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
  /**
   * The conversion rate. In the default case (Lightning/BTC), it is the number of millisatoshis that the
   * receiver will receive for 1 unit of the specified currency (eg: cents in USD). For other settlement
   * layers, this is the number of the smallest unit of the settlement asset that the receiver will
   * receive for 1 unit of the specified currency.
   */
  multiplier: z.number(),
  /**
   * The fees charged by the receiving VASP for this transaction. In the default case (Lightning/BTC),
   * this is in millisatoshis. For other settlement layers, this is in the smallest unit of the
   * settlement asset. This is separate from the `multiplier`.
   */
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
