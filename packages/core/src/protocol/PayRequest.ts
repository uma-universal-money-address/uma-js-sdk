import { z } from "zod";
import { MAJOR_VERSION } from "../version.js";
import { optionalIgnoringNull } from "../zodUtils.js";
import {
  CounterPartyDataOptionsSchema,
  type CounterPartyDataOptions,
} from "./CounterPartyData.js";
import { PayerDataSchema, type PayerData } from "./PayerData.js";

const V1PayRequestSchema = z
  .object({
    /** The 3-character currency code that the receiver will receive for this payment. */
    convert: optionalIgnoringNull(z.string()),
    /**
     * An amount (int64) followed optionally by a "." and the sending currency code. For example: "100.USD" would send
     * an amount equivalent to $1 USD. Note that the amount is specified in the smallest unit of the specified
     * currency (eg. cents for USD). Omitting the currency code will default to specifying the amount in millisats.
     */
    amount: z.coerce.string(),
    /** The data that the sender will send to the receiver to identify themselves. See LUD-18. */
    payerData: optionalIgnoringNull(PayerDataSchema),
    /** The fields requested about the payee by the sending vasp, if any. */
    payeeData: optionalIgnoringNull(CounterPartyDataOptionsSchema),
    /**
     * A comment that the sender would like to include with the payment. This can only be included
     * if the receiver included the `commentAllowed` field in the lnurlp response. The length of
     * the comment must be less than or equal to the value of `commentAllowed`.
     */
    comment: optionalIgnoringNull(z.string()),
    /**
     * InvoiceUUID is the invoice UUID that the sender is paying.
     * This only exists in the v1 pay request since the v0 SDK won't support invoices.
     */
    invoiceUUID: optionalIgnoringNull(z.string().uuid()),
  })
  .passthrough()
  .refine((data) => {
    // This refinement is needed to avoid swallowing V0 data.
    return !("currency" in data) || "convert" in data;
  });

const V0PayRequestSchema = z.object({
  currency: optionalIgnoringNull(z.string()),
  amount: z.number(),
  payerData: optionalIgnoringNull(PayerDataSchema),
  payeeData: optionalIgnoringNull(CounterPartyDataOptionsSchema),
  comment: optionalIgnoringNull(z.string()),
});

export const PayRequestSchema = V1PayRequestSchema.or(
  V0PayRequestSchema,
).transform(
  (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any,
  ): z.infer<typeof V1PayRequestSchema> & { umaMajorVersion: number } => {
    if (data.currency) {
      return {
        convert: data.currency,
        amount: data.amount.toString(),
        payerData: data.payerData,
        payeeData: data.payeeData,
        comment: data.comment,
        umaMajorVersion: 0,
      };
    }
    return {
      ...data,
      amount: data.amount.toString(), // Needed for raw LNURL.
      umaMajorVersion: MAJOR_VERSION,
    };
  },
);

/**
 * A class which wraps the `PayRequestSchema` and provides a more convenient interface for
 * creating and parsing PayRequests.
 *
 * NOTE: The `fromJson` and `toJsonString` methods are used to convert to and from JSON strings.
 * This is necessary because `JSON.stringify` will not include the correct field names.
 */
export class PayRequest {
  constructor(
    /**
     * The amount of the payment in the currency specified by `currency_code`. This amount is
     * in the smallest unit of the specified currency (e.g. cents for USD).
     */
    public readonly amount: number,
    /**
     * The 3-character currency code that the receiver will receive for this payment.
     */
    public readonly receivingCurrencyCode: string | undefined,
    /**
     * The currency code of the `amount` field. `None` indicates that `amount` is in millisatoshis
     * as in LNURL without LUD-21. If this is not `None`, then `amount` is in the smallest unit of
     * the specified currency (e.g. cents for USD). This currency code can be any currency which
     * the receiver can quote. However, there are two most common scenarios for UMA:
     *
     * 1. If the sender wants the receiver wants to receive a specific amount in their receiving
     * currency, then this field should be the same as `receiving_currency_code`. This is useful
     * for cases where the sender wants to ensure that the receiver receives a specific amount
     * in that destination currency, regardless of the exchange rate, for example, when paying
     * for some goods or services in a foreign currency.
     *
     * 2. If the sender has a specific amount in their own currency that they would like to send,
     * then this field should be left as `None` to indicate that the amount is in millisatoshis.
     * This will lock the sent amount on the sender side, and the receiver will receive the
     * equivalent amount in their receiving currency. NOTE: In this scenario, the sending VASP
     * *should not* pass the sending currency code here, as it is not relevant to the receiver.
     * Rather, by specifying an invoice amount in msats, the sending VASP can ensure that their
     * user will be sending a fixed amount, regardless of the exchange rate on the receiving side.
     */
    public readonly sendingAmountCurrencyCode: string | undefined,
    /**
     * The major version of the UMA protocol that this currency adheres to. This is not serialized to JSON.
     */
    readonly umaMajorVersion: number,
    /**
     * The data about the payer that the sending VASP must provide in order to send a payment.
     * This was requested by the receiver in the lnulp response. See LUD-18.
     */
    public readonly payerData?: z.infer<typeof PayerDataSchema> | undefined,
    /**
     * The data about the receiver that the sending VASP would like to know from the receiver.
     * See LUD-22.
     */
    public readonly requestedPayeeData?: CounterPartyDataOptions | undefined,
    /**
     * A comment that the sender would like to include with the payment. This can only be included
     * if the receiver included the `commentAllowed` field in the lnurlp response. The length of
     * the comment must be less than or equal to the value of `commentAllowed`.
     */
    public readonly comment?: string | undefined,
    /**
     * Associated UMA Invoice UUID
     */
    public readonly invoiceUUID?: string | undefined,
  ) {}

