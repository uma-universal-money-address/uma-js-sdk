import secp256k1 from "secp256k1";
import { createSha256Hash } from "./createHash.js";

export async function signPayload(
  payload: string,
  privateKeyBytes: Uint8Array,
) {
  const encoder = new TextEncoder();
  const encodedPayload = encoder.encode(payload);
  const hashedPayload = await createSha256Hash(encodedPayload);

  const { signature } = secp256k1.ecdsaSign(hashedPayload, privateKeyBytes);
  return uint8ArrayToHexString(secp256k1.signatureExport(signature));
}

export async function signBytePayload(
  payload: Uint8Array,
  privateKeyBytes: Uint8Array,
) {
  const hashedPayload = await createSha256Hash(payload);

  const { signature } = secp256k1.ecdsaSign(hashedPayload, privateKeyBytes);
  return secp256k1.signatureExport(signature);
}

export function uint8ArrayToHexString(uint8Array: Uint8Array) {
  return Array.from(uint8Array)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
