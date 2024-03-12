import { z } from "zod";
import { optionalIgnoringNull } from "../zodUtils.js";
import { KycStatus } from "./KycStatus.js";

const CompliancePayerDataSchema = z.object({
  /** Utxos is the list of UTXOs of the sender's channels that might be used to fund the payment. */
  utxos: optionalIgnoringNull(z.array(z.string())),
  /** NodePubKey is the public key of the sender's node if known. */
  nodePubKey: optionalIgnoringNull(z.string()),
  /** KycStatus indicates whether VASP1 has KYC information about the sender. */
  kycStatus: z.nativeEnum(KycStatus),
  /** EncryptedTravelRuleInfo is the travel rule information of the sender. This is encrypted with the receiver's public encryption key. */
  encryptedTravelRuleInfo: optionalIgnoringNull(z.string()),
  /**
   * An optional standardized format of the travel rule information (e.g. IVMS). Null indicates raw json or a custom format.
   * This field is formatted as <standardized format>@<version> (e.g. ivms@101.2023). Version is optional.
   */
  travelRuleFormat: optionalIgnoringNull(z.string()),
  /** Signature is the base64-encoded signature of sha256(ReceiverAddress|Nonce|Timestamp). */
  signature: z.string(),
  signatureNonce: z.string(),
  signatureTimestamp: z.number(),
  /** UtxoCallback is the URL that the receiver will call to send UTXOs of the channel that the receiver used to receive the payment once it completes. */
  utxoCallback: optionalIgnoringNull(z.string()),
});

export type CompliancePayerData = z.infer<typeof CompliancePayerDataSchema>;

export const PayerDataSchema = z
  .object({
    name: optionalIgnoringNull(z.string()),
    email: optionalIgnoringNull(z.string()),
    identifier: optionalIgnoringNull(z.string()),
    compliance: optionalIgnoringNull(CompliancePayerDataSchema),
  })
  .passthrough();

export type PayerData = z.infer<typeof PayerDataSchema>;
