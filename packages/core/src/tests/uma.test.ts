import { randomBytes } from "crypto";
import { decrypt, PrivateKey } from "eciesjs";
import secp256k1 from "secp256k1";
import { isError } from "../errors.js";
import { KycStatus } from "../KycStatus.js";
import { InMemoryNonceValidator } from "../NonceValidator.js";
import {
  dateToUnixSeconds,
  parseLnurlpResponse,
  parsePayReqResponse,
  parsePayRequest,
  type LnurlpRequest,
} from "../protocol.js";
import {
  getLnurlpResponse,
  getPayReqResponse,
  getPayRequest,
  getSignedLnurlpRequestUrl,
  getVaspDomainFromUmaAddress,
  isUmaLnurlpQuery,
  isValidUmaAddress,
  parseLnurlpRequest,
  verifyPayReqSignature,
  verifyUmaLnurlpQuerySignature,
  verifyUmaLnurlpResponseSignature,
} from "../uma.js";
import { UmaProtocolVersion } from "../version.js";

const generateKeypair = async () => {
  let privateKey: Uint8Array;
  do {
    privateKey = new Uint8Array(randomBytes(32));
  } while (!secp256k1.privateKeyVerify(privateKey));

  const publicKey = secp256k1.publicKeyCreate(privateKey, false);

  return {
    privateKey,
    publicKey,
  };
};

function getOneWeekAgoTsMs(): number {
  return Date.now() - 1000 * 60 * 60 * 24 * 7;
}

function createMetadataForBob(): string {
  const metadata = [
    ["text/plain", "Pay to vasp2.com user $bob"],
    ["text/identifier", "$bob@vasp2.com"],
  ];

  return JSON.stringify(metadata);
}

async function createLnurlpRequest(
  senderSigningPrivateKey: Uint8Array,
): Promise<LnurlpRequest> {
  const queryUrl = await getSignedLnurlpRequestUrl({
    signingPrivateKey: senderSigningPrivateKey,
    receiverAddress: "$bob@vasp2.com",
    senderVaspDomain: "vasp1.com",
    isSubjectToTravelRule: true,
  });
  const query = parseLnurlpRequest(queryUrl);
  return query;
}

