import { z } from "zod";
import { optionalIgnoringNull } from "../zodUtils.js";
import { BackingSignatureSchema } from "./BackingSignature.js";
import { CounterPartyDataKeys } from "./CounterPartyDataKeys.js";

export const CompliancePayeeDataSchema = z.object({
  /** nodePubKey is the public key of the receiver's node if known. */
  nodePubKey: optionalIgnoringNull(z.string()),
  /** utxos is a list of UTXOs of channels over which the receiver will likely receive the payment. */
  utxos: z.array(z.string()),
  /** utxoCallback is the URL that the sender VASP will call to send UTXOs of the channel that the sender used to send the payment once it completes. */
  utxoCallback: optionalIgnoringNull(z.string()),
  /**
   * Signature is the base64-encoded signature of sha256(SenderAddress|ReceiverAddress|Nonce|Timestamp).
   *
   * Note: This field is optional for UMA v0.X backwards-compatibility. It is required for UMA v1.X.
   */
  signature: optionalIgnoringNull(z.string()),
  /**
   * Nonce is a random string that is used to prevent replay attacks.
   *
   * Note: This field is optional for UMA v0.X backwards-compatibility. It is required for UMA v1.X.
   */
  signatureNonce: optionalIgnoringNull(z.string()),
  /**
   * Timestamp is the unix timestamp (seconds since epoch) of when the request was sent. Used in the signature.
   *
   * Note: This field is optional for UMA v0.X backwards-compatibility. It is required for UMA v1.X.
   */
  signatureTimestamp: optionalIgnoringNull(z.number()),
  /** BackingSignatures is a list of backing signatures from VASPs that can attest to the authenticity of the message. */
  backingSignatures: optionalIgnoringNull(z.array(BackingSignatureSchema)),
});

export type CompliancePayeeData = z.infer<typeof CompliancePayeeDataSchema>;

export const PayeeDataSchema = z
  .object({
    [CounterPartyDataKeys.NAME]: optionalIgnoringNull(z.string()),
    [CounterPartyDataKeys.EMAIL]: optionalIgnoringNull(z.string()),
    [CounterPartyDataKeys.IDENTIFIER]: optionalIgnoringNull(z.string()),
    [CounterPartyDataKeys.COMPLIANCE]: optionalIgnoringNull(
      CompliancePayeeDataSchema,
    ),
  })
  .passthrough();

export type PayeeData = z.infer<typeof PayeeDataSchema>;
