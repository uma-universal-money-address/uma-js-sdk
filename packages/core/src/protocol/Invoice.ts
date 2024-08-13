import { CounterPartyDataOptions } from "./CounterPartyData.js";
import { Currency } from "./Currency.js";
import { KycStatus } from "./KycStatus.js";
import { bech32m } from "bech32";
import { TLVCodable, convertToBytes, mergeByteArrays } from "../tlvUtils.js"

type TLVField = {
    tag : number,
    type: string
}

export class InvoiceCurrency implements TLVCodable {
    tlvMembers = new Map([
        ["code", 0],
        ["name", 1],
        ["symbol", 2],
        ["decimals", 3],
    ])

    tlvMembers2 = new Map<String, TLVField>([
        ["code", {
            tag : 0,
            type : "string"
        }],
        ["name", {
            tag : 1,
            type : "string"
        }],
        ["symbol", {
            tag : 2,
            type : "string"
        }],
        ["decimals", {
            tag : 3,
            type : "number"
        }],
    ])

    reverseTlVMembers = new Map([
        [0, "code"],
        [1, "name"],
        [2, "symbol"],
        [3, "decimals"]
    ])

    constructor(
        // code is the ISO 4217 (if applicable) currency code (eg. "USD"). For cryptocurrencies, this will  be a ticker
        // symbol, such as BTC for Bitcoin.
        public readonly code: string,

        // name is the full display name of the currency (eg. US Dollars).
        public readonly name: string,

        // symbol is the symbol used to represent the currency (eg. $).
        public readonly symbol: string,

        // The number of digits after the decimal point for display on the sender side
        public readonly decimals: number
    ) {}

    toBech32String(): string { 
        const bech32Str = bech32m.toWords(this.toTLV());
        return bech32m.encode("uma", bech32Str);
    }

    fromBech32String(bvalue: string): number[] {
        const decoded = bech32m.decode(bvalue)
        return bech32m.fromWords(decoded.words);
    }

    // toTLV(): Uint8Array {
    //     const tlv = new Array<Uint8Array>();
    //     Object.keys(this).forEach(key => {
    //         if (this.tlvMembers.has(key)) {
    //             let convert = convertToBytes(this[key as keyof InvoiceCurrency])
    //             let len = convert.length;
    //             const subArray = new Uint8Array();
    //             subArray[0] = this.tlvMembers.get(key) as number;
    //             subArray[1] = len;
    //             tlv.push(mergeByteArrays([subArray, convert]));
    //         } 
    //     })
    //     return mergeByteArrays(tlv);
    // }

    toTLV(): Uint8Array {
        const tlv = new ArrayBuffer(256);
        let offset = 0;
        const view = new DataView(tlv);
        Object.keys(this).forEach(key => {
            if (this.tlvMembers.has(key)) {
                let convert = this.convertToBytes(this[key as keyof InvoiceCurrency], this.tlvMembers2.get(key)?.type ?? "");
                let len = convert.length;
                view.setUint8(offset++, this.tlvMembers.get(key) as number);
                view.setUint8(offset++, len);
                for (let i = 0; i<convert.length; i++) {
                    view.setUint8(offset++, convert[i]);
                }
            } 
        })
        return new Uint8Array(tlv).slice(0, offset);
    }

    fromTLV2(tlvBytes: Uint8Array) {
        console.log(`Inbound TLV : ${tlvBytes}`);
        let offset = 0;
        while (offset < tlvBytes.length) {
            const tag = tlvBytes[offset++];
            // console.log(`has reverse tag? ${tag}, ${typeof tag} ${this.reverseTlVMembers.has(tag)}`);
            if (this.reverseTlVMembers.has(tag)) {
                let reverseTag = this.reverseTlVMembers.get(tag) ?? "";
                let len = tlvBytes[offset++];
                let value = tlvBytes.slice(offset, offset+len);
                let decodedValue = this.decodeFromBytes(value, this.tlvMembers2.get(reverseTag)?.type ?? "" )
                console.log(`data: ${ tlvBytes.slice(offset, offset+len)}, ${decodedValue}`);
                offset+= len;
            }
        }
    } 

    decodeFromBytes(value: Uint8Array, valueType: string): any {
        let result;
        switch(valueType) {
            case "number" : {
                result = value[0]
                break;
            }
            case "string" : {
                result = new TextDecoder().decode(value);
                break;
            }
            case "boolean" : {
                result = value[0] === 1;
                break;
            }
            case "byte_codable" : {
                break;
            }
            case "tlv" : {

                break;
            }
            case "byte_array": {
                result = value;
                break;
            }
            default: {
                break;
            }
            
        }
        return result;
    }

