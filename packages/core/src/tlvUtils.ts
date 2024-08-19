
/**
 * indicates this object can be transformed into a binary Tag:Length:Value format
 */
export interface TLVCodable {
    tlvMembers: Map<string, TLVField>
    toTLV(): Uint8Array
}

/**
 * used for constructor parameters in TLV classes to indicate type/tag
 */
type TLVField = {
    tag: number,
    type: string
}

export interface ByteCodable {
    toBytes(): Uint8Array
}

export function convertToBytes(value: any, valueType: string): Uint8Array {
    let result = new Uint8Array();
    switch (valueType) {
        case "number": {
            let valueAsNumber = value as number;
            console.log(`number : ${valueAsNumber}`);
            if (Number.isInteger(valueAsNumber)) {
                if (valueAsNumber >= -128 && valueAsNumber <= 127) { // uint 8
                    const buffer = new ArrayBuffer(1);
                    const view = new DataView(buffer);
                    view.setInt8(0, valueAsNumber);
                    result = new Uint8Array(buffer);
                } else if (valueAsNumber >= -32768 && valueAsNumber <= 32767) { // uint 16
                    const buffer = new ArrayBuffer(2);
                    const view = new DataView(buffer);
                    view.setInt16(0, valueAsNumber);
                    result = new Uint8Array(buffer);
                    console.log(result);
                } else if (valueAsNumber >= -2147483648 && valueAsNumber <= 2147483647) { // unint 32
                    const buffer = new ArrayBuffer(4);
                    const view = new DataView(buffer);
                    view.setInt32(0, valueAsNumber);
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
        case "string": {
            const te = new TextEncoder();
            result = te.encode(value);
            break;
        }
        case "boolean": {
            result = new Uint8Array([value as boolean === true ? 1 : 0]);
            break;
        }
        case "tlv": {
            let valueAsTLV = value as TLVCodable;
            result = valueAsTLV.toTLV();
            break;
        }
        case "byte_codeable": {
            let valueAsByteCodable = value as ByteCodable;
            result = valueAsByteCodable.toBytes();
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

export function decodeFromBytes(value: Uint8Array, valueType: string, length: number): any {
    let result;
    switch (valueType) {
        case "number": {
            const view = new DataView(value.buffer)
            switch(length) {
                case 1 : {
                    result = view.getInt8(0);
                    break;
                }
                case 2 : { // 16 bit
                    result = view.getInt16(0);
                    break
                }
                case 4 : { // 32 bit
                    result = view.getInt32(0);
                    break;
                }
                case 8 : { // 64 bit
                    result = view.getBigInt64(0);
                    break;
                }
                default: break;
            }
            break;
        }
        case "string": {
            result = new TextDecoder().decode(value);
            break;
        }
        case "boolean": {
            result = value[0] === 1;
            break;
        }
        case "byte_codable": {
            break;
        }
        case "tlv": {

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