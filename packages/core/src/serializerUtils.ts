export function serializeNumber(value: number): Uint8Array {
    let result = new Uint8Array();
    if (Number.isInteger(value)) {
        if (value >= -128 && value <= 127) { // uint 8
            const buffer = new ArrayBuffer(1);
            const view = new DataView(buffer);
            view.setInt8(0, value);
            result = new Uint8Array(buffer);
        } else if (value >= -32768 && value <= 32767) { // uint 16
            const buffer = new ArrayBuffer(2);
            const view = new DataView(buffer);
            view.setInt16(0, value);
            result = new Uint8Array(buffer);
        } else if (value >= -2147483648 && value <= 2147483647) { // unint 32
            const buffer = new ArrayBuffer(4);
            const view = new DataView(buffer);
            view.setInt32(0, value);
            result = new Uint8Array(buffer);
        }
    } else {
        const buffer = new ArrayBuffer(4);
        const view = new DataView(buffer);
        view.setFloat32(0, value);
        result = new Uint8Array(buffer);
    }
    return result;
}

export function serializeString(value:string): Uint8Array {
    return new TextEncoder().encode(value);
}

export function serializeBoolean(value: boolean): Uint8Array {
    return new Uint8Array([value ? 1 : 0]);
}

export function serializeTLV(value: any): Uint8Array {
    if ("toTLV" in value) {
        return value.toTLV()
    } else return new Uint8Array(0);
}

export function deserializeNumber(value: Uint8Array): number {
    let result;
    const length = value.length;
    const view = new DataView(value.buffer);
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
        // case 8 : { // 64 bit
        //     result = view.getBigInt64(0);
        //     break;
        // }
        default: {
            result = view.getInt8(0);
            break;
        } break;
    }
    return result;
}

export function deserializeString(value: Uint8Array): string {
    return new TextDecoder().decode(value);
}

export function deserializeBoolean(value: Uint8Array): boolean {
    return value[0] === 1;
}

export function deserializeTLV(value: Uint8Array): string {
    return ""
}