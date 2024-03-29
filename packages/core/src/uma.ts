import crypto, { createHash } from "crypto";
import { encrypt, PublicKey } from "eciesjs";
import secp256k1 from "secp256k1";
import { type Currency } from "./Currency.js";
import { type KycStatus } from "./KycStatus.js";
import { type NonceValidator } from "./NonceValidator.js";
import {
  type CompliancePayerData,
  type PayerDataOptions,
} from "./PayerData.js";
import {
  encodeToUrl,
  getSignableLnurlpRequestPayload,
  getSignableLnurlpResponsePayload,
  getSignablePayRequestPayload,
  type LnurlComplianceResponse,
  type LnurlpRequest,
  type LnurlpResponse,
  type PayReqResponse,
  type PayRequest,
  type PubKeyResponse,
} from "./protocol.js";
import { type PublicKeyCache } from "./PublicKeyCache.js";
import type UmaInvoiceCreator from "./UmaInvoiceCreator.js";
import { isDomainLocalhost } from "./urlUtils.js";
import {
  isVersionSupported,
  selectLowerVersion,
  UmaProtocolVersion,
  UnsupportedVersionError,
} from "./version.js";

export const createSha256Hash = async (
  data: Uint8Array,
): Promise<Uint8Array> => {
  const buffer = createHash("sha256").update(data).digest();
  return new Uint8Array(buffer);
};

export type ParsedLnurlpRequest = {
  vaspDomain: string;
  umaVersion: string;
  signature: string;
  receiverAddress: string;
  nonce: string;
  timestamp: Date;
  isSubjectToTravelRule: boolean;
};

export function parseLnurlpRequest(url: URL) {
  const query = url.searchParams;
  const signature = query.get("signature");
  const vaspDomain = query.get("vaspDomain");
  const nonce = query.get("nonce");
  const isSubjectToTravelRule = query.get("isSubjectToTravelRule");
  const umaVersion = query.get("umaVersion");
  const timestamp = query.get("timestamp");

  const pathParts = url.pathname.split("/");
  if (
    pathParts.length != 4 ||
    pathParts[1] != ".well-known" ||
    pathParts[2] != "lnurlp"
  ) {
    throw new Error("invalid request path");
  }
  const receiverAddress = pathParts[3] + "@" + url.host;

  if (umaVersion && !isVersionSupported(umaVersion)) {
    throw new UnsupportedVersionError(umaVersion);
  }

  if (!vaspDomain || !signature || !nonce || !timestamp || !umaVersion) {
    throw new Error(
      "missing uma query parameters. vaspDomain, umaVersion, signature, nonce, and timestamp are required",
    );
  }

  const timestampUnixSeconds = parseInt(timestamp, 10);
  /* Date expects milliseconds: */
  const timestampAsTime = new Date(timestampUnixSeconds * 1000);

  return {
    vaspDomain,
    umaVersion,
    signature,
    receiverAddress,
    nonce,
    timestamp: timestampAsTime,
    isSubjectToTravelRule: Boolean(
      isSubjectToTravelRule?.toLowerCase() == "true",
    ),
  };
}

/* Checks if the given URL is a valid UMA request. */
export function isUmaLnurlpQuery(url: URL) {
  let query: null | ParsedLnurlpRequest = null;
  try {
    query = parseLnurlpRequest(url);
  } catch (e) {
    return e instanceof UnsupportedVersionError;
  }
  return query !== null;
}

export function generateNonce() {
  return String(crypto.webcrypto.getRandomValues(new Uint32Array(1)));
}

type FetchPublicKeyForVaspArgs = {
  cache: PublicKeyCache;
  vaspDomain: string;
};

/**
 * FetchPublicKeyForVasp fetches the public key for another VASP.
 * If the public key is not in the cache, it will be fetched from the VASP's domain.
 * The public key will be cached for future use.
 *
 * @param cache The PublicKeyCache cache to use. You can use the InMemoryPublicKeyCache class, or implement your own
 *     persistent cache with any storage type.
 * @param vaspDomain The domain of the VASP to fetch the public key for.
 * @returns
 */
