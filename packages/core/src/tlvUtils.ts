
export interface TLVCodable {
    tlvMembers: Map<string, TLVField>
    toTLV(): Uint8Array
}

type TLVField = {
    tag : number,
    type: string
}

export function mergeByteArrays(byteArrays: Array<Uint8Array>): Uint8Array {
    const totalLength = byteArrays.reduce((acc, curr) => acc + curr.length, 0);
    let offset = 0;
    const combinedArray = new Uint8Array(totalLength);
    for (const array of byteArrays) {
        combinedArray.set(array, offset);
        offset+= array.length;
    }
    return combinedArray;
}

export function convertToBytes(value: any, valueType: string): Uint8Array {
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

export function decodeFromBytes(value: Uint8Array, valueType: string): any {
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