import { z } from "zod";

export const SettlementAssetSchema = z.object({
  /**
   * The identifier of the asset. For Spark, this is the token public key.
   * For Lightning/BTC, this should be "BTC".
   */
  identifier: z.string(),
  /**
   * Estimated conversion rates from this asset to the currencies supported by
   * the receiver. The key is the currency code and the value is the multiplier
   * (how many of the smallest unit of this asset equals one unit of the currency).
   */
  multipliers: z.record(z.string(), z.number()),
});

export type SettlementAsset = z.infer<typeof SettlementAssetSchema>;

export const SettlementOptionSchema = z.object({
  /** The name of the settlement layer (e.g., "spark", "ln"). */
  settlementLayer: z.string(),
  /** List of accepted assets on this settlement layer with their conversion rates. */
  assets: z.array(SettlementAssetSchema),
});

export type SettlementOption = z.infer<typeof SettlementOptionSchema>;

export const SettlementInfoSchema = z.object({
  /** The settlement layer chosen by the sender (e.g., "ln", "spark"). */
  layer: z.string(),
  /** The identifier of the settlement asset chosen by the sender. */
  assetIdentifier: z.string(),
});

export type SettlementInfo = z.infer<typeof SettlementInfoSchema>;
