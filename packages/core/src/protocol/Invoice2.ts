import { z } from "zod";
import { KycStatus, kycStatusFromBytes, kycStatusToBytes } from "./KycStatus.js";
import { deserialize } from "v8";
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
    CounterPartyDataOptionsSchema,
    counterPartyDataOptionsFromBytes,
    counterPartyDataOptionsToBytes
} from "./CounterPartyData.js";

/**
 * invoice mk 2
 * for each parameter store a serialize and a deserialize function
 * as well as a runtime type and a tag
 * 
 * here's my second plan :
 * create a factory object which registers field names with TLVType objects,
 * these objects contain serial/deserial, tag, and type
 * this also stores a reverse lookup
 * 
 * all of the actual final types are zod objects to make validation easy
 * the deserialize functions should take an return these 
 */
const InvoiceCurrencySchema = z.object({
    name: z.string(),
    code: z.string(),
    symbol: z.string(),
    decimals: z.number()

})

export type IncomingCurrency = z.infer<typeof InvoiceCurrencySchema>;

const InvoiceSchema = z.object({
    receiverUma: z.string(),
    invoiceUUID: z.string(),
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
    signature: optionalIgnoringNull(z.instanceof(Uint8Array))
})

export type Invoice2 = z.infer<typeof InvoiceSchema>

type TLVSerial<T> = {
    type: string,
    tag: number,
    serialize: (value: T) => Uint8Array,
    deserialize: (bytes: Uint8Array) => T
}

