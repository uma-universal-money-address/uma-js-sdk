import { z } from "zod";
import { KycStatus } from "./KycStatus.js";

export const PayerDataOptionsSchema = z.object({
  identifier: z.object({
    mandatory: z.boolean(),
  }),
  name: z.object({
    mandatory: z.boolean(),
  }),
  email: z.object({
    mandatory: z.boolean(),
  }),
  compliance: z.object({
    mandatory: z.boolean(),
  }),
});

export type PayerDataOptions = z.infer<typeof PayerDataOptionsSchema>;

const CompliancePayerDataSchema = z.object({
  /** Utxos is the list of UTXOs of the sender's channels that might be used to fund the payment. */
  utxos: z.optional(z.array(z.string())),
  /** NodePubKey is the public key of the sender's node if known. */
  nodePubKey: z.optional(z.string()),
  /** KycStatus indicates whether VASP1 has KYC information about the sender. */
  kycStatus: z.nativeEnum(KycStatus),
  /** EncryptedTravelRuleInfo is the travel rule information of the sender. This is encrypted with the receiver's public encryption key. */
  encryptedTravelRuleInfo: z.optional(z.string()),
  /**
   * An optional standardized format of the travel rule information (e.g. IVMS). Null indicates raw json or a custom format.
   * This field is formatted as <standardized format>@<version> (e.g. ivms@101.2023). Version is optional.
   */
  travelRuleFormat: z.optional(z.string()),
  /** Signature is the base64-encoded signature of sha256(ReceiverAddress|Nonce|Timestamp). */
  signature: z.string(),
  signatureNonce: z.string(),
  signatureTimestamp: z.number(),
  /** UtxoCallback is the URL that the receiver will call to send UTXOs of the channel that the receiver used to receive the payment once it completes. */
  utxoCallback: z.string(),
});

export type CompliancePayerData = z.infer<typeof CompliancePayerDataSchema>;

export const PayerDataSchema = z.object({
  name: z.optional(z.string()),
  email: z.optional(z.string()),
  identifier: z.string(),
  compliance: CompliancePayerDataSchema,
});

export type PayerData = z.infer<typeof PayerDataSchema>;