  /**
   * @returns true if this PayRequest is for UMA. False if for regular lnurl.
   */
  isUma(): this is {
    payerData: PayerData;
    receivingCurrencyCode: string;
  } {
    return (
      !!this.payerData?.compliance && this.receivingCurrencyCode !== undefined
    );
  }

  toJsonSchemaObject():
    | z.infer<typeof V0PayRequestSchema>
    | z.infer<typeof V1PayRequestSchema> {
    if (this.umaMajorVersion === 0) {
      return {
        amount: this.amount,
        currency: this.receivingCurrencyCode,
        payerData: this.payerData,
        payeeData: this.requestedPayeeData,
        comment: this.comment,
      };
    }
    const amountString = !this.sendingAmountCurrencyCode
      ? this.amount.toString()
      : `${this.amount}.${this.sendingAmountCurrencyCode}`;
    return {
      convert: this.receivingCurrencyCode,
      amount: amountString,
      payerData: this.payerData,
      payeeData: this.requestedPayeeData,
      comment: this.comment,
    };
  }

  /**
   * NOTE: This MUST be used when sending the PayRequest to the receiver rather than
   * `JSON.stringify` because the latter will not include the correct field names.
   * @returns a JSON string representation of the PayRequest.
   */
  toJsonString(): string {
    return JSON.stringify(this.toJsonSchemaObject());
  }

  toJSON(): string {
    return JSON.stringify(this.toJsonSchemaObject());
  }

  signablePayload(): string {
    const complianceData = this.payerData?.compliance;
    if (!complianceData) {
      throw new Error("compliance is required, but not present in payerData");
    }
    const payerIdentifier = this.payerData?.identifier;
    if (!payerIdentifier) {
      throw new Error("payer identifier is missing");
    }
    return `${payerIdentifier}|${
      complianceData.signatureNonce
    }|${complianceData.signatureTimestamp.toString()}`;
  }

  static fromSchema(schema: z.infer<typeof PayRequestSchema>): PayRequest {
    let amount: number;
    let sendingAmountCurrencyCode: string | undefined;
    const amountFieldStr = schema.amount.toString();
    if (!amountFieldStr.includes(".")) {
      amount = z.coerce.number().int().parse(amountFieldStr);
      sendingAmountCurrencyCode = undefined;
    } else if (amountFieldStr.split(".").length > 2) {
      throw new Error(
        "invalid amount string. Cannot contain more than one period. Example: '5000' for SAT or '5.USD' for USD.",
      );
    } else {
      const [amountStr, currencyCode] = amountFieldStr.split(".");
      amount = z.coerce.number().int().parse(amountStr);
      sendingAmountCurrencyCode = currencyCode;
    }

    return new PayRequest(
      amount,
      schema.convert,
      sendingAmountCurrencyCode,
      schema.umaMajorVersion,
      schema.payerData as PayerData | undefined,
      schema.payeeData,
      schema.comment,
    );
  }

  static parse(data: unknown): PayRequest {
    let validated: z.infer<typeof PayRequestSchema>;
    try {
      validated = PayRequestSchema.parse(data);
    } catch (e) {
      throw new Error("invalid pay request", { cause: e });
    }
    return this.fromSchema(validated);
  }

  static fromJson(jsonStr: string): PayRequest {
    return this.parse(JSON.parse(jsonStr));
  }

  /**
   * Parse a PayRequest from a URLSearchParams object. Should only be used for
   * non-UMA pay requests because UMA uses POST requests for payreq.
   */
  static fromUrlSearchParams(params: URLSearchParams): PayRequest {
    const convert = params.get("convert");
    const v0Currency = params.get("currency");
    const amountParam = params.get("amount");
    const payerData = params.get("payerData");
    const payeeData = params.get("payeeData");
    const comment = params.get("comment");
    if (amountParam === null) {
      throw new Error("amount is required");
    }
    let validated: z.infer<typeof PayRequestSchema>;
    try {
      validated = PayRequestSchema.parse({
        convert,
        currency: v0Currency,
        amount: amountParam,
        payerData: payerData ? JSON.parse(payerData) : undefined,
        payeeData: payeeData ? JSON.parse(payeeData) : undefined,
        comment,
      });
    } catch (e) {
      throw new Error("invalid pay request", { cause: e });
    }
    return this.fromSchema(validated);
  }
}
