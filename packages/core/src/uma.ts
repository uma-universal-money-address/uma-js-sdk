import crypto from "crypto";
import { encrypt, PublicKey } from "eciesjs";
import secp256k1 from "secp256k1";
import { getPublicKey, getX509CertChain } from "./certUtils.js";
import { createSha256Hash } from "./createHash.js";
import { InvalidInputError, UmaError } from "./errors.js";
import { ErrorCode } from "./generated/errorCodes.js";
import { type NonceValidator } from "./NonceValidator.js";
import { type BackingSignature } from "./protocol/BackingSignature.js";
import { type CounterPartyDataOptions } from "./protocol/CounterPartyData.js";
import { type Currency } from "./protocol/Currency.js";
import {
  InvoiceSerializer,
  type Invoice,
  type InvoiceCurrency,
} from "./protocol/Invoice.js";
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
import { PubKeyResponse } from "./protocol/PubKeyResponse.js";
import { type PublicKeyCache } from "./PublicKeyCache.js";
import {
  signBytePayload,
  signPayload,
  uint8ArrayToHexString,
} from "./signingUtils.js";
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

export function parseLnurlpRequest(url: URL): LnurlpRequest {
  const query = url.searchParams;
  const signature = query.get("signature") ?? undefined;
  const vaspDomain = query.get("vaspDomain") ?? undefined;
  const nonce = query.get("nonce") ?? undefined;
  const isSubjectToTravelRule = query.get("isSubjectToTravelRule") ?? undefined;
  const umaVersion = query.get("umaVersion") ?? undefined;
  const timestamp = query.get("timestamp") ?? undefined;
  const backingSignatures = query.get("backingSignatures") ?? undefined;
  const numUmaParamsIncluded = [
    vaspDomain,
    signature,
    nonce,
    timestamp,
    umaVersion,
  ].filter((param) => param !== undefined).length;

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
    throw new UmaError(
      "invalid request path",
      ErrorCode.PARSE_LNURLP_REQUEST_ERROR,
    );
  }

  const username = pathParts[3];
  if (!/^[a-zA-Z0-9._$+-]+$/.test(username)) {
    throw new UmaError(
      "Invalid username in request path",
      ErrorCode.PARSE_LNURLP_REQUEST_ERROR,
    );
  }

  const receiverAddress = pathParts[3] + "@" + url.host;

  if (umaVersion !== undefined && !isVersionSupported(umaVersion)) {
    throw new UnsupportedVersionError(umaVersion);
  }

  if (numUmaParamsIncluded < 5 && numUmaParamsIncluded > 0) {
    throw new UmaError(
      "Invalid UMA request. All UMA parameters must be included if any are included.",
      ErrorCode.MISSING_REQUIRED_UMA_PARAMETERS,
    );
  }

  let parsedBackingSignatures: BackingSignature[] | undefined;
  if (backingSignatures) {
    parsedBackingSignatures = backingSignatures.split(",").map((pair) => {
      const decodedPair = decodeURIComponent(pair);
      const lastColonIndex = decodedPair.lastIndexOf(":");
      if (lastColonIndex === -1) {
        throw new UmaError(
          "Invalid backing signature format",
          ErrorCode.INVALID_SIGNATURE,
        );
      }
      return {
        domain: pair.substring(0, lastColonIndex),
        signature: pair.substring(lastColonIndex + 1),
      };
    });
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
    backingSignatures: parsedBackingSignatures,
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
  const pubKeyResponse = PubKeyResponse.fromJson(await response.text());
  cache.addPublicKeyForVasp(vaspDomain, pubKeyResponse);
  return pubKeyResponse;
}

type GetPubKeyResponseArgs = {
  /**
   * The chain of signing certificates in PEM format. The order of the certificates
   * should be from the leaf to the root. Used to verify signatures from a vasp.
   */
  signingCertChainPem: string;
  /**
   * The chain of encryption certificates in PEM format. The order of the certificates
   * should be from the leaf to the root. Used to encrypt TR info sent to a VASP.
   */
  encryptionCertChainPem: string;
  /** Seconds since epoch at which these pub keys must be refreshed. They can be safely cached until this expiration (or forever if null). */
  expirationTimestamp?: number;
};

/**
 * Creates a pub key response.
 */
