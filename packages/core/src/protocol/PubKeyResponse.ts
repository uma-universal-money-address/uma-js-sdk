import * as crypto from "crypto";
import { getPublicKey } from "../certUtils.js";
import { UmaError } from "../errors.js";
import { ErrorCode } from "../generated/errorCodes.js";

type X509Certificate = crypto.X509Certificate;

/** PubKeyResponse is sent from a VASP to another VASP to provide its public keys. It is the response to GET requests at `/.well-known/lnurlpubkey`. */
export class PubKeyResponse {
  constructor(
    /**
     * SigningCertChain is a PEM encoded X.509 certificate chain. Certificates are ordered from
     * leaf to root. The signing public key can be extracted from the leaf certificate and is used
     * to verify signatures from a VASP.
     */
    public readonly signingCertChain?: X509Certificate[] | undefined,
    /**
     * EncryptionCertChain is a PEM encoded X.509 certificate chain. Certificates are ordered from
     * leaf to root. The encryption public key can be extracted from the leaf certificate and is used
     * to verify signatures from a VASP.
     */
    public readonly encryptionCertChain?: X509Certificate[] | undefined,
    /** SigningPubKey is used to verify signatures from a VASP. */
    public readonly signingPubKey?: string | undefined,
    /** EncryptionPubKey is used to encrypt TR info sent to a VASP. */
    public readonly encryptionPubKey?: string | undefined,
    /** [Optional] Seconds since epoch at which these pub keys must be refreshed. They can be safely cached until this expiration (or forever if null). */
    public readonly expirationTimestamp?: number | undefined,
  ) {}

  getSigningPubKey(): Uint8Array {
    if (this.signingCertChain) {
      return getPublicKey(this.signingCertChain);
    } else if (this.signingPubKey) {
      return Buffer.from(this.signingPubKey, "hex");
    } else {
      throw new UmaError(
        "No signing public key",
        ErrorCode.INVALID_PUBKEY_FORMAT,
      );
    }
  }

  getEncryptionPubKey(): Uint8Array {
    if (this.encryptionCertChain) {
      return getPublicKey(this.encryptionCertChain);
    } else if (this.encryptionPubKey) {
      return Buffer.from(this.encryptionPubKey, "hex");
    } else {
      throw new UmaError(
        "No encryption public key",
        ErrorCode.INVALID_PUBKEY_FORMAT,
      );
    }
  }

  toJsonString(): string {
    return JSON.stringify({
      signingCertChain: this.signingCertChain?.map((cert) =>
        cert.raw.toString("hex"),
      ),
      encryptionCertChain: this.signingCertChain?.map((cert) =>
        cert.raw.toString("hex"),
      ),
      signingPubKey: this.signingPubKey,
      encryptionPubKey: this.encryptionPubKey,
      expirationTimestamp: this.expirationTimestamp,
    });
  }

  toJSON(): string {
    return this.toJsonString();
  }

  static fromJson(jsonStr: string): PubKeyResponse {
    const jsonObject = JSON.parse(jsonStr);

    if (!crypto.X509Certificate) {
      throw new UmaError(
        "X509Certificate is only available in Node.js",
        ErrorCode.INTERNAL_ERROR,
      );
    }

    return new PubKeyResponse(
      jsonObject.signingCertChain?.map(
        (cert: string) => new crypto.X509Certificate(Buffer.from(cert, "hex")),
      ),
      jsonObject.encryptionCertChain?.map(
        (cert: string) => new crypto.X509Certificate(Buffer.from(cert, "hex")),
      ),
      jsonObject.signingPubKey,
      jsonObject.encryptionPubKey,
      jsonObject.expirationTimestamp,
    );
  }
}
