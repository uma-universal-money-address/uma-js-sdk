import { z } from "zod";
import { MAJOR_VERSION } from "../version.js";

export default class Currency {
  constructor(
    /**
     * The currency code, eg. "USD".
     */
    public readonly code: string,

    /**
     * The full currency name in plural form, eg. "US Dollars".
     */
    public readonly name: string,

    /**
     * The symbol of the currency, eg. "$".
     */
    public readonly symbol: string,

    /**
     * Estimated millisats per smallest "unit" of this currency (eg. 1 cent in USD).
     */
    public readonly multiplier: number,

    /**
     * Minimum amount that can be sent in this currency. This is in the smallest unit of the currency
     * (eg. cents for USD).
     */
    public readonly minSendable: number,

    /**
     * Maximum amount that can be sent in this currency. This is in the smallest unit of the currency
     * (eg. cents for USD).
     */
    public readonly maxSendable: number,

    /**
     * The number of digits after the decimal point for display on the sender side, and to add clarity
     * around what the "smallest unit" of the currency is. For example, in USD, by convention, there are 2 digits for
     * cents - $5.95. In this case, `decimals` would be 2. Note that the multiplier is still always in the smallest
     * unit (cents). In addition to display purposes, this field can be used to resolve ambiguity in what the multiplier
     * means. For example, if the currency is "BTC" and the multiplier is 1000, really we're exchanging in SATs, so
     * `decimals` would be 8.
     * For details on edge cases and examples, see https://github.com/uma-universal-money-address/protocol/blob/main/umad-04-lnurlp-response.md.
     */
    public readonly decimals: number,

    /** The major version of the UMA protocol that this currency adheres to. This is not serialized to JSON. */
    public readonly umaVersion: number,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static parse(data: any): Currency {
    const parsedData = CurrencySchema.parse(data);
    return new Currency(
      parsedData.code,
      parsedData.name,
      parsedData.symbol,
      parsedData.multiplier,
      parsedData.minSendable,
      parsedData.maxSendable,
      parsedData.decimals,
      parsedData.umaVersion,
    );
  }

  toJsonSchemaObject():
    | z.infer<typeof V0CurrencySchema>
    | z.infer<typeof V1CurrencySchema> {
    if (this.umaVersion === MAJOR_VERSION) {
      return {
        code: this.code,
        name: this.name,
        symbol: this.symbol,
        multiplier: this.multiplier,
        convertible: {
          min: this.minSendable,
          max: this.maxSendable,
        },
        decimals: this.decimals,
      };
    }
    return {
      code: this.code,
      name: this.name,
      symbol: this.symbol,
      multiplier: this.multiplier,
      minSendable: this.minSendable,
      maxSendable: this.maxSendable,
      decimals: this.decimals,
    };
  }

  toJsonString(): string {
    return JSON.stringify(this.toJsonSchemaObject());
  }

  withUmaVersion(majorVersion: number): Currency {
    return new Currency(
      this.code,
      this.name,
      this.symbol,
      this.multiplier,
      this.minSendable,
      this.maxSendable,
      this.decimals,
      majorVersion,
    );
  }
}

export const V1CurrencySchema = z.object({
  code: z.string(),
  name: z.string(),
  symbol: z.string(),
  multiplier: z.number(),
  decimals: z.number(),
  convertible: z.object({
    min: z.number(),
    max: z.number(),
  }),
});

const V0CurrencySchema = z.object({
  code: z.string(),
  name: z.string(),
  symbol: z.string(),
  multiplier: z.number(),
  minSendable: z.number(),
  maxSendable: z.number(),
  decimals: z.number(),
});

export const CurrencySchema = V1CurrencySchema.or(V0CurrencySchema).transform(
  (data): z.infer<typeof V0CurrencySchema> & { umaVersion: number } => {
    if ("minSendable" in data) {
      return {
        ...data,
        umaVersion: 0,
      };
    }
    return {
      code: data.code,
      name: data.name,
      symbol: data.symbol,
      multiplier: data.multiplier,
      minSendable: data.convertible.min,
      maxSendable: data.convertible.max,
      decimals: data.decimals,
      umaVersion: MAJOR_VERSION,
    };
  },
);
