import * as crypto from "crypto";
import { InvalidInputError, UmaError } from "./errors.js";
import { ErrorCode } from "./generated/errorCodes.js";

type X509Certificate = crypto.X509Certificate;

export const getX509CertChain = (certChain: string) => {
  if (!crypto.X509Certificate) {
    throw new UmaError(
      "X509Certificate is only available in Node.js",
      ErrorCode.INTERNAL_ERROR,
    );
  }

  const certs = certChain
    .split("-----END CERTIFICATE-----")
    .filter((cert) => cert.trim().length > 0)
    .map((cert) => `${cert.trim()}\n-----END CERTIFICATE-----\n`);
  try {
    return certs.map((cert) => new crypto.X509Certificate(cert));
  } catch (e) {
    throw new InvalidInputError(
      "Cannot be parsed as a valid X509 certificate",
      ErrorCode.CERT_CHAIN_INVALID,
    );
  }
};

export const getPublicKey = (certs: X509Certificate[]) => {
  const publicKey = certs[0].publicKey;
  if (publicKey.asymmetricKeyType !== "ec") {
    throw new InvalidInputError(
      "Invalid key type. Only EC keys are supported.",
      ErrorCode.CERT_CHAIN_INVALID,
    );
  }
  // The last 65 bytes of a ASN.1/DER encoded X.509/SPKI key are the uncompressed public key
  return publicKey.export({ type: "spki", format: "der" }).subarray(-65);
};
