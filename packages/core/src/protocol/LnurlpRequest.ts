import { dateToUnixSeconds } from "../datetimeUtils.js";
import { UmaError } from "../errors.js";
import { ErrorCode } from "../generated/errorCodes.js";
import { signPayload } from "../signingUtils.js";
import { isDomainLocalhost } from "../urlUtils.js";
import { type BackingSignature } from "./BackingSignature.js";

/** LnurlpRequest is the first request in the UMA protocol. It is sent by the VASP that is sending the payment to find out information about the receiver. */
export type LnurlpRequest = {
  /** ReceiverAddress is the address of the user at VASP2 that is receiving the payment. */
  receiverAddress: string;
  /** Nonce is a random string that is used to prevent replay attacks. */
  nonce?: string | undefined;
  /** Signature is the base64-encoded signature of sha256(ReceiverAddress|Nonce|Timestamp). */
  signature?: string | undefined;
  /** IsSubjectToTravelRule indicates VASP1 is a financial institution that requires travel rule information. */
  isSubjectToTravelRule?: boolean | undefined;
  /** VaspDomain is the domain of the VASP that is sending the payment. It will be used by VASP2 to fetch the public keys of VASP1. */
  vaspDomain?: string | undefined;
  /** Timestamp is the unix timestamp of when the request was sent. Used in the signature. */
  timestamp?: Date | undefined;
  /**
   * The version of the UMA protocol that VASP2 has chosen for this transaction based on its own support and VASP1's specified preference in the LnurlpRequest.
   * For the version negotiation flow, see https://static.swimlanes.io/87f5d188e080cb8e0494e46f80f2ae74.png
   */
  umaVersion?: string | undefined;
  /** A list of backing signatures from VASPs that can attest to the authenticity of the message. */
  backingSignatures?: BackingSignature[] | undefined;
};

export function isLnurlpRequestForUma(
  request: LnurlpRequest,
): request is LnurlpRequest & {
  receiverAddress: string;
  nonce: string;
  signature: string;
  vaspDomain: string;
  timestamp: Date;
  umaVersion: string;
} {
  return (
    request.nonce !== undefined &&
    request.signature !== undefined &&
    request.vaspDomain !== undefined &&
    request.timestamp !== undefined &&
    request.umaVersion !== undefined
  );
}

export function encodeToUrl(q: LnurlpRequest): URL {
  const receiverAddressParts = q.receiverAddress.split("@");
  if (receiverAddressParts.length !== 2) {
    throw new UmaError("invalid receiver address", ErrorCode.INTERNAL_ERROR);
  }
  const scheme = isDomainLocalhost(receiverAddressParts[1]) ? "http" : "https";
  const lnurlpUrl = new URL(
    `${scheme}://${receiverAddressParts[1]}/.well-known/lnurlp/${receiverAddressParts[0]}`,
  );
  if (isLnurlpRequestForUma(q)) {
    const queryParams = lnurlpUrl.searchParams;
    queryParams.set("signature", q.signature!);
    queryParams.set("vaspDomain", q.vaspDomain!);
    queryParams.set("nonce", q.nonce!);
    queryParams.set(
      "isSubjectToTravelRule",
      q.isSubjectToTravelRule!.toString(),
    );
    queryParams.set("timestamp", String(dateToUnixSeconds(q.timestamp!)));
    queryParams.set("umaVersion", q.umaVersion!);
    if (q.backingSignatures) {
      queryParams.set(
        "backingSignatures",
        q.backingSignatures
          .map((sig) => `${sig.domain}:${sig.signature}`)
          .join(","),
      );
    }
    lnurlpUrl.search = queryParams.toString();
  }
  return lnurlpUrl;
}

export function getSignableLnurlpRequestPayload(q: LnurlpRequest): string {
  if (!q.nonce || !q.timestamp) {
    throw new UmaError(
      "nonce and timestamp are required for signing",
      ErrorCode.MISSING_REQUIRED_UMA_PARAMETERS,
    );
  }
  return [
    q.receiverAddress,
    q.nonce,
    String(dateToUnixSeconds(q.timestamp)),
  ].join("|");
}

/**
 * Adds a backing signature to the request using the provided private key and domain.
 * The signature is created by signing the request's signable payload.
 *
 * @param signingPrivateKey The private key to sign with as a Buffer
 * @param domain The domain associated with the signature
 * @returns A new LnurlpRequest with the additional backing signature
 */
export async function appendBackingSignature(
  request: LnurlpRequest,
  signingPrivateKey: Uint8Array,
  domain: string,
): Promise<LnurlpRequest> {
  if (!isLnurlpRequestForUma(request)) {
    return request;
  }

  const signablePayload = getSignableLnurlpRequestPayload(request);
  const signature = await signPayload(signablePayload, signingPrivateKey);

  const newBackingSignatures = [
    ...(request.backingSignatures || []),
    {
      domain,
      signature: signature,
    },
  ];

  return {
    ...request,
    backingSignatures: newBackingSignatures,
  };
}
