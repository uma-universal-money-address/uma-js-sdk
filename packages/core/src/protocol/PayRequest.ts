import { z } from "zod";
import { optionalIgnoringNull } from "../zodUtils.js";
import {
  CounterPartyDataOptionsSchema,
  type CounterPartyDataOptions,
} from "./CounterPartyData.js";
import { PayerDataSchema, type PayerData } from "./PayerData.js";

/**
 * The schema of the request sent by the sender to the receiver to retrieve an invoice.
 */
export const PayRequestSchema = z.object({
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

/**
 * A class which wraps the `PayRequestSchema` and provides a more convenient interface for
 * creating and parsing PayRequests.
 *
 * NOTE: The `fromJson` and `toJson` methods are used to convert to and from JSON strings.
 * This is necessary because `JSON.stringify` will not include the correct field names.
 */
export class PayRequest {
  receivingCurrencyCode: string | undefined;
  sendingAmountCurrencyCode: string | undefined;
  amount: number;
  payerData: z.infer<typeof PayerDataSchema> | undefined;
  requestedPayeeData: CounterPartyDataOptions | undefined;
  comment: string | undefined;

  constructor(
    amount: number,
    receivingCurrencyCode: string | undefined,
    sendingAmountCurrencyCode: string | undefined,
    payerData?: z.infer<typeof PayerDataSchema> | undefined,
    requestedPayeeData?: CounterPartyDataOptions | undefined,
    comment?: string | undefined,
  ) {
    this.amount = amount;
    this.receivingCurrencyCode = receivingCurrencyCode;
    this.sendingAmountCurrencyCode = sendingAmountCurrencyCode;
    this.payerData = payerData;
    this.requestedPayeeData = requestedPayeeData;
    this.comment = comment;
  }

  isUmaPayRequest(): this is {
    payerData: PayerData;
    receivingCurrencyCode: string;
  } {
    return (
      !!this.payerData?.compliance && this.receivingCurrencyCode !== undefined
    );
  }

  toJsonSchemaObject(): z.infer<typeof PayRequestSchema> {
    return {
      convert: this.receivingCurrencyCode,
      amount:
        this.sendingAmountCurrencyCode == "SAT" ||
        !this.sendingAmountCurrencyCode
          ? this.amount.toString()
          : `${this.amount}.${this.sendingAmountCurrencyCode}`,
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
      amount,
      schema.convert,
      sendingAmountCurrencyCode,
      schema.payerData as PayerData | undefined,
      schema.payeeData,
      schema.comment,
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

export function getSignablePayRequestPayload(q: PayRequest): string {
  const complianceData = q.payerData?.compliance;
  if (!complianceData) {
    throw new Error("compliance is required, but not present in payerData");
  }
  const payerIdentifier = q.payerData?.identifier;
  if (!payerIdentifier) {
    throw new Error("payer identifier is missing");
  }
  return `${payerIdentifier}|${
    complianceData.signatureNonce
  }|${complianceData.signatureTimestamp.toString()}`;
}