    convertToBytes(value: any, valueType: string): Uint8Array {
        let result = new Uint8Array();
    switch(valueType) {
        case "number" : {
            let valueAsNumber = value as number;
            if (Number.isInteger(valueAsNumber)) {
                if (valueAsNumber >= -128 || valueAsNumber <= 127) { // uint 8
                    const buffer = new ArrayBuffer(1);
                    const view = new DataView(buffer);
                    view.setUint8(0, valueAsNumber);
                    result = new Uint8Array(buffer);
                } else if (valueAsNumber >= -32768 || valueAsNumber <= 32767) { // uint 16
                    const buffer = new ArrayBuffer(2);
                    const view = new DataView(buffer);
                    view.setUint16(0, valueAsNumber);
                    result = new Uint8Array(buffer);
                } else if (valueAsNumber >= -2147483648 || valueAsNumber <= 2147483647) { // unint 32
                    const buffer = new ArrayBuffer(4);
                    const view = new DataView(buffer);
                    view.setUint32(0, valueAsNumber);
                    result = new Uint8Array(buffer);
                }
            } else {
                const buffer = new ArrayBuffer(4);
                const view = new DataView(buffer);
                view.setFloat32(0, valueAsNumber);
                result = new Uint8Array(buffer);
            }
            break;
        }
        case "string" : {
            const te = new TextEncoder();
            result = te.encode(value);
            break;
        }
        case "boolean" : {
            result[0] = value as boolean === true ? 1 : 0
            break;
        }
        case "tlv": {
            let valueAsTLV = value as TLVCodable;
            result = valueAsTLV.toTLV();
            break;
        }
        case "byte_codable": {
            break;
        }
        case "byte_array": {
            result = value;
            break;
        }
        default: {
            break;
        }
    }
    return result;
    }
}

export class Invoice implements TLVCodable {
    tlvMembers = new Map([
        ["receiverUma",  0],
        ["invoiceUUID",  1],
        ["amount",  2],
        ["receivingCurrency",  3],
        ["expiration",  4],
        ["isSubectToTravelRule",  5],
        ["requiredPayerData",  6],
        ["umaVersion",  7],
        ["commentCharsAllowed",  8],
        ["senderUma",  9],
        ["invoiceLimit",  10],
        ["kycStatus",  11],
        ["callback",  12],
        ["signature",  10]
    ]);

    tlvMembers2 = new Map<String, TLVField>([
        ["receiverUma",  {
            tag: 0, type: "string"
        }],
        ["invoiceUUID",  {
            tag: 1, type: "string"
        }],
        ["amount",  {tag: 2, type: "number"}],
        ["receivingCurrency",  {tag:3, type: "tlv"}],
        ["expiration",  {tag:4, type: "number"}],
        ["isSubectToTravelRule",  {tag:5, type:"boolean"}],
        ["requiredPayerData",  {tag:6, type: "byte_codable:"}],
        ["umaVersion",  {tag:7, type: "string"}],
        ["commentCharsAllowed",  {tag:8, type:"number"}],
        ["senderUma",  {tag:9, type: "string"}],
        ["invoiceLimit",  {tag:10, type:"number"}],
        ["kycStatus",  {tag:11, type: "byte_codable"}],
        ["callback",  {tag:12, type:"string"}],
        ["signature",  {tag:100, type:"byte_array"}]
    ])

    reverseTlVMembers = new Map([
        [0, "receiverUma"],
        [1, "invoiceUUID"],
        [2, "amount"],
        [3, "receivingCurrency"],
        [4, "expiration"],
        [5, "isSubjectToTravelRule"],
        [6, "requiredPayerData"],
        [7, "umaVersion"],
        [8, "commentCharsAllowed"],
        [9, "senderUma"],
        [10, "invoiceLimit"],
        [11, "kycStatus"],
        [12, "callback"],
        [100, "signature"],
    ])

    constructor(
        // Receiving UMA address
        public readonly receiverUma: string,

        // Invoice UUID Served as both the identifier of the UMA invoice, and the validation of proof of payment.
        public readonly invoiceUUID: string,
        
        // The amount of invoice to be paid in the smalest unit of the ReceivingCurrency.
        public readonly amount: number,

        // The currency of the invoice
        public readonly receivingCurrency: InvoiceCurrency,

        // The unix timestamp the UMA invoice expires
        public readonly expiration: number,

        // Indicates whether the VASP is a financial institution that requires travel rule information.
        public readonly isSubectToTravelRule: boolean,
        
        // RequiredPayerData the data about the payer that the sending VASP must provide in order to send a payment.    
        // public readonly requiredPayerData: CounterPartyDataOptions | undefined, 
        
        // UmaVersion is a list of UMA versions that the VASP supports for this transaction. It should be
	    // containing the lowest minor version of each major version it supported, separated by commas.    
        public readonly umaVersion: string,
        
        // CommentCharsAllowed is the number of characters that the sender can include in the comment field of the pay request.    
        public readonly commentCharsAllowed: number | undefined,

        // The sender's UMA address. If this field presents, the UMA invoice should directly go to the sending VASP instead of showing in other formats.
        public readonly senderUma: string | undefined,
        
        // The maximum number of the invoice can be paid
        public readonly invoiceLimit: number | undefined,

        // KYC status of the receiver, default is verified.
        // public readonly kycStatus: KycStatus | undefined,

        // The callback url that the sender should send the PayRequest to.    
        public readonly callback: string,

        // The signature of the UMA invoice
        public readonly signature: Uint8Array
    ) {}

