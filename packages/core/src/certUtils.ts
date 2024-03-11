import { X509Certificate } from "crypto";
import { InvalidInputError } from "./errors.js";

export const getX509CertChain = (certChain: string) => {
  const certs = certChain
    .split("-----END CERTIFICATE-----")
    .filter((cert) => cert.trim().length > 0)
    .map((cert) => `${cert.trim()}\n-----END CERTIFICATE-----\n`);
  try {
    return certs.map((cert) => new X509Certificate(cert));
  } catch (e) {
    throw new InvalidInputError("Cannot be parsed as a valid X509 certificate");
  }
};

export const getPublicKey = (certs: X509Certificate[]) => {
  const publicKey = certs[0].publicKey;
  if (publicKey.asymmetricKeyType !== "ec") {
    throw new InvalidInputError(
      "Invalid key type. Only EC keys are supported.",
    );
  }
  // The last 65 bytes of a ASN.1/DER encoded X.509/SPKI key are the uncompressed public key
  return publicKey.export({ type: "spki", format: "der" }).subarray(-65);
};