export function getPubKeyResponse({
  signingCertChainPem,
  encryptionCertChainPem,
  expirationTimestamp,
}: GetPubKeyResponseArgs) {
  const signingCertChainX509 = getX509CertChain(signingCertChainPem);
  const encryptionCertChainX509 = getX509CertChain(encryptionCertChainPem);
  const signingPubKey = getPublicKey(signingCertChainX509).toString("hex");
  const encryptionPubKey = getPublicKey(encryptionCertChainX509).toString(
    "hex",
  );
  return new PubKeyResponse(
    signingCertChainX509,
    encryptionCertChainX509,
    signingPubKey,
    encryptionPubKey,
    expirationTimestamp,
  );
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

export async function verifyUmaLnurlpQuerySignature(
  query: LnurlpRequest,
  otherVaspPubKeyResponse: PubKeyResponse,
  nonceValidator: NonceValidator,
) {
  if (!isLnurlpRequestForUma(query)) {
    throw new InvalidInputError(
      "not a valid uma request. Missing fields",
      ErrorCode.MISSING_REQUIRED_UMA_PARAMETERS,
    );
  }
  const isNonceValid = await nonceValidator.checkAndSaveNonce(
    query.nonce!,
    query.timestamp!.getTime() / 1000,
  );
  if (!isNonceValid) {
    throw new InvalidInputError(
      "Invalid response nonce. Already seen this nonce or the timestamp is too old.",
      ErrorCode.INVALID_NONCE,
    );
  }
  const payload = getSignableLnurlpRequestPayload(query);
  const encoder = new TextEncoder();
  const encodedPayload = encoder.encode(payload);
  const hashedPayload = await createSha256Hash(encodedPayload);
  const otherVaspSigningPubKey = otherVaspPubKeyResponse.getSigningPubKey();
  return verifySignature(
    hashedPayload,
    query.signature!,
    otherVaspSigningPubKey,
  );
}

/**
 * Verifies the backing signatures on an UMA Lnurlp query. You may optionally call this function after
 * verifyUmaLnurlpQuerySignature to verify signatures from backing VASPs.
 *
 * @param query The signed query to verify
 * @param fetchPublicKeysForVasp Function to fetch public keys for a VASP domain
 * @returns true if all backing signatures are valid, false otherwise
 */
export async function verifyUmaLnurlpQueryBackingSignatures(
  query: LnurlpRequest,
  cache: PublicKeyCache,
) {
  if (!query.backingSignatures) {
    return true;
  }

  const signablePayload = getSignableLnurlpRequestPayload(query);
  const encoder = new TextEncoder();
  const encodedPayload = encoder.encode(signablePayload);
  const hashedPayload = await createSha256Hash(encodedPayload);

  for (const backingSignature of query.backingSignatures) {
    const backingVaspPubKeyResponse = await fetchPublicKeyForVasp({
      cache,
      vaspDomain: backingSignature.domain,
    });
    const isSignatureValid = verifySignature(
      hashedPayload,
      backingSignature.signature,
      backingVaspPubKeyResponse.getSigningPubKey(),
    );
    if (!isSignatureValid) {
      return false;
    }
  }

  return true;
}

export async function verifyUmaInvoiceSignature(
  invoice: Invoice,
  publicKey: Uint8Array,
) {
  if (invoice.signature !== undefined) {
    const { signature: invoiceSignature, ...unsignedInvoice }: Invoice =
      invoice;
    const hashedPayload = await createSha256Hash(
      InvoiceSerializer.toTLV(unsignedInvoice),
    );
    return verifySignature(hashedPayload, invoiceSignature, publicKey);
  }
  return false;
}

/**
 *
 * @param hashedPayload - sha256 hash of target object
 * @param signature - original encoded signature of object
 * @param otherVaspPubKey - pub key to verify signature
 * @returns
 */
function verifySignature(
  hashedPayload: Uint8Array,
  signature: string | Uint8Array,
  otherVaspPubKey: Uint8Array,
) {
  let localSignature;
  if (typeof signature === "string") {
    localSignature = Buffer.from(signature, "hex");
  } else {
    localSignature = signature;
  }
  const decodedSignature = secp256k1.signatureImport(localSignature);

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

  const domain = addressParts[1];
  if (!domain.match(/^[a-z0-9-\.]+$/i)) {
    return false;
  }

  if (userName.length > 64) {
    return false;
  }

  return true;
}

export function getVaspDomainFromUmaAddress(umaAddress: string) {
  if (!isValidUmaAddress(umaAddress)) {
    throw new UmaError("invalid uma address", ErrorCode.INVALID_INPUT);
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

  /**
   * associated invoice id, for PayRequest version1+
   */
  invoiceUUID?: string | undefined;
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
  invoiceUUID,
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
    : undefined;

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
    invoiceUUID,
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
  const pubKey = PublicKey.fromHex(
    uint8ArrayToHexString(receiverEncryptionPubKey),
  );
  const encryptedTrInfoBytes = encrypt(pubKey.compressed, Buffer.from(trInfo));
  return uint8ArrayToHexString(encryptedTrInfoBytes);
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

  const isSendingAmountInMsats = !request.sendingAmountCurrencyCode;

  if (
    !isSendingAmountInMsats &&
    request.sendingAmountCurrencyCode !== receivingCurrencyCode
  ) {
    throw new InvalidInputError(
      "The sending currency code in the pay request does not match the receiving currency code.",
      ErrorCode.INVALID_CURRENCY,
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

  const encodedMetadataWithInvoiceUUID = request.invoiceUUID
    ? addInvoiceUUIDToEncodedMetadata(metadata, request.invoiceUUID)
    : metadata;

  const encodedPayerData =
    request.payerData && JSON.stringify(request.payerData);
  const encodedInvoice = await invoiceCreator.createUmaInvoice(
    msatsAmount,
    encodedMetadataWithInvoiceUUID + (encodedPayerData || ""),
    payeeIdentifier,
  );
  if (!encodedInvoice) {
    throw new UmaError("failed to create invoice", ErrorCode.INTERNAL_ERROR);
  }
  let complianceData: CompliancePayeeData | undefined;
  if (request.isUma()) {
    const payerIdentifier = request.payerData?.identifier;
    if (!payerIdentifier) {
      throw new UmaError(
        "Payer identifier missing",
        ErrorCode.MISSING_REQUIRED_UMA_PARAMETERS,
      );
    }
    if (!payeeIdentifier) {
      throw new UmaError("Payee identifier missing", ErrorCode.INVALID_INPUT);
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

/**
 * PayReq / PayReqResponse metadata is encoded as a list of pairs, of format
 * ["type", "value"]
 * @param metadata - existing json encoded metadata, which should deserialized to string[][]
 * @param invoiceUUID - reference invoice uuid
 * @returns re-json encoded metadata.
 */
function addInvoiceUUIDToEncodedMetadata(
  metadata: string,
  invoiceUUID: string,
): string {
  let encodedString;
  try {
    const decodedMetadata: string[][] = JSON.parse(metadata);
    decodedMetadata.push(["text/uma-invoice", invoiceUUID]);
    encodedString = JSON.stringify(decodedMetadata);
  } catch (e) {
    encodedString = metadata;
  }
  return encodedString;
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
    throw new UmaError(
      `missing required uma fields:  ${Array(undefinedFields).join(", ")}`,
      ErrorCode.MISSING_REQUIRED_UMA_PARAMETERS,
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
        ErrorCode.MISSING_REQUIRED_UMA_PARAMETERS,
      );
    }
    if (receivingCurrencyCode === undefined) {
      throw new InvalidInputError(
        "receivingCurrencyCode is required when receivingCurrencyCode is set",
        ErrorCode.MISSING_REQUIRED_UMA_PARAMETERS,
      );
    }
    if (receivingCurrencyDecimals === undefined) {
      throw new InvalidInputError(
        "receivingCurrencyDecimals is required when receivingCurrencyCode is set",
        ErrorCode.MISSING_REQUIRED_UMA_PARAMETERS,
      );
    }
    if (receiverFeesMillisats === undefined) {
      throw new InvalidInputError(
        "receiverFeesMillisats is required when receivingCurrencyCode is set",
        ErrorCode.MISSING_REQUIRED_UMA_PARAMETERS,
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
      ErrorCode.MISSING_REQUIRED_UMA_PARAMETERS,
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

  // Identifier and compliance are mandatory fields for UMA requests.
  if (!payerDataOptions) {
    payerDataOptions = {};
  }
  if (!payerDataOptions.compliance) {
    payerDataOptions.compliance = { mandatory: true };
  }
  if (!payerDataOptions.identifier) {
    payerDataOptions.identifier = { mandatory: true };
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
    throw new UmaError(
      "compliance data is required for UMA response.",
      ErrorCode.MISSING_REQUIRED_UMA_PARAMETERS,
    );
  }
  const isNonceValid = await nonceValidator.checkAndSaveNonce(
    response.compliance.signatureNonce,
    response.compliance.signatureTimestamp,
  );
  if (!isNonceValid) {
    throw new UmaError(
      "Invalid response nonce. Already seen this nonce or the timestamp is too old.",
      ErrorCode.INVALID_NONCE,
    );
  }
  const encoder = new TextEncoder();
  const encodedResponse = encoder.encode(response.signablePayload());
  const hashedPayload = await createSha256Hash(encodedResponse);
  const otherVaspSigningPubKey = otherVaspPubKeyResponse.getSigningPubKey();
  return verifySignature(
    hashedPayload,
    response.compliance.signature,
    otherVaspSigningPubKey,
  );
}

/**
 * Verifies the backing signatures on an UMA Lnurlp response. You may optionally call this function after
 * verifyUmaLnurlpResponseSignature to verify signatures from backing VASPs.
 *
 * @param response The signed response to verify
 * @param cache The PublicKeyCache to use for fetching VASP public keys
 * @returns true if all backing signatures are valid, false otherwise
 */
export async function verifyUmaLnurlpResponseBackingSignatures(
  response: LnurlpResponse,
  cache: PublicKeyCache,
) {
  if (!response.compliance?.backingSignatures) {
    return true;
  }

  const encoder = new TextEncoder();
  const encodedResponse = encoder.encode(response.signablePayload());
  const hashedPayload = await createSha256Hash(encodedResponse);

  for (const backingSignature of response.compliance.backingSignatures) {
    const backingVaspPubKeyResponse = await fetchPublicKeyForVasp({
      cache,
      vaspDomain: backingSignature.domain,
    });
    const isSignatureValid = verifySignature(
      hashedPayload,
      backingSignature.signature,
      backingVaspPubKeyResponse.getSigningPubKey(),
    );
    if (!isSignatureValid) {
      return false;
    }
  }

  return true;
}

export async function verifyPayReqSignature(
  query: PayRequest,
  otherVaspPubKeyResponse: PubKeyResponse,
  nonceValidator: NonceValidator,
) {
  const encoder = new TextEncoder();
  const complianceData = query.payerData?.compliance;
  if (!complianceData) {
    throw new UmaError(
      "compliance data is required",
      ErrorCode.MISSING_REQUIRED_UMA_PARAMETERS,
    );
  }
  const isNonceValid = await nonceValidator.checkAndSaveNonce(
    complianceData.signatureNonce,
    complianceData.signatureTimestamp,
  );
  if (!isNonceValid) {
    throw new UmaError(
      "Invalid response nonce. Already seen this nonce or the timestamp is too old.",
      ErrorCode.INVALID_NONCE,
    );
  }
  const encodedQuery = encoder.encode(query.signablePayload());
  const hashedPayload = await createSha256Hash(encodedQuery);
  const otherVaspPubKey = otherVaspPubKeyResponse.getSigningPubKey();
  return verifySignature(
    hashedPayload,
    complianceData.signature,
    otherVaspPubKey,
  );
}

/**
 * Verifies the backing signatures on a PayRequest. You may optionally call this function after
 * verifyPayReqSignature to verify signatures from backing VASPs.
 *
 * @param query The signed PayRequest to verify
 * @param cache The PublicKeyCache to use for fetching VASP public keys
 * @returns true if all backing signatures are valid, false otherwise
 */
export async function verifyPayReqBackingSignatures(
  query: PayRequest,
  cache: PublicKeyCache,
) {
  const complianceData = query.payerData?.compliance;
  if (!complianceData?.backingSignatures) {
    return true;
  }

  const encoder = new TextEncoder();
  const encodedQuery = encoder.encode(query.signablePayload());
  const hashedPayload = await createSha256Hash(encodedQuery);

  for (const backingSignature of complianceData.backingSignatures) {
    const backingVaspPubKeyResponse = await fetchPublicKeyForVasp({
      cache,
      vaspDomain: backingSignature.domain,
    });
    const isSignatureValid = verifySignature(
      hashedPayload,
      backingSignature.signature,
      backingVaspPubKeyResponse.getSigningPubKey(),
    );
    if (!isSignatureValid) {
      return false;
    }
  }

  return true;
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
    throw new UmaError(
      "compliance data is required",
      ErrorCode.MISSING_REQUIRED_UMA_PARAMETERS,
    );
  }
  if (
    !complianceData.signatureNonce ||
    !complianceData.signatureTimestamp ||
    !complianceData.signature
  ) {
    throw new UmaError(
      "compliance data is missing signature, nonce or timestamp",
      ErrorCode.MISSING_REQUIRED_UMA_PARAMETERS,
    );
  }
  const isNonceValid = await nonceValidator.checkAndSaveNonce(
    complianceData.signatureNonce,
    complianceData.signatureTimestamp,
  );
  if (!isNonceValid) {
    throw new UmaError(
      "Invalid response nonce. Already seen this nonce or the timestamp is too old.",
      ErrorCode.INVALID_NONCE,
    );
  }
  const encodedQuery = encoder.encode(
    response.signablePayload(payerIdentifier, payeeIdentifier),
  );
  const hashedPayload = await createSha256Hash(encodedQuery);
  const otherVaspPubKey = otherVaspPubKeyResponse.getSigningPubKey();
  return verifySignature(
    hashedPayload,
    complianceData.signature,
    otherVaspPubKey,
  );
}

/**
 * Verifies the backing signatures on a PayReqResponse. You may optionally call this function after
 * verifyPayReqResponseSignature to verify signatures from backing VASPs.
 *
 * @param response The signed PayReqResponse to verify
 * @param payerIdentifier The identifier of the sender (e.g. $alice@vasp1.com)
 * @param payeeIdentifier The identifier of the receiver
 * @param cache Cache for storing VASP public keys
 * @returns true if all backing signatures are valid, false otherwise
 */
export async function verifyPayReqResponseBackingSignatures(
  response: PayReqResponse,
  payerIdentifier: string,
  payeeIdentifier: string,
  cache: PublicKeyCache,
) {
  const complianceData = response.payeeData?.compliance;
  if (!complianceData?.backingSignatures) {
    return true;
  }

  const encoder = new TextEncoder();
  const encodedPayload = encoder.encode(
    response.signablePayload(payerIdentifier, payeeIdentifier),
  );
  const hashedPayload = await createSha256Hash(encodedPayload);

  for (const backingSignature of complianceData.backingSignatures) {
    const backingVaspPubKeyResponse = await fetchPublicKeyForVasp({
      cache,
      vaspDomain: backingSignature.domain,
    });
    const isSignatureValid = verifySignature(
      hashedPayload,
      backingSignature.signature,
      backingVaspPubKeyResponse.getSigningPubKey(),
    );
    if (!isSignatureValid) {
      return false;
    }
  }

  return true;
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
    throw new UmaError(
      "Invalid response nonce. Already seen this nonce or the timestamp is too old.",
      ErrorCode.INVALID_NONCE,
    );
  }
  const encoder = new TextEncoder();
  const encodedQuery = encoder.encode(
    getSignablePostTransactionCallback(callback),
  );
  const hashedPayload = await createSha256Hash(encodedQuery);
  const otherVaspPubKey = otherVaspPubKeyResponse.getSigningPubKey();
  return verifySignature(hashedPayload, callback.signature, otherVaspPubKey);
}

export async function createUmaInvoice(
  {
    receiverUma,
    invoiceUUID,
    amount,
    receivingCurrency,
    expiration,
    isSubjectToTravelRule,
    requiredPayerData,
    commentCharsAllowed,
    senderUma,
    invoiceLimit,
    kycStatus,
    callback,
  }: {
    receiverUma: string;
    invoiceUUID: string;
    amount: number;
    receivingCurrency: InvoiceCurrency;
    expiration: number;
    isSubjectToTravelRule: boolean;
    requiredPayerData: CounterPartyDataOptions | undefined;
    commentCharsAllowed: number | undefined;
    senderUma: string | undefined;
    invoiceLimit: number | undefined;
    kycStatus: KycStatus | undefined;
    callback: string;
  },
  privateKeyBytes: Uint8Array,
): Promise<Invoice> {
  const invoice: Invoice = {
    receiverUma: receiverUma,
    invoiceUUID: invoiceUUID,
    amount: amount,
    receivingCurrency: receivingCurrency,
    expiration: expiration,
    isSubjectToTravelRule: isSubjectToTravelRule,
    requiredPayerData: requiredPayerData,
    commentCharsAllowed: commentCharsAllowed,
    senderUma: senderUma,
    maxNumPayments: invoiceLimit,
    kycStatus: kycStatus,
    callback: callback,
    umaVersions: UmaProtocolVersion,
  };
  const invoicePayload = InvoiceSerializer.toTLV(invoice);
  const signature = await signBytePayload(invoicePayload, privateKeyBytes);
  invoice.signature = signature;
  return invoice;
}
