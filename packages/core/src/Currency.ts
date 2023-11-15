import { z } from "zod";

export const CurrencySchema = z.object({
  /**
   * The currency code, eg. "USD".
   */
  code: z.string(),

  /**
   * The full currency name, eg. "US Dollars".
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
   * Minimum amount that can be sent in this currency. This is in the smallest unit of the currency
   * (eg. cents for USD).
   */
  minSendable: z.number(),

  /**
   * Maximum amount that can be sent in this currency. This is in the smallest unit of the currency
   * (eg. cents for USD).
   */
  maxSendable: z.number(),

  /**
   * Number of digits after the decimal point for display on the sender side. For example,
   * in USD, by convention, there are 2 digits for cents - $5.95. in this case, `displayDecimals`
   * would be 2. Note that the multiplier is still always in the smallest unit (cents). This field
   * is only for display purposes. The sender should assume zero if this field is omitted, unless
   * they know the proper display format of the target currency.
   */
  displayDecimals: z.optional(z.number()),
});

export type Currency = z.infer<typeof CurrencySchema>;
