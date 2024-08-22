import { randomBytes, type X509Certificate } from "crypto";
import { decrypt, PrivateKey } from "eciesjs";
import secp256k1 from "secp256k1";
import { getX509CertChain } from "../certUtils.js";
import { dateToUnixSeconds } from "../datetimeUtils.js";
import { isError } from "../errors.js";
import { InMemoryNonceValidator } from "../NonceValidator.js";
import { Currency } from "../protocol/Currency.js";
import { Invoice, InvoiceSerializer } from "../protocol/Invoice.js";
import { KycStatus } from "../protocol/KycStatus.js";
import {
  isLnurlpRequestForUma,
  type LnurlpRequest,
} from "../protocol/LnurlpRequest.js";
import { LnurlpResponse } from "../protocol/LnurlpResponse.js";
import { PayReqResponse } from "../protocol/PayReqResponse.js";
import { PayRequest } from "../protocol/PayRequest.js";
import { parsePostTransactionCallback } from "../protocol/PostTransactionCallback.js";
import { PubKeyResponse } from "../protocol/PubKeyResponse.js";
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

const certPrivKeyBytes = Buffer.from(
  "77e891f0ecd265a3cda435eaa73792233ebd413aeb0dbb66f2940babfc9a2667",
  "hex",
);

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

function createTestUmaInvoice(): Invoice {
  return {
    receiverUma: "$foo@bar.com",
    invoiceUUID: "c7c07fec-cf00-431c-916f-6c13fc4b69f9",
    amount: 1000,
    receivingCurrency: {
      code: "USD",
      name: "US Dollar",
      symbol: "$",
      decimals: 2,
    },
    expiration: 1000000,
    isSubjectToTravelRule: true,
    requiredPayerData: {
      name: {
        mandatory: false,
      },
      email: {
        mandatory: false,
      },
      compliance: {
        mandatory: true,
      },
    },
    umaVersion: "0.3",
    commentCharsAllowed: undefined,
    senderUma: undefined,
    invoiceLimit: undefined,
    kycStatus: KycStatus.Verified,
    callback: "https://example.com/callback",
    signature: new TextEncoder().encode("signature"),
  };
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
    const queryUrl = await getSignedLnurlpRequestUrl({
      signingPrivateKey: certPrivKeyBytes,
      receiverAddress: "$bob@vasp2.com",
      senderVaspDomain: "vasp1.com",
      isSubjectToTravelRule: true,
    });

    const query = parseLnurlpRequest(queryUrl);
    expect(isLnurlpRequestForUma(query)).toBe(true);
    expect(query.umaVersion).toBe(UmaProtocolVersion);
    const verified = await verifyUmaLnurlpQuerySignature(
      query,
      getPubKeyResponse({
        signingCertChainPem: certString,
        encryptionCertChainPem: certString,
      }),
      new InMemoryNonceValidator(getOneWeekAgoTsMs()),
    );
    expect(verified).toBe(true);
  });

  it("should throw for duplicate nonce when verifying signature", async () => {
    const queryUrl = await getSignedLnurlpRequestUrl({
      signingPrivateKey: certPrivKeyBytes,
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
          getPubKeyResponse({
            signingCertChainPem: certString,
            encryptionCertChainPem: certString,
          }),
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
    const queryUrl = await getSignedLnurlpRequestUrl({
      signingPrivateKey: certPrivKeyBytes,
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
          getPubKeyResponse({
            signingCertChainPem: certString,
            encryptionCertChainPem: certString,
          }),
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
    const queryUrl = await getSignedLnurlpRequestUrl({
      signingPrivateKey: certPrivKeyBytes,
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
      getPubKeyResponse({
        signingCertChainPem: certString,
        encryptionCertChainPem: certString,
      }),
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
      new PubKeyResponse(
        undefined,
        undefined,
        bytesToHex(publicKey),
        bytesToHex(publicKey),
        undefined,
      ),
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
      new PubKeyResponse(
        undefined,
        undefined,
        bytesToHex(incorrectPublicKey),
        bytesToHex(incorrectPublicKey),
        undefined,
      ),
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
          getPubKeyResponse({
            signingCertChainPem: certString,
            encryptionCertChainPem: certString,
          }),
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
    const request = await createLnurlpRequest(senderSigningPrivateKey);
    const metadata = createMetadataForBob();
    const response = await getLnurlpResponse({
      request,
      privateKeyBytes: certPrivKeyBytes,
      requiresTravelRuleInfo: true,
      callback: "https://vasp2.com/api/lnurl/payreq/$bob",
      encodedMetadata: metadata,
      minSendableSats: 1,
      maxSendableSats: 10_000_000,
      payerDataOptions: {
        name: {
          mandatory: false,
        },
        email: {
          mandatory: false,
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
      getPubKeyResponse({
        signingCertChainPem: certString,
        encryptionCertChainPem: certString,
      }),
      new InMemoryNonceValidator(getOneWeekAgoTsMs()),
    );
    expect(verified).toBeTruthy();
    expect(parsedResponse.payerData).toBeDefined();
    expect(parsedResponse.payerData!["compliance"].mandatory).toBe(true);
    expect(parsedResponse.payerData!["identifier"].mandatory).toBe(true);
  });

  it("should handle a pay request response", async () => {
    const { privateKey: senderSigningPrivateKey } = await generateKeypair();
    const { publicKey: receiverEncryptionPublicKey } = await generateKeypair();

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
      receivingVaspPrivateKey: certPrivKeyBytes,
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
      getPubKeyResponse({
        signingCertChainPem: certString,
        encryptionCertChainPem: certString,
      }),
      new InMemoryNonceValidator(getOneWeekAgoTsMs()),
    );
    expect(verified).toBe(true);
  });

  it("should handle a pay request response for amount in msats", async () => {
    const { privateKey: senderSigningPrivateKey } = await generateKeypair();
    const { publicKey: receiverEncryptionPublicKey } = await generateKeypair();

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
    expect(payreq.sendingAmountCurrencyCode).toBeUndefined();
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
      receivingVaspPrivateKey: certPrivKeyBytes,
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
      getPubKeyResponse({
        signingCertChainPem: certString,
        encryptionCertChainPem: certString,
      }),
      new InMemoryNonceValidator(getOneWeekAgoTsMs()),
    );
    expect(verified).toBe(true);
  });

  it("should create and parse a payreq", async () => {
    const {
      privateKey: receiverEncryptionPrivateKey,
      publicKey: receiverEncryptionPublicKey,
    } = await generateKeypair();

    const trInfo = "some TR info for VASP2";
    const payreq = await getPayRequest({
      receiverEncryptionPubKey: receiverEncryptionPublicKey,
      sendingVaspPrivateKey: certPrivKeyBytes,
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
      getPubKeyResponse({
        signingCertChainPem: certString,
        encryptionCertChainPem: certString,
      }),
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
    const callback = await getPostTransactionCallback({
      utxos: [{ utxo: "abcdef12345", amountMsats: 1000 }],
      vaspDomain: "my-vasp.com",
      signingPrivateKey: certPrivKeyBytes,
    });

    const callbackJson = JSON.stringify(callback);
    const parsedPostTransacationCallback =
      parsePostTransactionCallback(callbackJson);
    expect(parsedPostTransacationCallback).toEqual(callback);
    const verified = await verifyPostTransactionCallbackSignature(
      parsedPostTransacationCallback,
      getPubKeyResponse({
        signingCertChainPem: certString,
        encryptionCertChainPem: certString,
      }),
      new InMemoryNonceValidator(getOneWeekAgoTsMs()),
    );
    expect(verified).toBe(true);
  });

  it("should encrypt using specific public key", async () => {
    const { privateKey: senderSigningPrivateKey } = await generateKeypair();
    // This pubkey response is similar to ones generated from other SDKs.
    const pubkeys = PubKeyResponse.fromJson(`{
      "encryptionCertChain": [
        "30820203308201a8a003020102021468951575052e6746ed833d3fa24328a65d07d2a2300a06082a8648ce3d0403023058310b30090603550406130255533113301106035504080c0a43616c69666f726e69613114301206035504070c0b4c6f7320416e67656c6573311e301c060355040a0c154c69676874737061726b2047726f757020496e632e301e170d3234303430323035323232325a170d3234303530323035323232325a3058310b30090603550406130255533113301106035504080c0a43616c69666f726e69613114301206035504070c0b4c6f7320416e67656c6573311e301c060355040a0c154c69676874737061726b2047726f757020496e632e3056301006072a8648ce3d020106052b8104000a03420004bf99978277b2370c1e8fd520aa407af400573ec42ece45f90debfb5414be6b70e041606a1c0fd28ff129c84f0af6daa966e2c9b3980b59f02444e53a068d5c65a3533051301d0603551d0e04160414e0ae53fdf69ab09b6a0afaea46e358746d66b04d301f0603551d23041830168014e0ae53fdf69ab09b6a0afaea46e358746d66b04d300f0603551d130101ff040530030101ff300a06082a8648ce3d0403020349003046022100fca75215d93aff51441e3c0e9e5c3b8e5a3d257958ce5a4e761f35f6fda02a17022100fef0ae40f34e15f5f9b705553c827828fe0dcc526ef1dffe0afea193ebead954"
      ],
      "encryptionPubKey": "04bf99978277b2370c1e8fd520aa407af400573ec42ece45f90debfb5414be6b70e041606a1c0fd28ff129c84f0af6daa966e2c9b3980b59f02444e53a068d5c65",
      "signingCertChain": [
        "30820203308201a8a003020102021468951575052e6746ed833d3fa24328a65d07d2a2300a06082a8648ce3d0403023058310b30090603550406130255533113301106035504080c0a43616c69666f726e69613114301206035504070c0b4c6f7320416e67656c6573311e301c060355040a0c154c69676874737061726b2047726f757020496e632e301e170d3234303430323035323232325a170d3234303530323035323232325a3058310b30090603550406130255533113301106035504080c0a43616c69666f726e69613114301206035504070c0b4c6f7320416e67656c6573311e301c060355040a0c154c69676874737061726b2047726f757020496e632e3056301006072a8648ce3d020106052b8104000a03420004bf99978277b2370c1e8fd520aa407af400573ec42ece45f90debfb5414be6b70e041606a1c0fd28ff129c84f0af6daa966e2c9b3980b59f02444e53a068d5c65a3533051301d0603551d0e04160414e0ae53fdf69ab09b6a0afaea46e358746d66b04d301f0603551d23041830168014e0ae53fdf69ab09b6a0afaea46e358746d66b04d300f0603551d130101ff040530030101ff300a06082a8648ce3d0403020349003046022100fca75215d93aff51441e3c0e9e5c3b8e5a3d257958ce5a4e761f35f6fda02a17022100fef0ae40f34e15f5f9b705553c827828fe0dcc526ef1dffe0afea193ebead954"
      ],
      "signingPubKey": "04bf99978277b2370c1e8fd520aa407af400573ec42ece45f90debfb5414be6b70e041606a1c0fd28ff129c84f0af6daa966e2c9b3980b59f02444e53a068d5c65"
    }`);

    const trInfo = "some unencrypted travel rule info";
    const payreq = await getPayRequest({
      amount: 1_000_000,
      receivingCurrencyCode: "USD",
      isAmountInReceivingCurrency: false,
      payerIdentifier: "$alice@vasp1.com",
      payerKycStatus: KycStatus.Verified,
      receiverEncryptionPubKey: pubkeys.getEncryptionPubKey(),
      sendingVaspPrivateKey: senderSigningPrivateKey,
      trInfo: trInfo,
      travelRuleFormat: "fake_format@1.0",
      utxoCallback: "/api/lnurl/utxocallback?txid=1234",
      umaMajorVersion: 1,
    });
    const privkey =
      "afbbdcb77d7afc5496ef4f016072deaa326a1b9a4deb72c7a67febaf169c4d66";
    const encryptedTrInfo =
      payreq.payerData?.compliance?.encryptedTravelRuleInfo;
    if (!encryptedTrInfo) {
      throw new Error("encryptedTrInfo is undefined");
    }
    const encryptedTrInfoBytes = Buffer.from(encryptedTrInfo, "hex");
    const eciesPrivKey = new PrivateKey(Buffer.from(privkey, "hex"));
    const decryptedTrInfo = decrypt(
      eciesPrivKey.toHex(),
      encryptedTrInfoBytes,
    ).toString();
    expect(decryptedTrInfo).toBe(trInfo);
  });

  it("should create / serialize / deserialize UMA Invoice in TLV Format", async () => {
    const invoice = createTestUmaInvoice();
    let tlvBytes = InvoiceSerializer.toTLV(invoice);
    let decodedInvoice = InvoiceSerializer.fromTLV(tlvBytes);
    expect(decodedInvoice.receiverUma).toBe("$foo@bar.com");
    expect(decodedInvoice.amount).toBe(1000);
    expect(decodedInvoice.invoiceUUID).toBe(
      "c7c07fec-cf00-431c-916f-6c13fc4b69f9",
    );
    expect(decodedInvoice.expiration).toBe(1_000_000);
    expect(decodedInvoice.umaVersion).toBe("0.3");
    expect(decodedInvoice.kycStatus).toBe(KycStatus.Verified);
    expect(decodedInvoice.callback).toBe("https://example.com/callback");
  });

  it("should bech32 encode UMA Invoice", async () => {
    const referenceBech32str =
      "uma1qqxzgen0daqxyctj9e3k7mgpy33nwcesxanx2cedvdnrqvpdxsenzced8ycnve3dxe3nzvmxvv6xyd3evcusyqsraqp3vqqr24f5gqgf24fjq3r0d3kxzuszqyjqxqgzqszqqr6zgqzszqgxrd3k7mtsd35kzmnrv5arztr9d4skjmp6xqkxuctdv5arqpcrxqhrxzcg2ez4yj2xf9z5grqudp68gurn8ghj7etcv9khqmr99e3k7mf0vdskcmrzv93kkeqfwd5kwmnpw36hyeg73rn40";
    const invoice = createTestUmaInvoice();
    const bech32str = InvoiceSerializer.toBech32(invoice);
    expect(bech32str).toBe(referenceBech32str);
  });

  it("should decode a bech32 string into a UMA invoice", async () => {
    const referenceBech32str =
      "uma1qqxzgen0daqxyctj9e3k7mgpy33nwcesxanx2cedvdnrqvpdxsenzced8ycnve3dxe3nzvmxvv6xyd3evcusyqsraqp3vqqr24f5gqgf24fjq3r0d3kxzuszqyjqxqgzqszqqr6zgqzszqgxrd3k7mtsd35kzmnrv5arztr9d4skjmp6xqkxuctdv5arqpcrxqhrxzcg2ez4yj2xf9z5grqudp68gurn8ghj7etcv9khqmr99e3k7mf0vdskcmrzv93kkeqfwd5kwmnpw36hyeg73rn40";
    const invoice = createTestUmaInvoice();
    const decodedInvoice = InvoiceSerializer.fromBech32(referenceBech32str);
    expect(decodedInvoice.receiverUma).toBe(invoice.receiverUma);
    expect(decodedInvoice.amount).toBe(invoice.amount);
    expect(decodedInvoice.callback).toBe(invoice.callback);
    expect(decodedInvoice.expiration).toBe(invoice.expiration);
    expect(decodedInvoice.invoiceUUID).toBe(invoice.invoiceUUID);
  });

  it("should serialize and deserialize pub key response", async () => {
    const keysOnlyResponse = {
      signingPubKey: certPubKey,
      encryptionPubKey: certPubKey,
    };
    let responseJson = JSON.stringify(keysOnlyResponse);
    let parsedPubKeyResponse = PubKeyResponse.fromJson(responseJson);
    expect(parsedPubKeyResponse.signingCertChain).toBeUndefined();
    expect(parsedPubKeyResponse.encryptionCertChain).toBeUndefined();
    expect(parsedPubKeyResponse.signingPubKey).toEqual(certPubKey);
    expect(parsedPubKeyResponse.encryptionPubKey).toEqual(certPubKey);
    expect(parsedPubKeyResponse.expirationTimestamp).toBeUndefined();

    const certsOnlyResponse = new PubKeyResponse(
      getX509CertChain(certString),
      getX509CertChain(certString),
      undefined,
      undefined,
      undefined,
    );
    responseJson = certsOnlyResponse.toJsonString();
    parsedPubKeyResponse = PubKeyResponse.fromJson(responseJson);
    expect(
      parsedPubKeyResponse.signingCertChain?.map(
        (cert: X509Certificate) => cert.raw,
      ),
    ).toEqual(
      certsOnlyResponse.signingCertChain?.map(
        (cert: X509Certificate) => cert.raw,
      ),
    );
    expect(
      parsedPubKeyResponse.encryptionCertChain?.map(
        (cert: X509Certificate) => cert.raw,
      ),
    ).toEqual(
      certsOnlyResponse.encryptionCertChain?.map(
        (cert: X509Certificate) => cert.raw,
      ),
    );
    expect(parsedPubKeyResponse.signingPubKey).toBeUndefined();
    expect(parsedPubKeyResponse.encryptionPubKey).toBeUndefined();
    expect(parsedPubKeyResponse.expirationTimestamp).toBeUndefined();
    expect(parsedPubKeyResponse.getSigningPubKey()).toEqual(
      Buffer.from(certPubKey, "hex"),
    );
    expect(parsedPubKeyResponse.getEncryptionPubKey()).toEqual(
      Buffer.from(certPubKey, "hex"),
    );

    const keysAndCertsResponse = getPubKeyResponse({
      signingCertChainPem: certString,
      encryptionCertChainPem: certString,
    });
    responseJson = keysAndCertsResponse.toJsonString();
    parsedPubKeyResponse = PubKeyResponse.fromJson(responseJson);
    expect(
      parsedPubKeyResponse.signingCertChain?.map(
        (cert: X509Certificate) => cert.raw,
      ),
    ).toEqual(
      keysAndCertsResponse.signingCertChain?.map(
        (cert: X509Certificate) => cert.raw,
      ),
    );
    expect(
      parsedPubKeyResponse.encryptionCertChain?.map(
        (cert: X509Certificate) => cert.raw,
      ),
    ).toEqual(
      keysAndCertsResponse.encryptionCertChain?.map(
        (cert: X509Certificate) => cert.raw,
      ),
    );
    expect(parsedPubKeyResponse.signingPubKey).toEqual(
      keysAndCertsResponse.signingPubKey,
    );
    expect(parsedPubKeyResponse.encryptionPubKey).toEqual(
      keysAndCertsResponse.encryptionPubKey,
    );
    expect(parsedPubKeyResponse.expirationTimestamp).toBeUndefined();
    expect(parsedPubKeyResponse.getSigningPubKey()).toEqual(
      Buffer.from(certPubKey, "hex"),
    );
    expect(parsedPubKeyResponse.getEncryptionPubKey()).toEqual(
      Buffer.from(certPubKey, "hex"),
    );
  });
});
