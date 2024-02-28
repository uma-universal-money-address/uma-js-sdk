import { z } from "zod";

export const CurrencySchema = z.object({
  /**
   * The currency code, eg. "USD".
   */
  code: z.string(),

  /**
   * The full currency name in plural form, eg. "US Dollars".
   */
  name: z.string(),

  /**
   * The symbol of the currency, eg. "$".
   */
  symbol: z.string(),

  /**
   * Estimated millisats per smallest "unit" of this currency (eg. 1 cent in USD).
   */
  multiplier: z.number(),

  /**
   * The number of digits after the decimal point for display on the sender side, and to add clarity
   * around what the "smallest unit" of the currency is. For example, in USD, by convention, there are 2 digits for
   * cents - $5.95. In this case, `decimals` would be 2. Note that the multiplier is still always in the smallest
   * unit (cents). In addition to display purposes, this field can be used to resolve ambiguity in what the multiplier
   * means. For example, if the currency is "BTC" and the multiplier is 1000, really we're exchanging in SATs, so
   * `decimals` would be 8.
   * For details on edge cases and examples, see https://github.com/uma-universal-money-address/protocol/blob/main/umad-04-lnurlp-response.md.
   */
  decimals: z.number(),

  /**
   * The inclusion of a convertible field implies the receiving VASP can quote and guarantee a price
   * for a given currency.
   */
  convertible: z.object({
    /**
     * Minimum amount that can be sent in this currency. This is in the smallest unit of the currency
     * (eg. cents for USD).
     */
    min: z.number(),

    /**
     * Maximum amount that can be sent in this currency. This is in the smallest unit of the currency
     * (eg. cents for USD).
     */
    max: z.number(),
  }),
});

export type Currency = z.infer<typeof CurrencySchema>;
