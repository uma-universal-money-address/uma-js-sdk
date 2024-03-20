import crypto, { createHash } from "crypto";
import { encrypt, PublicKey } from "eciesjs";
import secp256k1 from "secp256k1";
import { getPublicKey, getX509CertChain } from "./certUtils.js";
import { InvalidInputError } from "./errors.js";
import { type NonceValidator } from "./NonceValidator.js";
import { type CounterPartyDataOptions } from "./protocol/CounterPartyData.js";
import { type Currency } from "./protocol/Currency.js";
import { type KycStatus } from "./protocol/KycStatus.js";
import {
  encodeToUrl,
  getSignableLnurlpRequestPayload,
  isLnurlpRequestForUma,
  type LnurlpRequest,
} from "./protocol/LnurlpRequest.js";
import {
  LnurlpResponse,
  type LnurlComplianceResponse,
} from "./protocol/LnurlpResponse.js";
import {
  type CompliancePayeeData,
  type PayeeData,
} from "./protocol/PayeeData.js";
import { type CompliancePayerData } from "./protocol/PayerData.js";
import { PayReqResponse } from "./protocol/PayReqResponse.js";
import { PayRequest } from "./protocol/PayRequest.js";
import {
  getSignablePostTransactionCallback,
  type PostTransactionCallback,
  type UtxoWithAmount,
} from "./protocol/PostTransactionCallback.js";
import {
  getSigningPubKey,
  type PubKeyResponse,
} from "./protocol/PubKeyResponse.js";
import { type PublicKeyCache } from "./PublicKeyCache.js";
import type UmaInvoiceCreator from "./UmaInvoiceCreator.js";
import { isDomainLocalhost } from "./urlUtils.js";
import {
  getMajorVersion,
  isVersionSupported,
  MAJOR_VERSION,
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

export function parseLnurlpRequest(url: URL): LnurlpRequest {
  const query = url.searchParams;
  const signature = query.get("signature") ?? undefined;
  const vaspDomain = query.get("vaspDomain") ?? undefined;
  const nonce = query.get("nonce") ?? undefined;
  const isSubjectToTravelRule = query.get("isSubjectToTravelRule") ?? undefined;
  const umaVersion = query.get("umaVersion") ?? undefined;
  const timestamp = query.get("timestamp") ?? undefined;
  const numUmaParamsIncluded = [
    vaspDomain,
    signature,
    nonce,
    timestamp,
    umaVersion,
  ].filter((param) => param !== undefined).length;

  if (numUmaParamsIncluded < 5 && numUmaParamsIncluded > 0) {
    throw new Error(
      "Invalid UMA request. All UMA parameters must be included if any are included.",
    );
  }

  let timestampAsTime: Date | undefined;
  if (timestamp) {
    const timestampUnixSeconds = parseInt(timestamp, 10);
    /* Date expects milliseconds: */
    timestampAsTime = new Date(timestampUnixSeconds * 1000);
  }

  const pathParts = url.pathname.split("/");
  if (
    pathParts.length != 4 ||
    pathParts[1] != ".well-known" ||
    pathParts[2] != "lnurlp"
  ) {
    throw new Error("invalid uma request path");
  }
  const receiverAddress = pathParts[3] + "@" + url.host;

  if (umaVersion !== undefined && !isVersionSupported(umaVersion)) {
    throw new UnsupportedVersionError(umaVersion);
  }

  return {
    vaspDomain,
    umaVersion,
    signature,
    receiverAddress,
    nonce,
    timestamp: timestampAsTime,
    isSubjectToTravelRule:
      isSubjectToTravelRule !== undefined
        ? Boolean(isSubjectToTravelRule?.toLowerCase() == "true")
        : undefined,
  };
}

/* Checks if the given URL is a valid UMA request. */
export function isUmaLnurlpQuery(url: URL) {
  let query: null | LnurlpRequest = null;
  try {
    query = parseLnurlpRequest(url);
  } catch (e) {
    return e instanceof UnsupportedVersionError;
  }
  return isLnurlpRequestForUma(query);
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

type GetPubKeyResponseArgs = {
  /**
   * The chain of signing certificates in PEM format. The order of the certificates
   * should be from the leaf to the root. Used to verify signatures from a vasp.
   */
  signingCertChain: string;
  /**
   * The chain of encryption certificates in PEM format. The order of the certificates
   * should be from the leaf to the root. Used to encrypt TR info sent to a VASP.
   */
  encryptionCertChain: string;
  /** Seconds since epoch at which these pub keys must be refreshed. They can be safely cached until this expiration (or forever if null). */
  expirationTimestamp?: number;
};

/**
 * Creates a pub key response.
 */
export function getPubKeyResponse({
  signingCertChain,
  encryptionCertChain,
  expirationTimestamp,
}: GetPubKeyResponseArgs) {
  const signingCertChainX509 = getX509CertChain(signingCertChain);
  const encryptionCerChainX509 = getX509CertChain(encryptionCertChain);
  const signingPubKey = getPublicKey(signingCertChainX509).toString("hex");
  const encryptionPubKey = getPublicKey(encryptionCerChainX509).toString("hex");
  return {
    signingCertChain: signingCertChain,
    encryptionCertChain: encryptionCertChain,
    signingPubKey: signingPubKey,
    encryptionPubKey: encryptionPubKey,
    expirationTimestamp: expirationTimestamp,
  };
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
  otherVaspPubKeyResponse: PubKeyResponse,
  nonceValidator: NonceValidator,
) {
  if (!isLnurlpRequestForUma(query)) {
    throw new InvalidInputError("not a valid uma request. Missing fields");
  }
  const isNonceValid = await nonceValidator.checkAndSaveNonce(
    query.nonce!,
    query.timestamp!.getTime() / 1000,
  );
  if (!isNonceValid) {
    throw new InvalidInputError(
      "Invalid response nonce. Already seen this nonce or the timestamp is too old.",
    );
  }
  const payload = getSignableLnurlpRequestPayload(query);
  const encoder = new TextEncoder();
  const encodedPayload = encoder.encode(payload);
  const hashedPayload = await createSha256Hash(encodedPayload);
  const otherVaspSigningPubKey = getSigningPubKey(otherVaspPubKeyResponse);
  return verifySignature(
    hashedPayload,
    query.signature!,
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
  receivingCurrencyCode: string;
  /** The amount of the payment in the smallest unit of the specified currency (i.e. cents for USD). */
  amount: number;
  /**
   * Whether the amount field is specified in the smallest unit of the receiving currency or in msats (if false).
   */
  isAmountInReceivingCurrency: boolean;
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

  /**
   * The data requested by the sending VASP about the receiver.
   */
  requestedPayeeData?: CounterPartyDataOptions | undefined;

  /**
   * A comment that the sender would like to include with the payment. This can only be included
   * if the receiver included the `commentAllowed` field in the lnurlp response. The length of
   * the comment must be less than or equal to the value of `commentAllowed`.
   */
  comment?: string | undefined;

  /**
   * The major version of UMA used for this request. If non-UMA, this version is still relevant
   * for which LUD-21 spec to follow. For the older LUD-21 spec, this should be 0. For the newer
   * LUD-21 spec, this should be 1.
   */
  umaMajorVersion: number;
};

/**
 * Creates a signed uma pay request.
 */
export async function getPayRequest({
  amount,
  receivingCurrencyCode,
  isAmountInReceivingCurrency,
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
  requestedPayeeData,
  comment,
  umaMajorVersion,
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
  const sendingAmountCurrencyCode = isAmountInReceivingCurrency
    ? receivingCurrencyCode
    : "SAT";

  return new PayRequest(
    amount,
    receivingCurrencyCode,
    sendingAmountCurrencyCode,
    umaMajorVersion,
    {
      name: payerName,
      email: payerEmail,
      identifier: payerIdentifier,
      compliance: complianceData,
    },
    requestedPayeeData,
    comment,
  );
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
  request: PayRequest;
  /**
   * The metadata that will be added to the invoice's metadata hash field. Note that this should not include the
   * extra payer data. That will be appended automatically.
   */
  metadata: string;
  /** UmaInvoiceCreator that calls createUmaInvoice using your provider. */
  invoiceCreator: UmaInvoiceCreator;
  /**
   * Milli-satoshis per the smallest unit of the specified currency. This rate is committed to by the receiving
   * VASP until the invoice expires.
   */
  conversionRate: number | undefined;
  /** The code of the currency that the receiver will receive for this payment. */
  receivingCurrencyCode: string | undefined;
  /**
   * Number of digits after the decimal point for the receiving currency. For example, in USD, by
   * convention, there are 2 digits for cents - $5.95. In this case, `decimals` would be 2. This should align with
   * the currency's `decimals` field in the LNURLP response. It is included here for convenience. See
   * [UMAD-04](https://github.com/uma-universal-money-address/protocol/blob/main/umad-04-lnurlp-response.md) for
   * details, edge cases, and examples.
   */
  receivingCurrencyDecimals: number | undefined;
  /** The list of UTXOs of the receiver's channels that might be used to fund the payment. */
  receiverChannelUtxos: string[] | undefined;
  /**
   * The fees charged (in millisats) by the receiving VASP to convert to the target currency. This is separate from
   * the conversion rate.
   */
  receiverFeesMillisats: number | undefined;
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
  /**
   * The data requested by the sending VASP about the receiver.
   */
  payeeData?: PayeeData | undefined;
  /** The private key of the VASP that is receiving the payment. This will be used to sign the request. */
  receivingVaspPrivateKey: Uint8Array | undefined;
  /** The identifier of the receiver. For example, $bob@vasp2.com */
  payeeIdentifier: string | undefined;
  /**
   * This field may be used by a WALLET to decide whether the initial LNURL link will
   * be stored locally for later reuse or erased. If disposable is null, it should be
   * interpreted as true, so if SERVICE intends its LNURL links to be stored it must
   * return `disposable: false`. UMA should always return `disposable: false`. See LUD-11.
   */
  disposable?: boolean | undefined;
  /**
   * Defines a struct which can be stored and shown to the user on payment success. See LUD-09.
   */
  successAction?: { [key: string]: string } | undefined;
};

export async function getPayReqResponse({
  request,
  conversionRate,
  receivingCurrencyCode,
  receivingCurrencyDecimals,
  invoiceCreator,
  metadata,
  receiverChannelUtxos,
  receiverFeesMillisats,
  receiverNodePubKey,
  utxoCallback,
  payeeData,
  receivingVaspPrivateKey,
  payeeIdentifier,
  disposable,
  successAction,
}: PayRequestResponseArgs): Promise<PayReqResponse> {
  validateUmaFields({
    request,
    conversionRate,
    receivingCurrencyCode,
    receivingCurrencyDecimals,
    invoiceCreator,
    receiverChannelUtxos,
    receiverFeesMillisats,
    receiverNodePubKey,
    utxoCallback,
    payeeData,
    receivingVaspPrivateKey,
    payeeIdentifier,
  });
  validateLud21Fields({
    request,
    conversionRate,
    receivingCurrencyCode,
    receivingCurrencyDecimals,
    receiverFeesMillisats,
  });

  const isSendingAmountInMsats =
    !request.sendingAmountCurrencyCode ||
    request.sendingAmountCurrencyCode === "SAT";

  if (
    !isSendingAmountInMsats &&
    request.sendingAmountCurrencyCode !== receivingCurrencyCode
  ) {
    throw new InvalidInputError(
      "The sending currency code in the pay request does not match the receiving currency code.",
    );
  }

  conversionRate = conversionRate || 1;
  receiverFeesMillisats = receiverFeesMillisats || 0;
  const msatsAmount = isSendingAmountInMsats
    ? request.amount
    : Math.round(request.amount * conversionRate + receiverFeesMillisats);
  const receivingAmount = isSendingAmountInMsats
    ? Math.round((request.amount - receiverFeesMillisats) / conversionRate)
    : request.amount;

  const encodedPayerData =
    request.payerData && JSON.stringify(request.payerData);
  const encodedInvoice = await invoiceCreator.createUmaInvoice(
    msatsAmount,
    metadata + (encodedPayerData || ""),
  );
  if (!encodedInvoice) {
    throw new Error("failed to create invoice");
  }
  const payerIdentifier = request.payerData?.identifier;
  if (!payerIdentifier) {
    throw new Error("Payer identifier missing");
  }
  let complianceData: CompliancePayeeData | undefined;
  if (request.isUma()) {
    if (!payeeIdentifier) {
      throw new Error("Payee identifier missing");
    }
    complianceData = await getSignedCompliancePayeeData(
      receivingVaspPrivateKey!,
      payerIdentifier,
      payeeIdentifier,
      receiverChannelUtxos || [],
      receiverNodePubKey,
      utxoCallback,
    );
  }

  let isDisposable = disposable;
  // UMA requests should be disposable by default.
  if (isDisposable === undefined && request.isUma()) {
    isDisposable = true;
  }

  return new PayReqResponse(
    encodedInvoice,
    Object.assign({ compliance: complianceData }, payeeData || {}),
    !!receivingCurrencyCode
      ? {
          amount: receivingAmount,
          currencyCode: receivingCurrencyCode,
          decimals: receivingCurrencyDecimals || 0,
          multiplier: conversionRate,
          fee: receiverFeesMillisats,
        }
      : undefined,
    isDisposable,
    successAction,
    request.umaMajorVersion,
  );
}

function validateUmaFields({
  request,
  conversionRate,
  receivingCurrencyCode,
  receivingCurrencyDecimals,
  invoiceCreator,
  receiverFeesMillisats,
  receivingVaspPrivateKey,
  payeeIdentifier,
}: Partial<PayRequestResponseArgs>) {
  if (!request?.isUma()) {
    return;
  }
  const umaRequiredFields = {
    conversionRate: conversionRate,
    receivingCurrencyCode: receivingCurrencyCode,
    receivingCurrencyDecimals: receivingCurrencyDecimals,
    invoiceCreator: invoiceCreator,
    receiverFeesMillisats: receiverFeesMillisats,
    receivingVaspPrivateKey: receivingVaspPrivateKey,
    payeeIdentifier: payeeIdentifier,
  };
  const undefinedFields = Object.entries(umaRequiredFields)
    .filter(([, value]) => value === undefined)
    .map(([key]) => key);
  if (undefinedFields.length > 0) {
    throw new Error(
      `missing required uma fields:  ${Array(undefinedFields).join(", ")}`,
    );
  }
}

function validateLud21Fields({
  request,
  conversionRate,
  receivingCurrencyCode,
  receivingCurrencyDecimals,
  receiverFeesMillisats,
}: Partial<PayRequestResponseArgs>) {
  if (request?.receivingCurrencyCode === undefined) {
    return;
  }
  if (request.receivingCurrencyCode !== undefined) {
    if (conversionRate === undefined) {
      throw new InvalidInputError(
        "conversionRate is required when receivingCurrencyCode is set",
      );
    }
    if (receivingCurrencyCode === undefined) {
      throw new InvalidInputError(
        "receivingCurrencyCode is required when receivingCurrencyCode is set",
      );
    }
    if (receivingCurrencyDecimals === undefined) {
      throw new InvalidInputError(
        "receivingCurrencyDecimals is required when receivingCurrencyCode is set",
      );
    }
    if (receiverFeesMillisats === undefined) {
      throw new InvalidInputError(
        "receiverFeesMillisats is required when receivingCurrencyCode is set",
      );
    }
  }
}

async function getSignedCompliancePayeeData(
  receivingVaspPrivateKeyBytes: Uint8Array,
  payerIdentifier: string,
  payeeIdentifier: string,
  receiverChannelUtxos: string[],
  receiverNodePubKey: string | undefined,
  utxoCallback: string | undefined,
): Promise<CompliancePayeeData> {
  const signatureTimestamp = Math.floor(Date.now() / 1000);
  const signatureNonce = generateNonce();
  const payloadString = `${payerIdentifier}|${payeeIdentifier}|${signatureNonce}|${signatureTimestamp}`;
  const signature = await signPayload(
    payloadString,
    receivingVaspPrivateKeyBytes,
  );
  return {
    nodePubKey: receiverNodePubKey,
    utxos: receiverChannelUtxos,
    utxoCallback: utxoCallback,
    signature: signature,
    signatureNonce: signatureNonce,
    signatureTimestamp: signatureTimestamp,
  };
}

type GetSignedLnurlpResponseArgs = {
  request: LnurlpRequest;
  callback: string;
  encodedMetadata: string;
  minSendableSats: number;
  maxSendableSats: number;
  privateKeyBytes?: Uint8Array | undefined;
  requiresTravelRuleInfo?: boolean | undefined;
  payerDataOptions?: CounterPartyDataOptions | undefined;
  currencyOptions?: Currency[] | undefined;
  receiverKycStatus?: KycStatus | undefined;
  commentCharsAllowed?: number | undefined;
  nostrPubkey?: string | undefined;
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
  commentCharsAllowed,
  nostrPubkey,
}: GetSignedLnurlpResponseArgs): Promise<LnurlpResponse> {
  if (!isLnurlpRequestForUma(request)) {
    return new LnurlpResponse(
      callback,
      minSendableSats * 1000,
      maxSendableSats * 1000,
      encodedMetadata,
      undefined,
      undefined,
      currencyOptions,
      payerDataOptions,
      commentCharsAllowed,
      nostrPubkey,
      !!nostrPubkey,
    );
  }
  const requiredUmaFields = {
    privateKeyBytes: privateKeyBytes,
    requiresTravelRuleInfo: requiresTravelRuleInfo,
    receiverKycStatus: receiverKycStatus,
    currencyOptions: currencyOptions,
  };
  const undefinedFields = Object.entries(requiredUmaFields)
    .filter(([, value]) => value === undefined)
    .map(([key]) => key);
  if (undefinedFields.length > 0) {
    throw new InvalidInputError(
      `missing required uma fields:  ${Array(undefinedFields).join(", ")}`,
    );
  }
  const umaVersion = selectLowerVersion(
    request.umaVersion!,
    UmaProtocolVersion,
  );
  const complianceResponse = await getSignedLnurlpComplianceResponse({
    query: request,
    privateKeyBytes: privateKeyBytes!,
    isSubjectToTravelRule: requiresTravelRuleInfo!,
    receiverKycStatus: receiverKycStatus!,
  });

  // Ensure correct encoding of currencies for v0:
  if (getMajorVersion(umaVersion) === 0) {
    currencyOptions = currencyOptions?.map((currency) =>
      currency.withUmaVersion(0),
    );
  } else {
    currencyOptions = currencyOptions?.map((currency) =>
      currency.withUmaVersion(MAJOR_VERSION),
    );
  }
  return new LnurlpResponse(
    callback,
    minSendableSats * 1000,
    maxSendableSats * 1000,
    encodedMetadata,
    complianceResponse,
    umaVersion,
    currencyOptions,
    payerDataOptions,
    commentCharsAllowed,
    nostrPubkey,
    !!nostrPubkey,
  );
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

type PostTransactionCallbackArgs = {
  /** UTXOs of the channels of the VASP initiating the callback. */
  utxos: UtxoWithAmount[];
  /** Domain name of the VASP sending the callback. Used to fetch keys for signature validation. */
  vaspDomain: string;
  /** The private signing key of the VASP that is sending the callback. This will be used to sign the request. */
  signingPrivateKey: Uint8Array;
};

export async function getPostTransactionCallback({
  utxos,
  vaspDomain,
  signingPrivateKey,
}: PostTransactionCallbackArgs): Promise<PostTransactionCallback> {
  const nonce = generateNonce();
  const timestamp = Math.floor(Date.now() / 1000);
  const callback: PostTransactionCallback = {
    signature: "",
    signatureNonce: nonce,
    signatureTimestamp: timestamp,
    utxos,
    vaspDomain,
  };
  const payload = getSignablePostTransactionCallback(callback);
  const signature = await signPayload(payload, signingPrivateKey);
  callback.signature = signature;
  return callback;
}

export async function verifyUmaLnurlpResponseSignature(
  response: LnurlpResponse,
  otherVaspPubKeyResponse: PubKeyResponse,
  nonceValidator: NonceValidator,
) {
  if (!response.compliance) {
    throw new Error("compliance data is required for UMA response.");
  }
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
  const encodedResponse = encoder.encode(response.signablePayload());
  const hashedPayload = await createSha256Hash(encodedResponse);
  const otherVaspSigningPubKey = getSigningPubKey(otherVaspPubKeyResponse);
  return verifySignature(
    hashedPayload,
    response.compliance.signature,
    otherVaspSigningPubKey,
  );
}

export async function verifyPayReqSignature(
  query: PayRequest,
  otherVaspPubKeyResponse: PubKeyResponse,
  nonceValidator: NonceValidator,
) {
  const encoder = new TextEncoder();
  const complianceData = query.payerData?.compliance;
  if (!complianceData) {
    throw new Error("compliance data is required");
  }
  const isNonceValid = await nonceValidator.checkAndSaveNonce(
    complianceData.signatureNonce,
    complianceData.signatureTimestamp,
  );
  if (!isNonceValid) {
    throw new Error(
      "Invalid response nonce. Already seen this nonce or the timestamp is too old.",
    );
  }
  const encodedQuery = encoder.encode(query.signablePayload());
  const hashedPayload = await createSha256Hash(encodedQuery);
  const otherVaspPubKey = getSigningPubKey(otherVaspPubKeyResponse);
  return verifySignature(
    hashedPayload,
    complianceData.signature,
    otherVaspPubKey,
  );
}

export async function verifyPayReqResponseSignature(
  response: PayReqResponse,
  payerIdentifier: string,
  payeeIdentifier: string,
  otherVaspPubKeyResponse: PubKeyResponse,
  nonceValidator: NonceValidator,
) {
  const encoder = new TextEncoder();
  const complianceData = response.payeeData?.compliance;
  if (!complianceData) {
    throw new Error("compliance data is required");
  }
  if (
    !complianceData.signatureNonce ||
    !complianceData.signatureTimestamp ||
    !complianceData.signature
  ) {
    throw new Error("compliance data is missing signature, nonce or timestamp");
  }
  const isNonceValid = await nonceValidator.checkAndSaveNonce(
    complianceData.signatureNonce,
    complianceData.signatureTimestamp,
  );
  if (!isNonceValid) {
    throw new Error(
      "Invalid response nonce. Already seen this nonce or the timestamp is too old.",
    );
  }
  const encodedQuery = encoder.encode(
    response.signablePayload(payerIdentifier, payeeIdentifier),
  );
  const hashedPayload = await createSha256Hash(encodedQuery);
  const otherVaspPubKey = getSigningPubKey(otherVaspPubKeyResponse);
  return verifySignature(
    hashedPayload,
    complianceData.signature,
    otherVaspPubKey,
  );
}

export async function verifyPostTransactionCallbackSignature(
  callback: PostTransactionCallback,
  otherVaspPubKeyResponse: PubKeyResponse,
  nonceValidator: NonceValidator,
) {
  const isNonceValid = await nonceValidator.checkAndSaveNonce(
    callback.signatureNonce,
    callback.signatureTimestamp,
  );
  if (!isNonceValid) {
    throw new Error(
      "Invalid response nonce. Already seen this nonce or the timestamp is too old.",
    );
  }
  const encoder = new TextEncoder();
  const encodedQuery = encoder.encode(
    getSignablePostTransactionCallback(callback),
  );
  const hashedPayload = await createSha256Hash(encodedQuery);
  const otherVaspPubKey = getSigningPubKey(otherVaspPubKeyResponse);
  return verifySignature(hashedPayload, callback.signature, otherVaspPubKey);
}
