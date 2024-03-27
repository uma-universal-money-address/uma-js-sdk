import { Currency } from "../protocol/Currency.js";
import { KycStatus } from "../protocol/KycStatus.js";
import { LnurlpResponse } from "../protocol/LnurlpResponse.js";
import { PayReqResponse } from "../protocol/PayReqResponse.js";
import { PayRequest, PayRequestSchema } from "../protocol/PayRequest.js";
import { getLnurlpResponse } from "../uma.js";

describe("uma protocol", () => {
  it("should throw on invalid compliance in payreq", async () => {
    /* Invalid compliance: */
    await expect(() =>
      PayRequestSchema.parse({
        convert: "USD",
        amount: 100,
        payerData: {
          name: "Bob",
          email: "$bob@bobs-domain.com",
          identifier: "1234",
          compliance: {
            utxos: ["utxo1", "utxo2"],
            nodePubKey: "nodePubKey",
            kycStatus: KycStatus.Pending,
            encryptedTravelRuleInfo: "encryptedTravelRuleInfo",
            signature: "signature",
            signatureNonce: "signatureNonce",
            signatureTimestamp: "this should be a number",
            utxoCallback: "utxoCallback",
          },
        },
      }),
    ).toThrow(/.*signatureTimestamp.*/g);
  });

  it("should create valid non-uma lnurlp response", async () => {
    const response = await getLnurlpResponse({
      request: {
        receiverAddress: "$bob@vasp.com",
      },
      minSendableSats: 100,
      maxSendableSats: 1000,
      encodedMetadata: JSON.stringify({
        text: "Hello, World!",
      }),
      callback: "https://vasp.com/lnurlp",
    });
    expect(response).toMatchObject({
      callback: "https://vasp.com/lnurlp",
      tag: "payRequest",
      minSendable: 100_000,
      maxSendable: 1_000_000,
      metadata: JSON.stringify({
        text: "Hello, World!",
      }),
    });
  });

  it("should parse valid non-uma payreq", async () => {
    const payReq = PayRequest.fromJson(JSON.stringify({ amount: 100 }));
    expect(payReq.amount).toBe(100);
    expect(payReq.sendingAmountCurrencyCode).toBeUndefined();
    expect(payReq.receivingCurrencyCode).toBeUndefined();
    expect(payReq.payerData).toBeUndefined();
    expect(payReq.isUma()).toBe(false);
  });

  it("should parse valid payreq with only number amount", async () => {
    const payReq = PayRequest.fromJson(
      JSON.stringify({
        convert: "USD",
        amount: 100,
        payerData: {
          identifier: "$bob@uma-test.lightspark.com",
          name: null,
          email: null,
          compliance: {
            kycStatus: "VERIFIED",
            utxos: [
              "bc1q6cxd3gtnsyx2h06lg7pgz9pu55229sh9gt3ze7",
              "bc1qgsynar5wp9u74c9e0gkywugkwjftysmwt77t9ygcq260kl8723pstuq62w",
              "bc1qaa226hft9lheekjq0wfsj2tycsl88u3egtmjay",
            ],
            nodePubKey:
              "0202f87a27b7dc0ca7c419c9ca558c8b93cb543065746a7fa9d7f4ca1abf73bb76",
            encryptedTravelRuleInfo:
              "04ba33fe66a87074e2a799b555c12ddd730ef01e62e6dc2c617ed7707a0b9d19ee24d14cf7596f312dbd2351e2c0fae577c5f845cb987e9c06f5d34325085c9ca8144dc8b87892eb44f9fe5a50082dc760bcda8d249ab81b3d39c8694bec6eb1bc9483e86d51e5bb1e71fe74910d3b4bb122e8553edc15f75709452f0b3ff4caaec5f6ae",
            travelRuleFormat: null,
            signature:
              "3045022100ba838808996c5004c1b2fc4d2066390eca369f3ac53871bae74fa1a8ac4e4164022011336a22cf9c83158fd1f1d6c79d92b42ef91913f2e3d3677ed08bf05d08c963",
            signatureNonce: "3950122449",
            signatureTimestamp: 1698787863,
            utxoCallback:
              "https://uma-test.lightspark.com/uma/post-transaction-utxos/018b87a5-a6da-afe3-0000-0b2feac7db1a",
          },
        },
      }),
    );
    expect(payReq.amount).toBe(100);
    expect(payReq.sendingAmountCurrencyCode).toBeUndefined();
    expect(payReq.receivingCurrencyCode).toBe("USD");
  });

  it("should parse valid payreq with string and sender currency", async () => {
    const payReq = PayRequest.fromJson(
      JSON.stringify({
        convert: "USD",
        amount: "100.USD",
        payerData: {
          identifier: "$bob@uma-test.lightspark.com",
          name: null,
          email: null,
          compliance: {
            kycStatus: "VERIFIED",
            utxos: [
              "bc1q6cxd3gtnsyx2h06lg7pgz9pu55229sh9gt3ze7",
              "bc1qgsynar5wp9u74c9e0gkywugkwjftysmwt77t9ygcq260kl8723pstuq62w",
              "bc1qaa226hft9lheekjq0wfsj2tycsl88u3egtmjay",
            ],
            nodePubKey:
              "0202f87a27b7dc0ca7c419c9ca558c8b93cb543065746a7fa9d7f4ca1abf73bb76",
            encryptedTravelRuleInfo:
              "04ba33fe66a87074e2a799b555c12ddd730ef01e62e6dc2c617ed7707a0b9d19ee24d14cf7596f312dbd2351e2c0fae577c5f845cb987e9c06f5d34325085c9ca8144dc8b87892eb44f9fe5a50082dc760bcda8d249ab81b3d39c8694bec6eb1bc9483e86d51e5bb1e71fe74910d3b4bb122e8553edc15f75709452f0b3ff4caaec5f6ae",
            travelRuleFormat: null,
            signature:
              "3045022100ba838808996c5004c1b2fc4d2066390eca369f3ac53871bae74fa1a8ac4e4164022011336a22cf9c83158fd1f1d6c79d92b42ef91913f2e3d3677ed08bf05d08c963",
            signatureNonce: "3950122449",
            signatureTimestamp: 1698787863,
            utxoCallback:
              "https://uma-test.lightspark.com/uma/post-transaction-utxos/018b87a5-a6da-afe3-0000-0b2feac7db1a",
          },
        },
      }),
    );
    expect(payReq.amount).toBe(100);
    expect(payReq.sendingAmountCurrencyCode).toBe("USD");
    expect(payReq.receivingCurrencyCode).toBe("USD");
  });

  it("should be back-compatible with v0 currency", async () => {
    const v0Data = {
      code: "USD",
      name: "US Dollar",
      symbol: "$",
      multiplier: 1,
      minSendable: 0.01,
      maxSendable: 1000,
      decimals: 2,
    };

    const parsedData = Currency.parse(v0Data);
    expect(parsedData.toJsonSchemaObject()).toMatchObject(v0Data);

    const v1Data = {
      code: "USD",
      name: "US Dollar",
      symbol: "$",
      multiplier: 1,
      convertible: {
        min: 0.01,
        max: 1000,
      },
      decimals: 2,
    };

    const parsedv1Data = Currency.parse(v1Data);
    expect(parsedv1Data.toJsonSchemaObject()).toMatchObject(v1Data);
  });

  it("should be back-compatible with v0 lnurlp response", async () => {
    const v0Data = {
      callback: "https://vasp.com/lnurlp",
      tag: "payRequest",
      minSendable: 100,
      maxSendable: 1000,
      metadata: JSON.stringify({
        text: "Hello, World!",
      }),
      compliance: {
        kycStatus: KycStatus.Verified,
        signature: "abcdef",
        signatureNonce: "I am a nonce",
        signatureTimestamp: 1234567890,
        isSubjectToTravelRule: true,
        receiverIdentifier: "$foo@bar.com",
      },
      payerData: {
        identifier: { mandatory: true },
        compliance: { mandatory: true },
      },
      umaVersion: "0.3",
      commentAllowed: 256,
      nostrPubkey: "nostrPubkey",
      currencies: [
        {
          code: "USD",
          name: "US Dollar",
          symbol: "$",
          multiplier: 1,
          minSendable: 0.01,
          maxSendable: 1000,
          decimals: 2,
        },
      ],
    };

    const parsedData = LnurlpResponse.parse(v0Data);
    expect(parsedData.toJsonSchemaObject()).toMatchObject(v0Data);

    const v1Data = {
      ...v0Data,
      currencies: [
        {
          code: "USD",
          name: "US Dollar",
          symbol: "$",
          multiplier: 1,
          convertible: {
            min: 0.01,
            max: 1000,
          },
          decimals: 2,
        },
      ],
      umaVersion: "1.0",
    };

    const parsedv1Data = LnurlpResponse.parse(v1Data);
    expect(parsedv1Data.toJsonSchemaObject()).toMatchObject(v1Data);
  });

  it("should be back-compatible with v0 payreq", async () => {
    const v0Data = {
      currency: "USD",
      amount: 100,
      payerData: {
        identifier: "$foo@bar.com",
        compliance: {
          utxos: ["utxo1", "utxo2"],
          nodePubKey: "nodePubKey",
          kycStatus: KycStatus.Verified,
          encryptedTravelRuleInfo: "abcdef1234",
          signature: "abcdef",
          signatureNonce: "I am a nonce",
          signatureTimestamp: 1234567890,
          utxoCallback: "https://example.com/utxo-callback",
        },
      },
      payeeData: {
        name: { mandatory: false },
        email: { mandatory: false },
        identifier: { mandatory: true },
        compliance: { mandatory: true },
      },
    };

    const parsedData = PayRequest.parse(v0Data);
    expect(parsedData.toJsonSchemaObject()).toMatchObject(v0Data);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const v1Data: any = {
      ...v0Data,
      amount: "100.USD",
      convert: "USD",
    };
    delete v1Data.currency;

    const parsedv1Data = PayRequest.parse(v1Data);
    expect(parsedv1Data.toJsonSchemaObject()).toMatchObject(v1Data);
  });

  it("should be back-compatible with v0 payreq response", async () => {
    const v0Data = {
      pr: "lnbc1000",
      routes: [],
      compliance: {
        nodePubKey: "nodePubKey",
        utxos: ["utxo1", "utxo2"],
        utxoCallback: "https://example.com/utxo-callback",
      },
      paymentInfo: {
        currencyCode: "USD",
        decimals: 2,
        multiplier: 1,
        exchangeFeesMillisatoshi: 100,
      },
    };

    const parsedData = PayReqResponse.parse(v0Data);
    expect(parsedData.toJsonSchemaObject()).toMatchObject(v0Data);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const v1Data: any = {
      ...v0Data,
      converted: {
        amount: 100,
        currencyCode: "USD",
        decimals: 2,
        multiplier: 1,
        fee: 100,
      },
      payeeData: {
        compliance: {
          ...v0Data.compliance,
          signature: "abcdef",
          signatureNonce: "I am a nonce",
          signatureTimestamp: 1234567890,
        },
      },
    };
    delete v1Data.paymentInfo;
    delete v1Data.compliance;

    const parsedv1Data = PayReqResponse.parse(v1Data);
    expect(parsedv1Data.toJsonSchemaObject()).toMatchObject(v1Data);
  });
});
