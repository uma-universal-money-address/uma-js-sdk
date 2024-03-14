import { z } from "zod";
import { MAJOR_VERSION } from "../version.js";
import { optionalIgnoringNull } from "../zodUtils.js";
import {
  CounterPartyDataOptionsSchema,
  type CounterPartyDataOptions,
} from "./CounterPartyData.js";
import { PayerDataSchema, type PayerData } from "./PayerData.js";

const V1PayRequestSchema = z.object({
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
});

const V0PayRequestSchema = z.object({
  currency: optionalIgnoringNull(z.string()),
  amount: z.number(),
  payerData: optionalIgnoringNull(PayerDataSchema),
  payeeData: optionalIgnoringNull(CounterPartyDataOptionsSchema),
  comment: optionalIgnoringNull(z.string()),
});

export const PayRequestSchema = V0PayRequestSchema.or(
  V1PayRequestSchema,
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
export default class PayRequest {
  constructor(
    public readonly amount: number,
    public readonly receivingCurrencyCode: string | undefined,
    public readonly sendingAmountCurrencyCode: string | undefined,
    readonly umaMajorVersion: number,
    public readonly payerData?: z.infer<typeof PayerDataSchema> | undefined,
    public readonly requestedPayeeData?: CounterPartyDataOptions | undefined,
    public readonly comment?: string | undefined,
  ) {}

  isUmaPayRequest(): this is {
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
    const amountString =
      this.sendingAmountCurrencyCode == "SAT" || !this.sendingAmountCurrencyCode
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
    let sendingAmountCurrencyCode: string;
    const amountFieldStr = schema.amount.toString();
    if (!amountFieldStr.includes(".")) {
      amount = z.coerce.number().int().parse(amountFieldStr);
      sendingAmountCurrencyCode = "SAT";
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
    return this.fromSchema(JSON.parse(jsonStr));
  }

  /**
   * Parse a PayRequest from a URLSearchParams object. Should only be used for
   * non-UMA pay requests because UMA uses POST requests for payreq.
   */
  static fromUrlSearchParams(params: URLSearchParams): PayRequest {
    const convert = params.get("convert");
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
