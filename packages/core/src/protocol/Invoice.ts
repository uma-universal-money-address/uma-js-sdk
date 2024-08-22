import { bech32, bech32m } from "bech32";
import { z } from "zod";
import {
  deserializeBoolean,
  deserializeNumber,
  deserializeString,
  serializeBoolean,
  serializeNumber,
  serializeString,
} from "../serializerUtils.js";
import { optionalIgnoringNull } from "../zodUtils.js";
import {
  counterPartyDataOptionsFromBytes,
  CounterPartyDataOptionsSchema,
  counterPartyDataOptionsToBytes,
} from "./CounterPartyData.js";
import {
  KycStatus,
  kycStatusFromBytes,
  kycStatusToBytes,
} from "./KycStatus.js";

const UMA_BECH32_PREFIX = "uma";
const BECH_32_MAX_LENGTH = 512;

const InvoiceCurrencySchema = z.object({
  name: z.string(),
  code: z.string(),
  symbol: z.string(),
  decimals: z.number(),
});

/**
 * Sub object describing receiving currency in more detail
 *
 * @param name
 * @param code
 * @param symbol
 * @param decimals
 */
export type InvoiceCurrency = z.infer<typeof InvoiceCurrencySchema>;

const InvoiceSchema = z.object({
  receiverUma: z.string(),
  invoiceUUID: z.string().uuid(),
  amount: z.number(),
  receivingCurrency: InvoiceCurrencySchema,
  expiration: z.number(),
  isSubjectToTravelRule: z.boolean(),
  requiredPayerData: optionalIgnoringNull(CounterPartyDataOptionsSchema),
  umaVersion: z.string(),
  commentCharsAllowed: optionalIgnoringNull(z.number()),
  senderUma: optionalIgnoringNull(z.string()),
  invoiceLimit: optionalIgnoringNull(z.number()),
  kycStatus: optionalIgnoringNull(z.nativeEnum(KycStatus)),
  callback: z.string(),
  signature: optionalIgnoringNull(z.instanceof(Uint8Array)),
});

/**
 * Invoice
 * represents a UMA invoice
 *
 * @param receiverUma
 * @param invoiceUUID - Invoice UUID Served as both the identifier of the UMA invoice, and the validation of proof of payment
 * @param amount - The amount of invoice to be paid in the smallest unit of the ReceivingCurrency.
 * @param receivingCurrency - The currency of the invoice
 * @param expiration - The unix timestamp of when the UMA invoice expires
 * @param isSubjectToTravelRule -  Indicates whether the VASP is a financial institution that requires travel rule information.
 * @param requiredPayerData - the data about the payer that the sending VASP must provide in order to send a payment
 * @param umaVersion - UmaVersion is a list of UMA versions that the VASP supports for this transaction. It should be
 * containing the lowest minor version of each major version it supported, separated by commas
 * @param commentCharsAllowed - is the number of characters that the sender can include in the comment field of the pay request.
 * @param senderUma - The sender's UMA address. If this field presents, the UMA invoice should directly go to the sending VASP
 * instead of showing in other formats
 * @param invoiceLimit - The maximum number of the invoice can be paid
 * @param kycStatus - YC status of the receiver, default is verified
 * @param callback - The callback url that the sender should send the PayRequest to
 * @param signature - The signature of the UMA invoice
 */
export type Invoice = z.infer<typeof InvoiceSchema>;

type TLVSerial<T> = {
  tag: number;
  serialize: (value: T) => Uint8Array;
  deserialize: (bytes: Uint8Array) => T;
};

/**
 * Serializer object converts InvoiceCurrency to Uint8Array,
 * or creates InvoiceCurrency based on properly validated Uint8Array
 */
const TLVInvoiceCurrencySerializer = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serialMap: new Map<string, TLVSerial<any>>(),

  reverseLookupSerialMap: new Map<number, string>(),

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registerTLV(field: string, helper: TLVSerial<any>) {
    this.reverseLookupSerialMap.set(helper.tag, field);
    this.serialMap.set(field, helper);
    return this;
  },

  serialize(invoice: InvoiceCurrency): Uint8Array {
    const tlv = new ArrayBuffer(256);
    let offset = 0;
    const view = new DataView(tlv);
    Object.keys(invoice).forEach((key) => {
      if (
        invoice[key as keyof InvoiceCurrency] !== undefined &&
        this.serialMap.get(key) !== undefined
      ) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { tag, serialize } = this.serialMap.get(key) as TLVSerial<any>;
        const convert = serialize(invoice[key as keyof InvoiceCurrency]);
        const byteLength = convert.length;
        view.setUint8(offset++, tag as number);
        view.setUint8(offset++, byteLength);
        for (let i = 0; i < convert.length; i++) {
          view.setUint8(offset++, convert[i]);
        }
      }
    });
    return new Uint8Array(tlv).slice(0, offset);
  },

  deserialize(bytes: Uint8Array): InvoiceCurrency {
    let offset = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = {}; 
    while (offset < bytes.length) {
      const tag = bytes[offset++];
      const reverseTag = this.reverseLookupSerialMap.get(tag);
      if (reverseTag) {
        const byteLength = bytes[offset++];
        const value = bytes.slice(offset, offset + byteLength);
        if (this.serialMap.get(reverseTag) !== undefined) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { deserialize } = this.serialMap.get(reverseTag) as TLVSerial<any>;
          result[reverseTag] = deserialize(value);
        }
        offset += byteLength;
      }
    }
    let validated: z.infer<typeof InvoiceCurrencySchema>;
    try {
      validated = InvoiceCurrencySchema.parse(result);
    } catch (e) {
      throw new Error("invalid invoice currency response", { cause: e });
    }
    return validated;
  },
};

