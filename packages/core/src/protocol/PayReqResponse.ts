import { z } from "zod";
import { optionalIgnoringNull } from "../zodUtils.js";
import { PayeeDataSchema, type PayeeData } from "./PayeeData.js";

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
  converted: optionalIgnoringNull(PayReqResponsePaymentInfoSchema),
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

export type PayReqResponse = z.infer<typeof PayReqResponseSchema>;

export function isPayReqResponseForUma(
  response: PayReqResponse,
): response is PayReqResponse & {
  payeeData: PayeeData;
  converted: PayReqResponsePaymentInfo;
} {
  return !!response.payeeData?.compliance && !!response.converted;
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

export function getSignablePayReqResponsePayload(
  r: PayReqResponse,
  payerIdentifier: string,
  payeeIdentifier: string,
): string {
  const complianceData = r.payeeData?.compliance;
  if (!complianceData) {
    throw new Error("compliance is required, but not present in payeeData");
  }
  return `${payerIdentifier}|${payeeIdentifier}|${
    complianceData.signatureNonce
  }|${complianceData.signatureTimestamp.toString()}`;
}
