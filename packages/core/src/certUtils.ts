import { X509Certificate } from "crypto";
import { InvalidInputError } from "./errors.js";

export const getX509Certificate = (cert: string) => {
  try {
    return new X509Certificate(cert);
  } catch (e) {
    throw new InvalidInputError("Cannot be parsed as a valid X509 certificate");
  }
};

export const getPublicKey = (cert: X509Certificate) => {
  const publicKey = cert.publicKey;
  if (publicKey.asymmetricKeyType !== "ec") {
    throw new InvalidInputError(
      "Invalid key type. Only EC keys are supported.",
    );
  }
  return publicKey.export({ type: "spki", format: "der" }).subarray(-65);
};