TLVInvoiceCurrencySerializer.registerTLV("code", {
  tag: 0,
  serialize: serializeString,
  deserialize: deserializeString,
})
  .registerTLV("name", {
    tag: 1,
    serialize: serializeString,
    deserialize: deserializeString,
  })
  .registerTLV("symbol", {
    tag: 2,
    serialize: serializeString,
    deserialize: deserializeString,
  })
  .registerTLV("decimals", {
    tag: 3,
    serialize: serializeNumber,
    deserialize: deserializeNumber,
  });

/**
 * Serializer object converts Invoice to Uint8Array in type-length-value format,
 * or creates Invoice based on properly validated Uint8Array
 *
 * additionally, can convert a tlv formatted Invoice into a bech32 string
 */
export const InvoiceSerializer = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serialMap: new Map<string, TLVSerial<any>>(),

  reverseLookupSerialMap: new Map<number, string>(),

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registerSerializer(field: string, helper: TLVSerial<any>) {
    this.reverseLookupSerialMap.set(helper.tag, field);
    this.serialMap.set(field, helper);
    return this;
  },

  toTLV(invoice: Invoice): Uint8Array {
    const tlv = new ArrayBuffer(256);
    let offset = 0;
    const view = new DataView(tlv);
    Object.keys(invoice).forEach((key) => {
      if (
        invoice[key as keyof Invoice] !== undefined &&
        this.serialMap.get(key) !== undefined
      ) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { tag, serialize } = this.serialMap.get(key) as TLVSerial<any>;
        const convert = serialize(invoice[key as keyof Invoice]);
        const byteLength = convert.length;
        view.setUint8(offset++, tag as number);
        view.setUint8(offset++, byteLength);
        for (let i = 0; i < convert.length; i++) {
          view.setUint8(offset++, convert[i]);
        }
      }
    });
    return new Uint8Array(tlv).slice(0, offset);
  },

  toBech32(invoice: Invoice): string {
    return bech32.encode(
      UMA_BECH32_PREFIX,
      bech32m.toWords(this.toTLV(invoice)),
      BECH_32_MAX_LENGTH,
    );
  },

  fromTLV(bytes: Uint8Array): Invoice {
    let offset = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = {};
    while (offset < bytes.length) {
      const tag = bytes[offset++];
      const reverseTag = this.reverseLookupSerialMap.get(tag);
      if (reverseTag) {
        const byteLength = bytes[offset++];
        const value = bytes.slice(offset, offset + byteLength);
        if (this.serialMap.get(reverseTag) !== undefined) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { deserialize } = this.serialMap.get(reverseTag) as TLVSerial<any>;
          result[reverseTag] = deserialize(value);
        }
        offset += byteLength;
      }
    }
    let validated: z.infer<typeof InvoiceSchema>;
    try {
      validated = InvoiceSchema.parse(result);
    } catch (e) {
      throw new Error("invalid invoice response", { cause: e });
    }
    return validated;
  },

  fromBech32(bech32str: string): Invoice {
    const decoded = bech32.decode(bech32str, BECH_32_MAX_LENGTH);
    return this.fromTLV(new Uint8Array(bech32m.fromWords(decoded.words)));
  },
};

InvoiceSerializer.registerSerializer("receiverUma", {
  tag: 0,
  serialize: serializeString,
  deserialize: deserializeString,
})
  .registerSerializer("invoiceUUID", {
    tag: 1,
    serialize: serializeString,
    deserialize: deserializeString,
  })
  .registerSerializer("amount", {
    tag: 2,
    serialize: serializeNumber,
    deserialize: deserializeNumber,
  })
  .registerSerializer("receivingCurrency", {
    tag: 3,
    serialize: (value: InvoiceCurrency) => {
      return TLVInvoiceCurrencySerializer.serialize(value);
    },
    deserialize: (value: Uint8Array) => {
      return TLVInvoiceCurrencySerializer.deserialize(value);
    },
  })
  .registerSerializer("expiration", {
    tag: 4,
    serialize: serializeNumber,
    deserialize: deserializeNumber,
  })
  .registerSerializer("isSubjectToTravelRule", {
    tag: 5,
    serialize: serializeBoolean,
    deserialize: deserializeBoolean,
  })
  .registerSerializer("requiredPayerData", {
    tag: 6,
    serialize: counterPartyDataOptionsToBytes,
    deserialize: counterPartyDataOptionsFromBytes,
  })
  .registerSerializer("umaVersion", {
    tag: 7,
    serialize: serializeString,
    deserialize: deserializeString,
  })
  .registerSerializer("commentCharsAllowed", {
    tag: 8,
    serialize: serializeNumber,
    deserialize: deserializeNumber,
  })
  .registerSerializer("senderUma", {
    tag: 9,
    serialize: serializeString,
    deserialize: deserializeString,
  })
  .registerSerializer("invoiceLimit", {
    tag: 10,
    serialize: serializeNumber,
    deserialize: deserializeNumber,
  })
  .registerSerializer("kycStatus", {
    tag: 11,
    serialize: kycStatusToBytes,
    deserialize: kycStatusFromBytes,
  })
  .registerSerializer("callback", {
    tag: 12,
    serialize: serializeString,
    deserialize: deserializeString,
  })
  .registerSerializer("signature", {
    tag: 100,
    serialize: (bytes: Uint8Array) => {
      return bytes;
    },
    deserialize: (bytes: Uint8Array) => {
      return bytes;
    },
  });
