import { z } from "zod";

/** UtxoWithAmount is a pair of utxo and amount transferred over that corresponding channel. It can be used to register payment for KYT. */
export const UtxoWithAmountSchema = z.object({
  /** Utxo The utxo of the channel over which the payment went through in the format of <transaction_hash>:<output_index>. */
  utxo: z.string(),
  /** Amount The amount of funds transferred in the payment in mSats. */
  amount: z.number(),
});

export type UtxoWithAmount = z.infer<typeof UtxoWithAmountSchema>;

/** PostTransactionCallback is sent between VASPs after the payment is complete. */
export const PostTransactionCallbackSchema = z.object({
  /** Utxos is a list of utxo/amounts corresponding to the VASPs channels. */
  utxos: z.array(UtxoWithAmountSchema),
  /** VaspDomain is the domain of the VASP that is sending the callback. It will be used by the VASP to fetch the public keys of its counterparty. */
  vaspDomain: z.string(),
  /** Signature is the base64-encoded signature of sha256(Nonce|Timestamp). */
  signature: z.string(),
  /** Nonce is a random string that is used to prevent replay attacks. */
  signatureNonce: z.string(),
  /** Timestamp is the unix timestamp of when the request was sent. Used in the signature. */
  signatureTimestamp: z.number(),
});

export type PostTransactionCallback = z.infer<
  typeof PostTransactionCallbackSchema
>;

export function parsePostTransactionCallback(
  jsonStr: string,
): PostTransactionCallback {
  const parsed = JSON.parse(jsonStr);
  let validated: PostTransactionCallback;
  try {
    validated = PostTransactionCallbackSchema.parse(parsed);
  } catch (e) {
    throw new Error("invalid post transaction callback", { cause: e });
  }
  return validated;
}

export function getSignablePostTransactionCallback(
  c: PostTransactionCallback,
): string {
  return [c.signatureNonce, c.signatureTimestamp.toString()].join("|");
}
