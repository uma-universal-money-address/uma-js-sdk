import { z } from "zod";

/**
 * A signature by a backing VASP that can attest to the authenticity of the message,
 * along with its associated domain.
 */
export const BackingSignatureSchema = z.object({
  /**
   * Domain is the domain of the VASP that produced the signature. Public keys for this VASP will be fetched from
   * the domain at /.well-known/lnurlpubkey and used to verify the signature.
   */
  domain: z.string(),

  /**
   * Signature is the signature of the payload.
   */
  signature: z.string(),
});

export type BackingSignature = z.infer<typeof BackingSignatureSchema>;
