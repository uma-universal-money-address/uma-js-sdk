import { z } from "zod";
import { KycStatus, kycStatusFromBytes, kycStatusToBytes } from "./KycStatus.js";
import { deserialize } from "v8";
import {
    deserializeBoolean,
    deserializeNumber,
    deserializeString,
    deserializeTLV,
    serializeBoolean,
    serializeNumber,
    serializeString,
    serializeTLV
} from "../serializerUtils.js";
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

type IncomingCurrency = z.infer<typeof InvoiceCurrencySchema>;

const InvoiceSchema = z.object({
    "receiverUma": z.string(),
    "amount": z.number(),
    "receivingCurrency": InvoiceCurrencySchema,
    "kycStatus": z.nativeEnum(KycStatus),
    "isSubjectToTravelRule": z.boolean()
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
    },

    serializeInvoice(invoice: IncomingCurrency): Uint8Array {
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

    deserializeInvoice(bytes: Uint8Array): IncomingCurrency {
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

TLVInvoiceCurrencySerializer.registerTLV("code", {
    tag: 0, 
    type : "string",
    serialize : serializeString,
    deserialize : deserializeString
});
TLVInvoiceCurrencySerializer.registerTLV("name", {
    tag: 1, 
    type : "string",
    serialize : serializeString,
    deserialize : deserializeString
});
TLVInvoiceCurrencySerializer.registerTLV("symbol", {
    tag: 2, 
    type : "string",
    serialize : serializeString,
    deserialize : deserializeString
});
TLVInvoiceCurrencySerializer.registerTLV("decimals", {
    tag: 3, 
    type : "number",
    serialize : serializeNumber,
    deserialize : deserializeNumber
});

export const TLVInvoiceSerializer = {
    serialMap: new Map<string, TLVSerial<any>>(),

    reverseLookupSerialMap: new Map<number, string>(),

    registerTLV(field: string, helper: TLVSerial<any>) {
        this.reverseLookupSerialMap.set(helper.tag, field);
        this.serialMap.set(field, helper);
    },

    serializeInvoice(invoice: Invoice2): Uint8Array {
        const tlv = new ArrayBuffer(256);
        let offset = 0;
        const view = new DataView(tlv);
        Object.keys(invoice).forEach(key => {
            if (invoice[key as keyof Invoice2] !== undefined && this.serialMap.has(key)) {
                const { type, tag, serialize } = this.serialMap.get(key)!!;
                let convert = serialize(invoice[key as keyof Invoice2]);
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

    deserializeInvoice(bytes: Uint8Array): Invoice2 {
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
}
);

TLVInvoiceSerializer.registerTLV(
    "amount", {
    tag: 1,
    type: "number",
    serialize: serializeNumber,
    deserialize: deserializeNumber
}
);

TLVInvoiceSerializer.registerTLV(
    "receivingCurrency", {
        tag : 2,
        type : "tlv",
        serialize : (value: IncomingCurrency) => {
            return TLVInvoiceCurrencySerializer.serializeInvoice(value);
        },
        deserialize : (value: Uint8Array) => {
            return TLVInvoiceCurrencySerializer.deserializeInvoice(value);
        } 
    }
);

TLVInvoiceSerializer.registerTLV(
    "kycStatus", {
    tag: 3,
    type: "bytes",
    serialize: kycStatusToBytes,
    deserialize: kycStatusFromBytes
}
);

TLVInvoiceSerializer.registerTLV(
    "isSubjectToTravelRule", {
    tag: 4,
    type: "boolean",
    serialize: serializeBoolean,
    deserialize: deserializeBoolean
});