export async function fetchPublicKeyForVasp({
  cache,
  vaspDomain,
}: FetchPublicKeyForVaspArgs): Promise<PubKeyResponse> {
  const publicKey = cache.fetchPublicKeyForVasp(vaspDomain);
  if (publicKey) {
    return Promise.resolve(publicKey);
  }

  let scheme = "https://";
  if (isDomainLocalhost(vaspDomain)) {
    scheme = "http://";
  }

  const response = await fetch(
    scheme + vaspDomain + "/.well-known/lnurlpubkey",
  );
  if (response.status !== 200) {
    return Promise.reject(new Error("invalid response from VASP"));
  }
  const pubKeyResponse = await response.json();
  cache.addPublicKeyForVasp(vaspDomain, pubKeyResponse);
  return pubKeyResponse;
}

type GetSignedLnurlpRequestUrlArgs = {
  isSubjectToTravelRule: boolean; // whether the sending VASP is a financial institution that requires travel rule information.
  receiverAddress: string; // the address of the receiver of the payment (i.e. $bob@vasp2).
  senderVaspDomain: string; // the domain of the VASP that is sending the payment. It will be used by the receiver to fetch the public keys of the sender.
  signingPrivateKey: Uint8Array; // the private key of the VASP that is sending the payment. This will be used to sign the request.
  umaVersionOverride?: string | undefined; // the version of the UMA protocol to use. If not specified, the latest version will be used.
};

/**
 * Creates a signed uma request URL.
 */
export async function getSignedLnurlpRequestUrl({
  isSubjectToTravelRule,
  receiverAddress,
  senderVaspDomain,
  signingPrivateKey,
  umaVersionOverride,
}: GetSignedLnurlpRequestUrlArgs) {
  const nonce = generateNonce();
  const umaVersion = umaVersionOverride ?? UmaProtocolVersion;
  const unsignedRequest: LnurlpRequest = {
    receiverAddress,
    isSubjectToTravelRule,
    vaspDomain: senderVaspDomain,
    timestamp: new Date(),
    nonce: String(nonce),
    signature: "",
    umaVersion,
  };

  const payload = getSignableLnurlpRequestPayload(unsignedRequest);

  const signature = await signPayload(payload, signingPrivateKey);
  unsignedRequest.signature = signature;
  return encodeToUrl(unsignedRequest);
}

