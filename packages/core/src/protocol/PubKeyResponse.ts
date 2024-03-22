import { getPublicKey, getX509CertChain } from "../certUtils.js";

/** PubKeyResponse is sent from a VASP to another VASP to provide its public keys. It is the response to GET requests at `/.well-known/lnurlpubkey`. */
export type PubKeyResponse = {
  /**
   * SigningCertChain is a PEM encoded X.509 certificate chain. Certificates are ordered from
   * leaf to root. The signing public key can be extracted from the leaf certificate and is used
   * to verify signatures from a VASP.
   */
  signingCertChain?: string;
  /**
   * EncryptionCertChain is a PEM encoded X.509 certificate chain. Certificates are ordered from
   * leaf to root. The encryption public key can be extracted from the leaf certificate and is used
   * to verify signatures from a VASP.
   */
  encryptionCertChain?: string;
  /** SigningPubKey is used to verify signatures from a VASP. */
  signingPubKey?: string;
  /** EncryptionPubKey is used to encrypt TR info sent to a VASP. */
  encryptionPubKey?: string;
  /** [Optional] Seconds since epoch at which these pub keys must be refreshed. They can be safely cached until this expiration (or forever if null). */
  expirationTimestamp?: number;
};

export function getSigningPubKey(r: PubKeyResponse): Uint8Array {
  if (r.signingCertChain) {
    const certificates = getX509CertChain(r.signingCertChain);
    return getPublicKey(certificates);
  } else if (r.signingPubKey) {
    return Buffer.from(r.signingPubKey, "hex");
  } else {
    throw new Error("No signing public key");
  }
}

export function getEncryptionPubKey(r: PubKeyResponse): Uint8Array {
  if (r.encryptionCertChain) {
    const certificates = getX509CertChain(r.encryptionCertChain);
    return getPublicKey(certificates);
  } else if (r.encryptionPubKey) {
    return Buffer.from(r.encryptionPubKey, "hex");
  } else {
    throw new Error("No encryption public key");
  }
}