const TLVInvoiceCurrencySerializer = {
    serialMap: new Map<string, TLVSerial<any>>(),

    reverseLookupSerialMap: new Map<number, string>(),

    registerTLV(field: string, helper: TLVSerial<any>) {
        this.reverseLookupSerialMap.set(helper.tag, field);
        this.serialMap.set(field, helper);
        return this;
    },

    serialize(invoice: IncomingCurrency): Uint8Array {
        const tlv = new ArrayBuffer(256);
        let offset = 0;
        const view = new DataView(tlv);
        Object.keys(invoice).forEach(key => {
            if (invoice[key as keyof IncomingCurrency] !== undefined && this.serialMap.has(key)) {
                const { type, tag, serialize } = this.serialMap.get(key)!!;
                let convert = serialize(invoice[key as keyof IncomingCurrency]);
                let byteLength = convert.length;
                view.setUint8(offset++, tag as number);
                view.setUint8(offset++, byteLength);
                for (let i = 0; i < convert.length; i++) {
                    view.setUint8(offset++, convert[i]);
                }
            }
        })
        return new Uint8Array(tlv).slice(0, offset);
    },

    deserialize(bytes: Uint8Array): IncomingCurrency {
        let offset = 0;
        let result: any = {};
        while (offset < bytes.length) {
            const tag = bytes[offset++];
            if (this.reverseLookupSerialMap.has(tag)) {
                let reverseTag = this.reverseLookupSerialMap.get(tag)!!;
                let byteLength = bytes[offset++];
                let value = bytes.slice(offset, offset + byteLength);
                const { deserialize } = this.serialMap.get(reverseTag)!!
                result[reverseTag] = deserialize(value);
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
    }
}

TLVInvoiceCurrencySerializer
    .registerTLV("code", {
        tag: 0,
        type: "string",
        serialize: serializeString,
        deserialize: deserializeString
    })
    .registerTLV("name", {
        tag: 1,
        type: "string",
        serialize: serializeString,
        deserialize: deserializeString
    })
    .registerTLV("symbol", {
        tag: 2,
        type: "string",
        serialize: serializeString,
        deserialize: deserializeString
    })
    .registerTLV("decimals", {
        tag: 3,
        type: "number",
        serialize: serializeNumber,
        deserialize: deserializeNumber
    });

export const TLVInvoiceSerializer = {
    serialMap: new Map<string, TLVSerial<any>>(),

    reverseLookupSerialMap: new Map<number, string>(),

    registerTLV(field: string, helper: TLVSerial<any>) {
        this.reverseLookupSerialMap.set(helper.tag, field);
        this.serialMap.set(field, helper);
        return this;
    },

    serialize(invoice: Invoice2): Uint8Array {
        const tlv = new ArrayBuffer(256);
        let offset = 0;
        const view = new DataView(tlv);
        Object.keys(invoice).forEach(key => {
            if (invoice[key as keyof Invoice2] !== undefined && this.serialMap.has(key)) {
                const { type, tag, serialize } = this.serialMap.get(key)!!;
                let convert = serialize(invoice[key as keyof Invoice2]);
                let byteLength = convert.length;
                // console.log(`serializing ${key}, ${byteLength}, ${convert}`);
                view.setUint8(offset++, tag as number);
                view.setUint8(offset++, byteLength);
                for (let i = 0; i < convert.length; i++) {
                    view.setUint8(offset++, convert[i]);
                }
            }
        })
        return new Uint8Array(tlv).slice(0, offset);
    },

    deserialize(bytes: Uint8Array): Invoice2 {
        let offset = 0;
        let result: any = {};
        while (offset < bytes.length) {
            const tag = bytes[offset++];
            if (this.reverseLookupSerialMap.has(tag)) {
                let reverseTag = this.reverseLookupSerialMap.get(tag)!!;
                let byteLength = bytes[offset++];
                let value = bytes.slice(offset, offset + byteLength);
                const { deserialize } = this.serialMap.get(reverseTag)!!
                // console.log(`deserializing ${reverseTag}, ${byteLength}, ${value}, ${deserialize}`);
                result[reverseTag] = deserialize(value);
                offset += byteLength;
            }
        }
        console.log(result);
        let validated: z.infer<typeof InvoiceSchema>;
        try {
            validated = InvoiceSchema.parse(result);
        } catch (e) {
            throw new Error("invalid invoice response", { cause: e });
        }
        return validated;
    }
}

TLVInvoiceSerializer.registerTLV(
    "receiverUma", {
    tag: 0,
    type: "string",
    serialize: serializeString,
    deserialize: deserializeString
})
    .registerTLV(
        "invoiceUUID", {
        tag: 1,
        type: "string",
        serialize: serializeString,
        deserialize: deserializeString
    })
    .registerTLV(
        "amount", {
        tag: 2,
        type: "number",
        serialize: serializeNumber,
        deserialize: deserializeNumber
    })
    .registerTLV(
        "receivingCurrency", {
        tag: 3,
        type: "tlv",
        serialize: (value: IncomingCurrency) => {
            return TLVInvoiceCurrencySerializer.serialize(value);
        },
        deserialize: (value: Uint8Array) => {
            return TLVInvoiceCurrencySerializer.deserialize(value);
        }
    })
    .registerTLV(
        "expiration", {
        tag: 4, type: "number",
        serialize: serializeNumber,
        deserialize: deserializeNumber
    })
    .registerTLV(
        "isSubjectToTravelRule", {
        tag: 5, type: "boolean",
        serialize: serializeBoolean,
        deserialize: deserializeBoolean
    })
    .registerTLV(
        "requiredPayerData", {
        tag: 6, type: "bytes",
        serialize: counterPartyDataOptionsToBytes,
        deserialize: counterPartyDataOptionsFromBytes
    })
    .registerTLV(
        "umaVersion", {
        tag: 7, type: "string",
        serialize: serializeString,
        deserialize: deserializeString
    })
    .registerTLV(
        "commentCharsAllowed", {
        tag: 8, type: "number",
        serialize: serializeNumber,
        deserialize: deserializeNumber
    })
    .registerTLV(
        "senderUma", {
        tag: 9, type: "string",
        serialize: serializeString,
        deserialize: deserializeString
    })
    .registerTLV(
        "invoiceLimit", {
        tag: 10, type: "number",
        serialize: serializeNumber,
        deserialize: deserializeNumber
    })
    .registerTLV(
        "kycStatus", {
        tag: 11, type: "bytes",
        serialize: kycStatusToBytes,
        deserialize: kycStatusFromBytes
    })
    .registerTLV(
        "callback", {
        tag: 12, type: "string",
        serialize: serializeString,
        deserialize: deserializeString
    })
    .registerTLV(
        "signature", {
        tag: 100, type: "bytes",
        serialize: (bytes: Uint8Array) => {
            return bytes
        },
        deserialize: (bytes: Uint8Array) => {
            return bytes
        }
    });