    toTLV(): Uint8Array {
        const tlv = new Array<Uint8Array>();
        Object.keys(this).forEach(key => {
            if (this.tlvMembers.has(key)) {
                let convert = convertToBytes(this[key as keyof Invoice])
                let len = convert.length;
                const subArray = new Uint8Array(2);
                subArray[0] = this.tlvMembers.get(key) ?? 0;
                subArray[1] = len;
                tlv.push(mergeByteArrays([subArray, convert]));
            } 
        })
        return mergeByteArrays(tlv);
    }

    toBech32String(): string { 
        const bech32Str = bech32m.toWords(this.toTLV())
        return bech32m.encode("uma", bech32Str);
    }

    toTLV2(): Uint8Array {
        const tlv = new ArrayBuffer(256);
        let offset = 0;
        const view = new DataView(tlv);
        Object.keys(this).forEach(key => {
            if (this.tlvMembers.has(key)) {
                let convert = this.convertToBytes(this[key as keyof Invoice], this.tlvMembers2.get(key)?.type ?? "");
                let len = convert.length;
                view.setUint8(offset++, this.tlvMembers.get(key) as number);
                view.setUint8(offset++, len);
                for (let i = 0; i<convert.length; i++) {
                    view.setUint8(offset++, convert[i]);
                }
            } 
        })
        return new Uint8Array(tlv).slice(0, offset);
    }

    fromTLV2(tlvBytes: Uint8Array) {
        console.log(`Inbound TLV : ${tlvBytes}`);
        let offset = 0;
        while (offset < tlvBytes.length) {
            const tag = tlvBytes[offset++];
            // console.log(`has reverse tag? ${tag}, ${typeof tag} ${this.reverseTlVMembers.has(tag)}`);
            if (this.reverseTlVMembers.has(tag)) {
                let reverseTag = this.reverseTlVMembers.get(tag) ?? "";
                let len = tlvBytes[offset++];
                let value = tlvBytes.slice(offset, offset+len);
                let decodedValue = this.decodeFromBytes(value, this.tlvMembers2.get(reverseTag)?.type ?? "" )
                console.log(`data: ${ tlvBytes.slice(offset, offset+len)}, ${decodedValue}`);
                offset+= len;
            }
        }
    } 

    decodeFromBytes(value: Uint8Array, valueType: string): any {
        let result;
        switch(valueType) {
            case "number" : {
                result = value[0]
                break;
            }
            case "string" : {
                result = new TextDecoder().decode(value);
                break;
            }
            case "boolean" : {
                result = value[0] === 1;
                break;
            }
            case "byte_codable" : {
                break;
            }
            case "tlv" : {

                break;
            }
            case "byte_array": {
                result = value;
                break;
            }
            default: {
                break;
            }
            
        }
        return result;
    }

    convertToBytes(value: any, valueType: string): Uint8Array {
        let result = new Uint8Array();
    switch(valueType) {
        case "number" : {
            let valueAsNumber = value as number;
            if (Number.isInteger(valueAsNumber)) {
                if (valueAsNumber >= -128 || valueAsNumber <= 127) { // uint 8
                    const buffer = new ArrayBuffer(1);
                    const view = new DataView(buffer);
                    view.setUint8(0, valueAsNumber);
                    result = new Uint8Array(buffer);
                } else if (valueAsNumber >= -32768 || valueAsNumber <= 32767) { // uint 16
                    const buffer = new ArrayBuffer(2);
                    const view = new DataView(buffer);
                    view.setUint16(0, valueAsNumber);
                    result = new Uint8Array(buffer);
                } else if (valueAsNumber >= -2147483648 || valueAsNumber <= 2147483647) { // unint 32
                    const buffer = new ArrayBuffer(4);
                    const view = new DataView(buffer);
                    view.setUint32(0, valueAsNumber);
                    result = new Uint8Array(buffer);
                }
            } else {
                const buffer = new ArrayBuffer(4);
                const view = new DataView(buffer);
                view.setFloat32(0, valueAsNumber);
                result = new Uint8Array(buffer);
            }
            break;
        }
        case "string" : {
            const te = new TextEncoder();
            result = te.encode(value);
            break;
        }
        case "boolean" : {
            result[0] = value as boolean === true ? 1 : 0
            break;
        }
        case "tlv": {
            let valueAsTLV = value as TLVCodable;
            result = valueAsTLV.toTLV();
            break;
        }
        case "byte_codable": {
            break;
        }
        case "byte_array": {
            result = value;
            break;
        }
        default: {
            break;
        }
    }
    return result;
    }
}

export function fromTLV() {

}

/**
 * 
 */
export function fromBech32String(bech32String: string): Invoice | undefined {

    return undefined
}