function uint8ArrayToHexString(uint8Array: Uint8Array) {
  return Array.from(uint8Array)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function signPayload(payload: string, privateKeyBytes: Uint8Array) {
  const encoder = new TextEncoder();
  const encodedPayload = encoder.encode(payload);
  const hashedPayload = await createSha256Hash(encodedPayload);

  const { signature } = secp256k1.ecdsaSign(hashedPayload, privateKeyBytes);
  return uint8ArrayToHexString(secp256k1.signatureExport(signature));
}

export async function verifyUmaLnurlpQuerySignature(
  query: LnurlpRequest,
  otherVaspSigningPubKey: Uint8Array,
  nonceValidator: NonceValidator,
) {
  const isNonceValid = await nonceValidator.checkAndSaveNonce(
    query.nonce,
    query.timestamp.getTime() / 1000,
  );
  if (!isNonceValid) {
    throw new Error(
      "Invalid response nonce. Already seen this nonce or the timestamp is too old.",
    );
  }
  const payload = getSignableLnurlpRequestPayload(query);
  const encoder = new TextEncoder();
  const encodedPayload = encoder.encode(payload);
  const hashedPayload = await createSha256Hash(encodedPayload);
  return verifySignature(
    hashedPayload,
    query.signature,
    otherVaspSigningPubKey,
  );
}

function verifySignature(
  hashedPayload: Uint8Array,
  signature: string,
  otherVaspPubKey: Uint8Array,
) {
  const decodedSignature = secp256k1.signatureImport(
    Buffer.from(signature, "hex"),
  );

  const verified = secp256k1.ecdsaVerify(
    secp256k1.signatureNormalize(decodedSignature),
    hashedPayload,
    otherVaspPubKey,
  );
  return verified;
}

export function isValidUmaAddress(umaAddress: string) {
  if (!umaAddress.startsWith("$")) {
    return false;
  }

  const addressParts = umaAddress.split("@");
  if (addressParts.length != 2) {
    return false;
  }

  const userName = addressParts[0].slice(1);
  if (!userName.match(/^[a-z0-9-_\.\+]+$/i)) {
    return false;
  }

  if (userName.length > 64) {
    return false;
  }

  return true;
}

export function getVaspDomainFromUmaAddress(umaAddress: string) {
  if (!isValidUmaAddress(umaAddress)) {
    throw new Error("invalid uma address");
  }
  const addressParts = umaAddress.split("@");
  return addressParts[1];
}

type GetPayRequestArgs = {
  /** The public key of the receiver that will be used to encrypt the travel rule information. */
  receiverEncryptionPubKey: Uint8Array;
  /** The private key of the VASP that is sending the payment. This will be used to sign the request. */
  sendingVaspPrivateKey: Uint8Array;
  /** The code of the currency that the receiver will receive for this payment. */
  currencyCode: string;
  /** The amount of the payment in the smallest unit of the specified currency (i.e. cents for USD). */
  amount: number;
  /** The identifier of the sender. For example, $alice@vasp1.com */
  payerIdentifier: string;
  /** The name of the sender (optional). */
  payerName?: string | undefined;
  /** The email of the sender (optional). */
  payerEmail?: string | undefined;
  /** The travel rule information. This will be encrypted before sending to the receiver. */
  trInfo?: string | undefined;
  /**
   * An optional standardized format of the travel rule information (e.g. IVMS). Null indicates raw json or a custom format.
   * This field is formatted as <standardized format>@<version> (e.g. ivms@101.2023). Version is optional.
   */
  travelRuleFormat?: string | undefined;
  /** Whether the sender is a KYC'd customer of the sending VASP. */
  payerKycStatus: KycStatus;
  /** The list of UTXOs of the sender's channels that might be used to fund the payment. */
  payerUtxos?: string[] | undefined;
  /**
   * If known, the public key of the sender's node. If supported by the receiving VASP's compliance provider,
   * this will be used to pre-screen the sender's UTXOs for compliance purposes.
   */
  payerNodePubKey?: string | undefined;
  /**
   * The URL that the receiver will call to send UTXOs of the channel that the receiver used to receive the
   * payment once it completes.
   */
  utxoCallback?: string | undefined;
};

/**
 * Creates a signed uma pay request.
 */
export async function getPayRequest({
  amount,
  currencyCode,
  payerEmail,
  payerIdentifier,
  payerKycStatus,
  payerName,
  payerNodePubKey,
  payerUtxos,
  receiverEncryptionPubKey,
  sendingVaspPrivateKey,
  trInfo,
  travelRuleFormat,
  utxoCallback,
}: GetPayRequestArgs): Promise<PayRequest> {
  const complianceData = await getSignedCompliancePayerData(
    receiverEncryptionPubKey,
    sendingVaspPrivateKey,
    payerIdentifier,
    trInfo,
    travelRuleFormat,
    payerKycStatus,
    payerUtxos,
    payerNodePubKey,
    utxoCallback,
  );

  return {
    currency: currencyCode,
    amount,
    payerData: {
      name: payerName,
      email: payerEmail,
      identifier: payerIdentifier,
      compliance: complianceData,
    },
  };
}

async function getSignedCompliancePayerData(
  receiverEncryptionPubKeyBytes: Uint8Array,
  sendingVaspPrivateKeyBytes: Uint8Array,
  payerIdentifier: string,
  trInfo: string | undefined,
  travelRuleFormat: string | undefined,
  payerKycStatus: KycStatus,
  payerUtxos: string[] | undefined,
  payerNodePubKey: string | undefined,
  utxoCallback: string | undefined,
): Promise<CompliancePayerData> {
  const signatureTimestamp = Math.floor(Date.now() / 1000);
  const signatureNonce = generateNonce();

  let encryptedTravelRuleInfo: string | undefined;
  if (trInfo) {
    encryptedTravelRuleInfo = encryptTrInfo(
      trInfo,
      receiverEncryptionPubKeyBytes,
    );
  }

  const payloadString = `${payerIdentifier}|${signatureNonce}|${signatureTimestamp}`;
  const signature = await signPayload(
    payloadString,
    sendingVaspPrivateKeyBytes,
  );
  return {
    encryptedTravelRuleInfo,
    travelRuleFormat,
    kycStatus: payerKycStatus,
    utxos: payerUtxos,
    nodePubKey: payerNodePubKey,
    utxoCallback,
    signatureNonce,
    signatureTimestamp,
    signature,
  };
}

function encryptTrInfo(
  trInfo: string,
  receiverEncryptionPubKey: Uint8Array,
): string {
  const pubKeyBuffer = Buffer.from(receiverEncryptionPubKey.buffer);
  const pubKey = new PublicKey(pubKeyBuffer);
  const trInfoBuffer = Buffer.from(trInfo);
  const encryptedTrInfoBytes = encrypt(pubKey.toHex(), trInfoBuffer);
  const encryptedTrInfoHex = uint8ArrayToHexString(encryptedTrInfoBytes);
  return encryptedTrInfoHex;
}

type PayRequestResponseArgs = {
  /** The uma pay request. */
  query: PayRequest;
  /**
   * Milli-satoshis per the smallest unit of the specified currency. This rate is committed to by the receiving
   * VASP until the invoice expires.
   */
  conversionRate: number;
  /** The code of the currency that the receiver will receive for this payment. */
  currencyCode: string;
  /**
   * Number of digits after the decimal point for the receiving currency. For example, in USD, by
   * convention, there are 2 digits for cents - $5.95. In this case, `decimals` would be 2. This should align with
   * the currency's `decimals` field in the LNURLP response. It is included here for convenience. See
   * [UMAD-04](https://github.com/uma-universal-money-address/protocol/blob/main/umad-04-lnurlp-response.md) for
   * details, edge cases, and examples.
   */
  currencyDecimals: number;
  /** UmaInvoiceCreator that calls createUmaInvoice using your provider. */
  invoiceCreator: UmaInvoiceCreator;
  /**
   * The metadata that will be added to the invoice's metadata hash field. Note that this should not include the
   * extra payer data. That will be appended automatically.
   */
  metadata: string;
  /** The list of UTXOs of the receiver's channels that might be used to fund the payment. */
  receiverChannelUtxos: string[];
  /**
   * The fees charged (in millisats) by the receiving VASP to convert to the target currency. This is separate from
   * the conversion rate.
   */
  receiverFeesMillisats: number;
  /**
   * If known, the public key of the receiver's node. If supported by the sending VASP's compliance provider, this
   * will be used to pre-screen the receiver's UTXOs for compliance purposes.
   */
  receiverNodePubKey?: string | undefined;
  /**
   * The URL that the receiving VASP will call to send UTXOs of the channel that the receiver used to receive the
   * payment once it completes.
   */
  utxoCallback?: string | undefined;
};

export async function getPayReqResponse({
  conversionRate,
  currencyCode,
  currencyDecimals,
  invoiceCreator,
  metadata,
  query,
  receiverChannelUtxos,
  receiverFeesMillisats,
  receiverNodePubKey,
  utxoCallback,
}: PayRequestResponseArgs): Promise<PayReqResponse> {
  const msatsAmount = Math.round(
    query.amount * conversionRate + receiverFeesMillisats,
  );
  const encodedPayerData = JSON.stringify(query.payerData);
  const encodedInvoice = await invoiceCreator.createUmaInvoice(
    msatsAmount,
    metadata + "{" + encodedPayerData + "}",
  );
  if (!encodedInvoice) {
    throw new Error("failed to create invoice");
  }

  return {
    pr: encodedInvoice,
    routes: [],
    compliance: {
      utxos: receiverChannelUtxos,
      nodePubKey: receiverNodePubKey,
      utxoCallback,
    },
    paymentInfo: {
      currencyCode,
      decimals: currencyDecimals,
      multiplier: conversionRate,
      exchangeFeesMillisatoshi: receiverFeesMillisats,
    },
  };
}

type GetSignedLnurlpResponseArgs = {
  request: LnurlpRequest;
  privateKeyBytes: Uint8Array;
  requiresTravelRuleInfo: boolean;
  callback: string;
  encodedMetadata: string;
  minSendableSats: number;
  maxSendableSats: number;
  payerDataOptions: PayerDataOptions;
  currencyOptions: Currency[];
  receiverKycStatus: KycStatus;
};

export async function getLnurlpResponse({
  request,
  privateKeyBytes,
  requiresTravelRuleInfo,
  callback,
  encodedMetadata,
  minSendableSats,
  maxSendableSats,
  payerDataOptions,
  currencyOptions,
  receiverKycStatus,
}: GetSignedLnurlpResponseArgs): Promise<LnurlpResponse> {
  const umaVersion = selectLowerVersion(request.umaVersion, UmaProtocolVersion);
  const complianceResponse = await getSignedLnurlpComplianceResponse({
    query: request,
    privateKeyBytes,
    isSubjectToTravelRule: requiresTravelRuleInfo,
    receiverKycStatus,
  });
  return {
    tag: "payRequest",
    callback,
    minSendable: minSendableSats * 1000,
    maxSendable: maxSendableSats * 1000,
    metadata: encodedMetadata,
    currencies: currencyOptions,
    payerData: payerDataOptions,
    compliance: complianceResponse,
    umaVersion,
  };
}

type GetSignedLnurlpComplianceResponseArgs = {
  query: LnurlpRequest;
  privateKeyBytes: Uint8Array;
  isSubjectToTravelRule: boolean;
  receiverKycStatus: KycStatus;
};

async function getSignedLnurlpComplianceResponse({
  query,
  privateKeyBytes,
  isSubjectToTravelRule,
  receiverKycStatus,
}: GetSignedLnurlpComplianceResponseArgs): Promise<LnurlComplianceResponse> {
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = generateNonce();
  const payloadString = `${query.receiverAddress}|${nonce}|${timestamp}`;
  const signature = await signPayload(payloadString, privateKeyBytes);
  return {
    kycStatus: receiverKycStatus,
    signature,
    signatureNonce: nonce,
    signatureTimestamp: timestamp,
    isSubjectToTravelRule,
    receiverIdentifier: query.receiverAddress,
  };
}

export async function verifyUmaLnurlpResponseSignature(
  response: LnurlpResponse,
  otherVaspSigningPubKey: Uint8Array,
  nonceValidator: NonceValidator,
) {
  const isNonceValid = await nonceValidator.checkAndSaveNonce(
    response.compliance.signatureNonce,
    response.compliance.signatureTimestamp,
  );
  if (!isNonceValid) {
    throw new Error(
      "Invalid response nonce. Already seen this nonce or the timestamp is too old.",
    );
  }
  const encoder = new TextEncoder();
  const encodedResponse = encoder.encode(
    getSignableLnurlpResponsePayload(response),
  );
  const hashedPayload = await createSha256Hash(encodedResponse);
  return verifySignature(
    hashedPayload,
    response.compliance.signature,
    otherVaspSigningPubKey,
  );
}

export async function verifyPayReqSignature(
  query: PayRequest,
  otherVaspPubKey: Uint8Array,
  nonceValidator: NonceValidator,
) {
  const compliance = query.payerData.compliance;
  const isNonceValid = await nonceValidator.checkAndSaveNonce(
    compliance.signatureNonce,
    compliance.signatureTimestamp,
  );
  if (!isNonceValid) {
    throw new Error(
      "Invalid response nonce. Already seen this nonce or the timestamp is too old.",
    );
  }
  const encoder = new TextEncoder();
  const encodedQuery = encoder.encode(getSignablePayRequestPayload(query));
  const hashedPayload = await createSha256Hash(encodedQuery);
  return verifySignature(hashedPayload, compliance.signature, otherVaspPubKey);
}