describe("uma", () => {
  it("should construct the UMA client", () => {
    const invoiceCreator = {
      createUmaInvoice: async () => {
        return "abcdefg123456";
      },
    };
    expect(invoiceCreator).toBeTruthy();
  });

  it("parses a valid lnurlp request", () => {
    const expectedTime = new Date("2023-07-27T22:46:08Z");
    const timeSec = dateToUnixSeconds(expectedTime);
    const expectedQuery = {
      receiverAddress: "bob@vasp2",
      signature: "signature",
      isSubjectToTravelRule: true,
      nonce: "12345",
      timestamp: expectedTime,
      vaspDomain: "vasp1",
      umaVersion: "0.3",
    };
    const urlString =
      "https://vasp2/.well-known/lnurlp/bob?signature=signature&nonce=12345&vaspDomain=vasp1&umaVersion=0.3&isSubjectToTravelRule=true&timestamp=" +
      timeSec;
    const urlObj = new URL(urlString);
    const query = parseLnurlpRequest(urlObj);
    expect(query).toEqual(expectedQuery);
  });

  it("validates uma queries", () => {
    const umaQuery =
      "https://vasp2.com/.well-known/lnurlp/bob?signature=signature&nonce=12345&vaspDomain=vasp1.com&umaVersion=0.3&isSubjectToTravelRule=true&timestamp=12345678";
    expect(isUmaLnurlpQuery(new URL(umaQuery))).toBeTruthy();
  });

  it("returns expected result for missing query params", () => {
    // Missing signature
    let url = new URL(
      "https://vasp2.com/.well-known/lnurlp/bob?nonce=12345&vaspDomain=vasp1.com&umaVersion=0.3&isSubjectToTravelRule=true&timestamp=12345678",
    );
    expect(isUmaLnurlpQuery(url)).toBe(false);

    // Missing umaVersion
    url = new URL(
      "https://vasp2.com/.well-known/lnurlp/bob?signature=signature&nonce=12345&vaspDomain=vasp1.com&isSubjectToTravelRule=true&timestamp=12345678",
    );
    expect(isUmaLnurlpQuery(url)).toBe(false);

    // Missing nonce
    url = new URL(
      "https://vasp2.com/.well-known/lnurlp/bob?signature=signature&vaspDomain=vasp1.com&umaVersion=0.3&isSubjectToTravelRule=true&timestamp=12345678",
    );
    expect(isUmaLnurlpQuery(url)).toBe(false);

    // Missing vaspDomain
    url = new URL(
      "https://vasp2.com/.well-known/lnurlp/bob?signature=signature&umaVersion=0.3&nonce=12345&isSubjectToTravelRule=true&timestamp=12345678",
    );
    expect(isUmaLnurlpQuery(url)).toBe(false);

    url = new URL(
      "https://vasp2.com/.well-known/lnurlp/bob?signature=signature&umaVersion=0.3&nonce=12345&vaspDomain=vasp1.com&timestamp=12345678",
    );
    // IsSubjectToTravelRule is optional
    expect(isUmaLnurlpQuery(url)).toBe(true);

    // Missing timestamp
    url = new URL(
      "https://vasp2.com/.well-known/lnurlp/bob?signature=signature&nonce=12345&vaspDomain=vasp1.com&umaVersion=0.3&isSubjectToTravelRule=true",
    );
    expect(isUmaLnurlpQuery(url)).toBe(false);

    // Missing all required params
    url = new URL("https://vasp2.com/.well-known/lnurlp/bob");
    expect(isUmaLnurlpQuery(url)).toBe(false);
  });

  it("should be invalid uma query when url path is invalid", () => {
    let url = new URL(
      "https://vasp2.com/.well-known/lnurla/bob?signature=signature&nonce=12345&vaspDomain=vasp1.com&umaVersion=0.3&isSubjectToTravelRule=true&timestamp=12345678",
    );
    expect(isUmaLnurlpQuery(url)).toBe(false);

    url = new URL(
      "https://vasp2.com/bob?signature=signature&nonce=12345&vaspDomain=vasp1.com&umaVersion=0.3&isSubjectToTravelRule=true&timestamp=12345678",
    );
    expect(isUmaLnurlpQuery(url)).toBe(false);

    url = new URL(
      "https://vasp2.com/?signature=signature&nonce=12345&vaspDomain=vasp1.com&umaVersion=0.3&isSubjectToTravelRule=true&timestamp=12345678",
    );
    expect(isUmaLnurlpQuery(url)).toBe(false);
  });

  it("future uma versions are still UMA queries", () => {
    const umaQuery =
      "https://vasp2.com/.well-known/lnurlp/bob?signature=signature&nonce=12345&vaspDomain=vasp1.com&umaVersion=100.0&isSubjectToTravelRule=true&timestamp=12345678";
    expect(isUmaLnurlpQuery(new URL(umaQuery))).toBeTruthy();

    // Maybe the params can change in a future version.
    const umaQueryMissingParams =
      "https://vasp2.com/.well-known/lnurlp/bob?signature=signature&umaVersion=100.0&isSubjectToTravelRule=true&timestamp=12345678";
    expect(isUmaLnurlpQuery(new URL(umaQueryMissingParams))).toBeTruthy();
  });

  it("should validate valid uma addresses", () => {
    expect(isValidUmaAddress("$bob@vasp-domain.com")).toBe(true);
    expect(isValidUmaAddress("$BOb@vasp-domain.com")).toBe(true);
    expect(isValidUmaAddress("$BOb_+.somewhere@vasp-domain.com")).toBe(true);
    expect(isValidUmaAddress("$.@vasp-domain.com")).toBe(true);
    expect(isValidUmaAddress("$232358BOB@vasp-domain.com")).toBe(true);
    expect(
      isValidUmaAddress(
        "$therearelessthan65charactersinthisusername1234567891234567891234@vasp-domain.com",
      ),
    ).toBe(true);
  });

  it("should validate invalid uma addresses", () => {
    expect(isValidUmaAddress("$@vasp-domain.com")).toBe(false);
    expect(isValidUmaAddress("bob@vasp-domain.com")).toBe(false);
    expect(isValidUmaAddress("bob@vasp-domain")).toBe(false);
    expect(isValidUmaAddress("$%@vasp-domain.com")).toBe(false);
    expect(
      isValidUmaAddress(
        "$therearemorethan64charactersinthisusername12345678912345678912345@vasp-domain.com",
      ),
    ).toBe(false);
  });

  it("should get the vasp domain from an uma address", () => {
    expect(getVaspDomainFromUmaAddress("$bob@vasp-domain.com")).toEqual(
      "vasp-domain.com",
    );
  });

  it("should sign and verify lnurlp request", async () => {
    const { privateKey, publicKey } = await generateKeypair();
    const queryUrl = await getSignedLnurlpRequestUrl({
      signingPrivateKey: privateKey,
      receiverAddress: "$bob@vasp2.com",
      senderVaspDomain: "vasp1.com",
      isSubjectToTravelRule: true,
    });

    const query = parseLnurlpRequest(queryUrl);
    expect(query.umaVersion).toBe(UmaProtocolVersion);
    const verified = await verifyUmaLnurlpQuerySignature(
      query,
      publicKey,
      new InMemoryNonceValidator(getOneWeekAgoTsMs()),
    );
    expect(verified).toBe(true);
  });

  it("should throw for duplicate nonce when verifying signature", async () => {
    const { privateKey, publicKey } = await generateKeypair();
    const queryUrl = await getSignedLnurlpRequestUrl({
      signingPrivateKey: privateKey,
      receiverAddress: "$bob@vasp2.com",
      senderVaspDomain: "vasp1.com",
      isSubjectToTravelRule: true,
    });

    const query = parseLnurlpRequest(queryUrl);
    const nonceCache = new InMemoryNonceValidator(1);
    nonceCache.checkAndSaveNonce(query.nonce, 2);
    try {
      expect(
        await verifyUmaLnurlpQuerySignature(query, publicKey, nonceCache),
      ).toThrow(
        "Invalid response nonce. Already seen this nonce or the timestamp is too old.",
      );
    } catch (e) {
      if (!isError(e)) {
        throw new Error("Invalid error type");
      }
    }
  });

  it("should throw too old nonce when verifying signature", async () => {
    const { privateKey, publicKey } = await generateKeypair();
    const queryUrl = await getSignedLnurlpRequestUrl({
      signingPrivateKey: privateKey,
      receiverAddress: "$bob@vasp2.com",
      senderVaspDomain: "vasp1.com",
      isSubjectToTravelRule: true,
    });

    const query = parseLnurlpRequest(queryUrl);
    const nonceCache = new InMemoryNonceValidator(
      query.timestamp.getTime() / 1000 + 1000,
    );
    try {
      expect(
        await verifyUmaLnurlpQuerySignature(query, publicKey, nonceCache),
      ).toThrow(
        "Invalid response nonce. Already seen this nonce or the timestamp is too old.",
      );
    } catch (e) {
      if (!isError(e)) {
        throw new Error("Invalid error type");
      }
    }
  });

  it("should verify purge older nonces and cache new nonce", async () => {
    const { privateKey, publicKey } = await generateKeypair();
    const queryUrl = await getSignedLnurlpRequestUrl({
      signingPrivateKey: privateKey,
      receiverAddress: "$bob@vasp2.com",
      senderVaspDomain: "vasp1.com",
      isSubjectToTravelRule: true,
    });

    const query = parseLnurlpRequest(queryUrl);
    const nonceCache = new InMemoryNonceValidator(1000); // milliseconds
    nonceCache.checkAndSaveNonce(query.nonce, 2); // seconds
    nonceCache.purgeNoncesOlderThan(3000); // milliseconds
    const verified = await verifyUmaLnurlpQuerySignature(
      query,
      publicKey,
      nonceCache,
    );
    expect(verified).toBe(true);
  });

  it("should verify high signatures", async () => {
    const publicKey = Buffer.from(
      "047d37ce263a855ff49eb2a537a77a369a861507687bfde1df40062c8774488d644455a44baeb5062b79907d2e6f9692dd5b7bd7c37a3721ba21378d3594672063",
      "hex",
    );
    const queryUrl = new URL(
      "https://uma.jeremykle.in/.well-known/lnurlp/$jeremy?isSubjectToTravelRule=true&nonce=2734010273&signature=30450220694fce49a32c81a58ddb0090ebdd4c7ff3a1e277d28570c61bf2b8274b5d8286022100fe6f0318579e12726531c8a63aea6a94f59f46b7679f970df33f7750a0d88f36&timestamp=1701461443&umaVersion=0.3&vaspDomain=api.ltng.bakkt.com",
    );

    const query = parseLnurlpRequest(queryUrl);
    expect(query.umaVersion).toBe(UmaProtocolVersion);
    const verified = await verifyUmaLnurlpQuerySignature(
      query,
      publicKey,
      new InMemoryNonceValidator(1000),
    );
    expect(verified).toBe(true);
  });

  it("should throw for incorrect public key", async () => {
    const { privateKey } = await generateKeypair();
    const { publicKey: incorrectPublicKey } = await generateKeypair();
    const queryUrl = await getSignedLnurlpRequestUrl({
      signingPrivateKey: privateKey,
      receiverAddress: "$bob@vasp2.com",
      senderVaspDomain: "vasp1.com",
      isSubjectToTravelRule: true,
    });

    const query = parseLnurlpRequest(queryUrl);
    expect(query.umaVersion).toBe(UmaProtocolVersion);
    const verified = await verifyUmaLnurlpQuerySignature(
      query,
      incorrectPublicKey,
      new InMemoryNonceValidator(getOneWeekAgoTsMs()),
    );
    expect(verified).toBe(false);
  });

  it("should throw for invalid public key", async () => {
    const { privateKey, publicKey } = await generateKeypair();
    const queryUrl = await getSignedLnurlpRequestUrl({
      signingPrivateKey: privateKey,
      receiverAddress: "$bob@vasp2.com",
      senderVaspDomain: "vasp1.com",
      isSubjectToTravelRule: true,
    });

    const query = parseLnurlpRequest(queryUrl);
    expect(query.umaVersion).toBe(UmaProtocolVersion);
    /* see https://bit.ly/3Zov3ZA */
    publicKey[0] = 0x01;
    try {
      expect(
        await verifyUmaLnurlpQuerySignature(
          query,
          publicKey,
          new InMemoryNonceValidator(getOneWeekAgoTsMs()),
        ),
      ).toThrow("Public Key could not be parsed");
    } catch (e) {
      if (!isError(e)) {
        throw new Error("Invalid error type");
      }
    }
  });

  it("should sign and verify lnurlp response", async () => {
    const { privateKey: senderSigningPrivateKey } = await generateKeypair();
    const {
      privateKey: receiverSigningPrivateKey,
      publicKey: receiverSigningPublicKey,
    } = await generateKeypair();
    const request = await createLnurlpRequest(senderSigningPrivateKey);
    const metadata = createMetadataForBob();
    const response = await getLnurlpResponse({
      request,
      privateKeyBytes: receiverSigningPrivateKey,
      requiresTravelRuleInfo: true,
      callback: "https://vasp2.com/api/lnurl/payreq/$bob",
      encodedMetadata: metadata,
      minSendableSats: 1,
      maxSendableSats: 10_000_000,
      payerDataOptions: {
        name: {
          mandatory: false,
        },
        identifier: {
          mandatory: false,
        },
        email: {
          mandatory: false,
        },
        compliance: {
          mandatory: true,
        },
      },
      currencyOptions: [
        {
          code: "USD",
          name: "US Dollar",
          symbol: "$",
          multiplier: 34_150,
          minSendable: 1,
          maxSendable: 10_000_000,
          decimals: 2,
        },
      ],
      receiverKycStatus: KycStatus.Verified,
    });

    const responseJson = JSON.stringify(response);
    const parsedResponse = parseLnurlpResponse(responseJson);
    const verified = verifyUmaLnurlpResponseSignature(
      parsedResponse,
      receiverSigningPublicKey,
      new InMemoryNonceValidator(getOneWeekAgoTsMs()),
    );
    expect(verified).toBeTruthy();
  });

  it("should handle a pay request response", async () => {
    const { privateKey: senderSigningPrivateKey } = await generateKeypair();
    const { publicKey: receiverEncryptionPublicKey } = await generateKeypair();

    const trInfo = "some TR info for VASP2";
    const payreq = await getPayRequest({
      amount: 1000,
      currencyCode: "USD",
      payerIdentifier: "$alice@vasp1.com",
      payerKycStatus: KycStatus.Verified,
      receiverEncryptionPubKey: receiverEncryptionPublicKey,
      sendingVaspPrivateKey: senderSigningPrivateKey,
      trInfo: trInfo,
      travelRuleFormat: "fake_format@1.0",
      utxoCallback: "/api/lnurl/utxocallback?txid=1234",
    });

    const invoiceCreator = {
      createUmaInvoice: async () => {
        return "abcdefg123456";
      },
    };

    const metadata = createMetadataForBob();

    const payreqResponse = await getPayReqResponse({
      query: payreq,
      invoiceCreator: invoiceCreator,
      metadata,
      currencyCode: "USD",
      currencyDecimals: 2,
      conversionRate: 34_150,
      receiverFeesMillisats: 100_000,
      receiverChannelUtxos: ["abcdef12345"],
      utxoCallback: "/api/lnurl/utxocallback?txid=1234",
    });

    const payreqResponseJson = JSON.stringify(payreqResponse);
    const parsedPayreqResponse = parsePayReqResponse(payreqResponseJson);
    expect(parsedPayreqResponse).toEqual(payreqResponse);
  });

  it("should create and parse a payreq", async () => {
    const {
      privateKey: senderSigningPrivateKey,
      publicKey: senderSigningPublicKey,
    } = await generateKeypair();
    const {
      privateKey: receiverEncryptionPrivateKey,
      publicKey: receiverEncryptionPublicKey,
    } = await generateKeypair();

    const trInfo = "some TR info for VASP2";
    const payreq = await getPayRequest({
      receiverEncryptionPubKey: receiverEncryptionPublicKey,
      sendingVaspPrivateKey: senderSigningPrivateKey,
      currencyCode: "USD",
      amount: 1000,
      payerIdentifier: "$alice@vasp1.com",
      trInfo,
      payerKycStatus: KycStatus.Verified,
      utxoCallback: "/api/lnurl/utxocallback?txid=1234",
    });

    const payreqJson = JSON.stringify(payreq);

    const parsedPayreq = parsePayRequest(payreqJson);

    const verified = await verifyPayReqSignature(
      parsedPayreq,
      senderSigningPublicKey,
      new InMemoryNonceValidator(getOneWeekAgoTsMs()),
    );
    expect(verified).toBe(true);

    const encryptedTrInfo =
      parsedPayreq.payerData.compliance.encryptedTravelRuleInfo;
    if (!encryptedTrInfo) {
      throw new Error("encryptedTrInfo is undefined");
    }

    const encryptedTrInfoBytes = Buffer.from(encryptedTrInfo, "hex");
    const receiverEncryptionPrivKeyBuffer = Buffer.from(
      receiverEncryptionPrivateKey,
    );
    const eciesReceiverPrivKey = new PrivateKey(
      receiverEncryptionPrivKeyBuffer,
    );
    const decryptedTrInfo = decrypt(
      eciesReceiverPrivKey.toHex(),
      encryptedTrInfoBytes,
    ).toString();
    expect(decryptedTrInfo).toBe(trInfo);
  });
});
