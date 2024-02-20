import { z } from "zod";
import { optionalIgnoringNull } from "./zodUtils.js";

export const CompliancePayeeDataSchema = z.object({
  /** nodePubKey is the public key of the receiver's node if known. */
  nodePubKey: optionalIgnoringNull(z.string()),
  /** utxos is a list of UTXOs of channels over which the receiver will likely receive the payment. */
  utxos: z.array(z.string()),
  /** utxoCallback is the URL that the sender VASP will call to send UTXOs of the channel that the sender used to send the payment once it completes. */
  utxoCallback: optionalIgnoringNull(z.string()),
});

export type CompliancePayeeData = z.infer<typeof CompliancePayeeDataSchema>;

export const PayeeDataSchema = z
  .object({
    name: optionalIgnoringNull(z.string()),
    email: optionalIgnoringNull(z.string()),
    identifier: optionalIgnoringNull(z.string()),
    compliance: optionalIgnoringNull(CompliancePayeeDataSchema),
  })
  .passthrough();

export type PayeeData = z.infer<typeof PayeeDataSchema>;
