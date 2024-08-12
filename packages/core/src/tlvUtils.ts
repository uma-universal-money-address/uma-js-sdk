
export interface TLVCodable {
    tlvMembers: Map<string, number>
    toTLV(): Uint8Array
}

export function convertToBytes(value: any): Uint8Array {
    let result = new Uint8Array();
    switch(true) {
        case typeof value === "number" : {
            const buffer = new ArrayBuffer(16);
            const view = new DataView(buffer);
            let valueAsNumber = value as number;
            if (Number.isInteger(valueAsNumber)) {
                if (valueAsNumber >= -128 || valueAsNumber <= 127) { // uint 8
                    view.setUint8(0, valueAsNumber);
                } else if (valueAsNumber >= -128 || valueAsNumber <= 127) { // uint 16
                    view.setUint16(0, valueAsNumber);
                } else if (valueAsNumber >= -128 || valueAsNumber <= 127) { // unint 32
                    view.setUint32(0, valueAsNumber);
                }
            } else {
                view.setFloat32(0, valueAsNumber);
            }
            result = new Uint8Array(buffer);
            break;
        }
        case typeof value === "string" : {
            const te = new TextEncoder();
            result = te.encode(value);
            break;
        }
        case typeof value === "boolean" : {
            result[0] = value as boolean === true ? 1 : 0
            break;
        }
        case "toTLV" in value: {
            let valueAsTLV = value as TLVCodable;
            result = valueAsTLV.toTLV();
            break;
        }
        case "toBytes" in value: {
            break;
        }
        default: {
            break;
        }
    }
    return result;
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