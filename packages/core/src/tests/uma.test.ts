import { randomBytes } from "crypto";
import { decrypt, PrivateKey } from "eciesjs";
import secp256k1 from "secp256k1";
import { dateToUnixSeconds } from "../datetimeUtils.js";
import { isError } from "../errors.js";
import { InMemoryNonceValidator } from "../NonceValidator.js";
import Currency from "../protocol/Currency.js";
import { KycStatus } from "../protocol/KycStatus.js";
import {
  isLnurlpRequestForUma,
  type LnurlpRequest,
} from "../protocol/LnurlpRequest.js";
import LnurlpResponse from "../protocol/LnurlpResponse.js";
import PayReqResponse from "../protocol/PayReqResponse.js";
import { PayRequest } from "../protocol/PayRequest.js";
import { parsePostTransactionCallback } from "../protocol/PostTransactionCallback.js";
import {
  getLnurlpResponse,
  getPayReqResponse,
  getPayRequest,
  getPostTransactionCallback,
  getPubKeyResponse,
  getSignedLnurlpRequestUrl,
  getVaspDomainFromUmaAddress,
  isUmaLnurlpQuery,
  isValidUmaAddress,
  parseLnurlpRequest,
  verifyPayReqResponseSignature,
  verifyPayReqSignature,
  verifyPostTransactionCallbackSignature,
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

const bytesToHex = (bytes: Uint8Array): string => {
  return bytes.reduce((acc: string, byte: number) => {
    return (acc += ("0" + byte.toString(16)).slice(-2));
  }, "");
};

const certString =
  "-----BEGIN CERTIFICATE-----\n" +
  "MIIB1zCCAXygAwIBAgIUGN3ihBj1RnKoeTM/auDFnNoThR4wCgYIKoZIzj0EAwIw\n" +
  "QjELMAkGA1UEBhMCVVMxEzARBgNVBAgMCmNhbGlmb3JuaWExDjAMBgNVBAcMBWxv\n" +
  "cyBhMQ4wDAYDVQQKDAVsaWdodDAeFw0yNDAzMDUyMTAzMTJaFw0yNDAzMTkyMTAz\n" +
  "MTJaMEIxCzAJBgNVBAYTAlVTMRMwEQYDVQQIDApjYWxpZm9ybmlhMQ4wDAYDVQQH\n" +
  "DAVsb3MgYTEOMAwGA1UECgwFbGlnaHQwVjAQBgcqhkjOPQIBBgUrgQQACgNCAARB\n" +
  "nFRn6lY/ABD9YU+F6IWsmcIbjo1BYkEXX91e/SJE/pB+Lm+j3WYxsbF80oeY2o2I\n" +
  "KjTEd21EzECQeBx6reobo1MwUTAdBgNVHQ4EFgQUU87LnQdiP6XIE6LoKU1PZnbt\n" +
  "bMwwHwYDVR0jBBgwFoAUU87LnQdiP6XIE6LoKU1PZnbtbMwwDwYDVR0TAQH/BAUw\n" +
  "AwEB/zAKBggqhkjOPQQDAgNJADBGAiEAvsrvoeo3rbgZdTHxEUIgP0ArLyiO34oz\n" +
  "NlwL4gk5GpgCIQCvRx4PAyXNV9T6RRE+3wFlqwluOc/pPOjgdRw/wpoNPQ==\n" +
  "-----END CERTIFICATE-----\n" +
  "-----BEGIN CERTIFICATE-----\n" +
  "MIICdjCCAV6gAwIBAgIUAekCcU1Qhjo2Y6L2Down9BLdfdUwDQYJKoZIhvcNAQEL\n" +
  "BQAwNDELMAkGA1UEBhMCVVMxCzAJBgNVBAgMAmNhMQwwCgYDVQQHDANsb3MxCjAI\n" +
  "BgNVBAoMAWEwHhcNMjQwMzA4MDEwNTU3WhcNMjUwMzA4MDEwNTU3WjBAMQswCQYD\n" +
  "VQQGEwJVUzELMAkGA1UECAwCY2ExDDAKBgNVBAcMA2xvczEKMAgGA1UECgwBYTEK\n" +
  "MAgGA1UECwwBYTBWMBAGByqGSM49AgEGBSuBBAAKA0IABJ11ZAQKylgIzZmuI5NE\n" +
  "+DyZ9BUDZhxUPSxTxl+s1am+Lxzr9D7wlwOiiqCYHFWpL6lkCmJcCC06P3RyzXIT\n" +
  "KmyjQjBAMB0GA1UdDgQWBBRXgW6xGB3+mTSSUKlhSiu3LS+TKTAfBgNVHSMEGDAW\n" +
  "gBTFmyv7+YDpK0WAOHJYAzjynmWsMDANBgkqhkiG9w0BAQsFAAOCAQEAFVAA3wo+\n" +
  "Hi/k+OWO/1CFqIRV/0cA8F05sBMiKVA11xB6I1y54aUV4R0jN76fOiN1jnZqTRnM\n" +
  "G8rZUfQgE/LPVbb1ERHQfd8yaeI+TerKdPkMseu/jnvI+dDJfQdsY7iaa7NPO0dm\n" +
  "t8Nz75cYW8kYuDaq0Hb6uGsywf9LGO/VjrDhyiRxmZ1Oq4JxQmLuh5SDcPfqHTR3\n" +
  "VbMC1b7eVXaA9O2qYS36zv8cCUSUl5sOSwM6moaFN+xLtVNJ6ZhKPNS2Gd8znhzZ\n" +
  "AQZcDDpXBO6ORNbhVk5A3X6eQX4Ek1HBTa3pcSUQomYAA9TIuVzL6DSot5GWS8Ek\n" +
  "usLY8crt6ys3KQ==\n" +
  "-----END CERTIFICATE-----";

const certPubKey =
  "04419c5467ea563f0010fd614f85e885ac99c21b8e8d416241175fdd5efd2244fe907e2e6fa3dd6631b1b17cd28798da8d882a34c4776d44cc4090781c7aadea1b";

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
      umaVersion: "1.0",
    };
    const urlString =
      "https://vasp2/.well-known/lnurlp/bob?signature=signature&nonce=12345&vaspDomain=vasp1&umaVersion=1.0&isSubjectToTravelRule=true&timestamp=" +
      timeSec;
    const urlObj = new URL(urlString);
    const query = parseLnurlpRequest(urlObj);
    expect(query).toEqual(expectedQuery);
  });

  it("validates uma queries", () => {
    const umaQuery =
      "https://vasp2.com/.well-known/lnurlp/bob?signature=signature&nonce=12345&vaspDomain=vasp1.com&umaVersion=1.0&isSubjectToTravelRule=true&timestamp=12345678";
    expect(isUmaLnurlpQuery(new URL(umaQuery))).toBeTruthy();
  });

  it("returns expected result for missing query params", () => {
    // Missing signature
    let url = new URL(
      "https://vasp2.com/.well-known/lnurlp/bob?nonce=12345&vaspDomain=vasp1.com&umaVersion=1.0&isSubjectToTravelRule=true&timestamp=12345678",
    );
    expect(isUmaLnurlpQuery(url)).toBe(false);

    // Missing umaVersion
    url = new URL(
      "https://vasp2.com/.well-known/lnurlp/bob?signature=signature&nonce=12345&vaspDomain=vasp1.com&isSubjectToTravelRule=true&timestamp=12345678",
    );
    expect(isUmaLnurlpQuery(url)).toBe(false);

    // Missing nonce
    url = new URL(
      "https://vasp2.com/.well-known/lnurlp/bob?signature=signature&vaspDomain=vasp1.com&umaVersion=1.0&isSubjectToTravelRule=true&timestamp=12345678",
    );
    expect(isUmaLnurlpQuery(url)).toBe(false);

    // Missing vaspDomain
    url = new URL(
      "https://vasp2.com/.well-known/lnurlp/bob?signature=signature&umaVersion=1.0&nonce=12345&isSubjectToTravelRule=true&timestamp=12345678",
    );
    expect(isUmaLnurlpQuery(url)).toBe(false);

    url = new URL(
      "https://vasp2.com/.well-known/lnurlp/bob?signature=signature&umaVersion=1.0&nonce=12345&vaspDomain=vasp1.com&timestamp=12345678",
    );
    // IsSubjectToTravelRule is optional
    expect(isUmaLnurlpQuery(url)).toBe(true);

    // Missing timestamp
    url = new URL(
      "https://vasp2.com/.well-known/lnurlp/bob?signature=signature&nonce=12345&vaspDomain=vasp1.com&umaVersion=1.0&isSubjectToTravelRule=true",
    );
    expect(isUmaLnurlpQuery(url)).toBe(false);

    // Missing all required params
    url = new URL("https://vasp2.com/.well-known/lnurlp/bob");
    expect(isUmaLnurlpQuery(url)).toBe(false);
  });

  it("should be invalid uma query when url path is invalid", () => {
    let url = new URL(
      "https://vasp2.com/.well-known/lnurla/bob?signature=signature&nonce=12345&vaspDomain=vasp1.com&umaVersion=1.0&isSubjectToTravelRule=true&timestamp=12345678",
    );
    expect(isUmaLnurlpQuery(url)).toBe(false);

    url = new URL(
      "https://vasp2.com/bob?signature=signature&nonce=12345&vaspDomain=vasp1.com&umaVersion=1.0&isSubjectToTravelRule=true&timestamp=12345678",
    );
    expect(isUmaLnurlpQuery(url)).toBe(false);

    url = new URL(
      "https://vasp2.com/?signature=signature&nonce=12345&vaspDomain=vasp1.com&umaVersion=1.0&isSubjectToTravelRule=true&timestamp=12345678",
    );
    expect(isUmaLnurlpQuery(url)).toBe(false);
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
    expect(isLnurlpRequestForUma(query)).toBe(true);
    expect(query.umaVersion).toBe(UmaProtocolVersion);
    const verified = await verifyUmaLnurlpQuerySignature(
      query,
      {
        signingPubKey: bytesToHex(publicKey),
        encryptionPubKey: bytesToHex(publicKey),
      },
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
    if (!isLnurlpRequestForUma(query)) {
      throw new Error("Invalid UMA query");
    }
    const nonceCache = new InMemoryNonceValidator(1);
    nonceCache.checkAndSaveNonce(query.nonce, 2);
    try {
      expect(
        await verifyUmaLnurlpQuerySignature(
          query,
          {
            signingPubKey: bytesToHex(publicKey),
            encryptionPubKey: bytesToHex(publicKey),
          },
          nonceCache,
        ),
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
    if (!isLnurlpRequestForUma(query)) {
      throw new Error("Invalid UMA query");
    }
    const nonceCache = new InMemoryNonceValidator(
      query.timestamp.getTime() / 1000 + 1000,
    );
    try {
      expect(
        await verifyUmaLnurlpQuerySignature(
          query,
          {
            signingPubKey: bytesToHex(publicKey),
            encryptionPubKey: bytesToHex(publicKey),
          },
          nonceCache,
        ),
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
    if (!isLnurlpRequestForUma(query)) {
      throw new Error("Invalid UMA query");
    }
    const nonceCache = new InMemoryNonceValidator(1000); // milliseconds
    nonceCache.checkAndSaveNonce(query.nonce, 2); // seconds
    nonceCache.purgeNoncesOlderThan(3000); // milliseconds
    const verified = await verifyUmaLnurlpQuerySignature(
      query,
      {
        signingPubKey: bytesToHex(publicKey),
        encryptionPubKey: bytesToHex(publicKey),
      },
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
      "https://uma.jeremykle.in/.well-known/lnurlp/$jeremy?isSubjectToTravelRule=true&nonce=2734010273&signature=30450220694fce49a32c81a58ddb0090ebdd4c7ff3a1e277d28570c61bf2b8274b5d8286022100fe6f0318579e12726531c8a63aea6a94f59f46b7679f970df33f7750a0d88f36&timestamp=1701461443&umaVersion=1.0&vaspDomain=api.ltng.bakkt.com",
    );

    const query = parseLnurlpRequest(queryUrl);
    expect(query.umaVersion).toBe(UmaProtocolVersion);
    const verified = await verifyUmaLnurlpQuerySignature(
      query,
      {
        signingPubKey: bytesToHex(publicKey),
        encryptionPubKey: bytesToHex(publicKey),
      },
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
      {
        signingPubKey: bytesToHex(incorrectPublicKey),
        encryptionPubKey: bytesToHex(incorrectPublicKey),
      },
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
          {
            signingPubKey: bytesToHex(publicKey),
            encryptionPubKey: bytesToHex(publicKey),
          },
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
    const { privateKey: receiverPrivateKey, publicKey: receiverPublicKey } =
      await generateKeypair();
    const request = await createLnurlpRequest(senderSigningPrivateKey);
    const metadata = createMetadataForBob();
    const response = await getLnurlpResponse({
      request,
      privateKeyBytes: receiverPrivateKey,
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
        Currency.parse({
          code: "USD",
          name: "US Dollar",
          symbol: "$",
          multiplier: 34_150,
          convertible: {
            min: 1,
            max: 10_000_000,
          },
          decimals: 2,
        }),
      ],
      receiverKycStatus: KycStatus.Verified,
    });

    const parsedResponse = LnurlpResponse.parse(response);
    const verified = verifyUmaLnurlpResponseSignature(
      parsedResponse,
      {
        signingPubKey: bytesToHex(receiverPublicKey),
        encryptionPubKey: bytesToHex(receiverPublicKey),
      },
      new InMemoryNonceValidator(getOneWeekAgoTsMs()),
    );
    expect(verified).toBeTruthy();
  });

  it("should handle a pay request response", async () => {
    const { privateKey: senderSigningPrivateKey } = await generateKeypair();
    const { publicKey: receiverEncryptionPublicKey } = await generateKeypair();
    const {
      privateKey: receiverSigningPrivateKey,
      publicKey: receiverSigningPublicKey,
    } = await generateKeypair();

    const trInfo = "some TR info for VASP2";
    const payreq = await getPayRequest({
      amount: 1000,
      receivingCurrencyCode: "USD",
      isAmountInReceivingCurrency: true,
      payerIdentifier: "$alice@vasp1.com",
      payerKycStatus: KycStatus.Verified,
      receiverEncryptionPubKey: receiverEncryptionPublicKey,
      sendingVaspPrivateKey: senderSigningPrivateKey,
      trInfo: trInfo,
      travelRuleFormat: "fake_format@1.0",
      utxoCallback: "/api/lnurl/utxocallback?txid=1234",
      umaMajorVersion: 1,
    });

    const invoiceCreator = {
      createUmaInvoice: async (amountMsats: number) => {
        expect(amountMsats).toBe(1000 * 34_150 + 100_000);
        return "abcdefg123456";
      },
    };

    const metadata = createMetadataForBob();

    const payreqResponse = await getPayReqResponse({
      request: payreq,
      invoiceCreator: invoiceCreator,
      metadata,
      receivingCurrencyCode: "USD",
      receivingCurrencyDecimals: 2,
      conversionRate: 34_150,
      receiverFeesMillisats: 100_000,
      receiverChannelUtxos: ["abcdef12345"],
      utxoCallback: "/api/lnurl/utxocallback?txid=1234",
      receivingVaspPrivateKey: receiverSigningPrivateKey,
      payeeIdentifier: "$bob@vasp2.com",
    });

    expect(payreqResponse.converted?.amount).toBe(1000);
    expect(payreqResponse.converted?.currencyCode).toBe("USD");
    expect(payreqResponse.umaMajorVersion).toBe(1);
    const payreqResponseJson = payreqResponse.toJsonString();
    const parsedPayreqResponse = PayReqResponse.fromJson(payreqResponseJson);
    expect(parsedPayreqResponse).toEqual(payreqResponse);
    const verified = await verifyPayReqResponseSignature(
      parsedPayreqResponse,
      "$alice@vasp1.com",
      "$bob@vasp2.com",
      {
        signingPubKey: bytesToHex(receiverSigningPublicKey),
        encryptionPubKey: bytesToHex(receiverEncryptionPublicKey),
      },
      new InMemoryNonceValidator(getOneWeekAgoTsMs()),
    );
    expect(verified).toBe(true);
  });

  it("should handle a pay request response for amount in msats", async () => {
    const { privateKey: senderSigningPrivateKey } = await generateKeypair();
    const { publicKey: receiverEncryptionPublicKey } = await generateKeypair();
    const {
      privateKey: receiverSigningPrivateKey,
      publicKey: receiverSigningPublicKey,
    } = await generateKeypair();

    const trInfo = "some TR info for VASP2";
    const payreq = await getPayRequest({
      amount: 1_000_000,
      receivingCurrencyCode: "USD",
      isAmountInReceivingCurrency: false,
      payerIdentifier: "$alice@vasp1.com",
      payerKycStatus: KycStatus.Verified,
      receiverEncryptionPubKey: receiverEncryptionPublicKey,
      sendingVaspPrivateKey: senderSigningPrivateKey,
      trInfo: trInfo,
      travelRuleFormat: "fake_format@1.0",
      utxoCallback: "/api/lnurl/utxocallback?txid=1234",
      umaMajorVersion: 1,
    });
    expect(payreq.sendingAmountCurrencyCode).toBe("SAT");
    expect(payreq.receivingCurrencyCode).toBe("USD");

    const invoiceCreator = {
      createUmaInvoice: async (amountMsats: number) => {
        expect(amountMsats).toBe(1_000_000);
        return "abcdefg123456";
      },
    };

    const metadata = createMetadataForBob();

    const payreqResponse = await getPayReqResponse({
      request: payreq,
      invoiceCreator: invoiceCreator,
      metadata,
      receivingCurrencyCode: "USD",
      receivingCurrencyDecimals: 2,
      conversionRate: 34_150,
      receiverFeesMillisats: 100_000,
      receiverChannelUtxos: ["abcdef12345"],
      utxoCallback: "/api/lnurl/utxocallback?txid=1234",
      receivingVaspPrivateKey: receiverSigningPrivateKey,
      payeeIdentifier: "$bob@vasp2.com",
    });

    expect(payreqResponse.converted?.amount).toBe(
      Math.round((1_000_000 - 100_000) / 34_150),
    );
    expect(payreqResponse.converted?.currencyCode).toBe("USD");
    const payreqResponseJson = payreqResponse.toJsonString();
    const parsedPayreqResponse = PayReqResponse.fromJson(payreqResponseJson);
    expect(parsedPayreqResponse).toEqual(payreqResponse);
    const verified = await verifyPayReqResponseSignature(
      parsedPayreqResponse,
      "$alice@vasp1.com",
      "$bob@vasp2.com",
      {
        signingPubKey: bytesToHex(receiverSigningPublicKey),
        encryptionPubKey: bytesToHex(receiverEncryptionPublicKey),
      },
      new InMemoryNonceValidator(getOneWeekAgoTsMs()),
    );
    expect(verified).toBe(true);
  });

  it("should create and parse a payreq", async () => {
    const { privateKey: senderPrivateKey, publicKey: senderPublicKey } =
      await generateKeypair();
    const {
      privateKey: receiverEncryptionPrivateKey,
      publicKey: receiverEncryptionPublicKey,
    } = await generateKeypair();

    const trInfo = "some TR info for VASP2";
    const payreq = await getPayRequest({
      receiverEncryptionPubKey: receiverEncryptionPublicKey,
      sendingVaspPrivateKey: senderPrivateKey,
      receivingCurrencyCode: "USD",
      isAmountInReceivingCurrency: true,
      amount: 1000,
      payerIdentifier: "$alice@vasp1.com",
      trInfo,
      payerKycStatus: KycStatus.Verified,
      utxoCallback: "/api/lnurl/utxocallback?txid=1234",
      umaMajorVersion: 1,
    });

    const payreqJson = payreq.toJsonString();

    const parsedPayreq = PayRequest.fromJson(payreqJson);

    const verified = await verifyPayReqSignature(
      parsedPayreq,
      {
        signingPubKey: bytesToHex(senderPublicKey),
        encryptionPubKey: bytesToHex(senderPublicKey),
      },
      new InMemoryNonceValidator(getOneWeekAgoTsMs()),
    );
    expect(verified).toBe(true);

    const encryptedTrInfo =
      parsedPayreq.payerData?.compliance?.encryptedTravelRuleInfo;
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

  it("should sign and verify a post transaction callback", async () => {
    const { privateKey: privateKey, publicKey: publicKey } =
      await generateKeypair();
    const callback = await getPostTransactionCallback({
      utxos: [{ utxo: "abcdef12345", amount: 1000 }],
      vaspDomain: "my-vasp.com",
      signingPrivateKey: privateKey,
    });

    const callbackJson = JSON.stringify(callback);
    const parsedPostTransacationCallback =
      parsePostTransactionCallback(callbackJson);
    expect(parsedPostTransacationCallback).toEqual(callback);
    const verified = await verifyPostTransactionCallbackSignature(
      parsedPostTransacationCallback,
      {
        signingPubKey: bytesToHex(publicKey),
        encryptionPubKey: bytesToHex(publicKey),
      },
      new InMemoryNonceValidator(getOneWeekAgoTsMs()),
    );
    expect(verified).toBe(true);
  });

  it("should serialize and deserialize pub key response", async () => {
    const keysOnlyResponse = {
      signingPubKey: certPubKey,
      encryptionPubKey: certPubKey,
    };
    let responseJson = JSON.stringify(keysOnlyResponse);
    let parsedPubKeyResponse = JSON.parse(responseJson);
    expect(parsedPubKeyResponse).toEqual(keysOnlyResponse);

    const certsOnlyResponse = {
      signingCertChain: certString,
      encryptionCertChain: certString,
    };
    responseJson = JSON.stringify(certsOnlyResponse);
    parsedPubKeyResponse = JSON.parse(responseJson);
    expect(parsedPubKeyResponse).toEqual(certsOnlyResponse);

    const keysAndCertsResponse = getPubKeyResponse({
      signingCertChain: certString,
      encryptionCertChain: certString,
    });
    responseJson = JSON.stringify(keysAndCertsResponse);
    parsedPubKeyResponse = JSON.parse(responseJson);
    expect(parsedPubKeyResponse).toEqual(keysAndCertsResponse);
  });

  it("should extract correct pub key from cert", async () => {
    const pubKeyResponse = getPubKeyResponse({
      signingCertChain: certString,
      encryptionCertChain: certString,
    });
    expect(pubKeyResponse.signingPubKey).toEqual(certPubKey);
    expect(pubKeyResponse.encryptionPubKey).toEqual(certPubKey);
  });
});
