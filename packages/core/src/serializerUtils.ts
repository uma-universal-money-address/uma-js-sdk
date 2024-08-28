/**
 * converts a number into a byte representation
 * @param value - number to serialize
 * @returns
 */
export function serializeNumber(value: number): Uint8Array {
  let result = new Uint8Array();
  if (Number.isInteger(value)) {
    if (value >= -128 && value <= 127) {
      // uint 8
      const buffer = new ArrayBuffer(1);
      const view = new DataView(buffer);
      view.setInt8(0, value as number);
      result = new Uint8Array(buffer);
    } else if (value >= -32768 && value <= 32767) {
      // uint 16
      const buffer = new ArrayBuffer(2);
      const view = new DataView(buffer);
      view.setInt16(0, value as number);
      result = new Uint8Array(buffer);
    } else if (value >= -2147483648 && value <= 2147483647) {
      // unint 32
      const buffer = new ArrayBuffer(4);
      const view = new DataView(buffer);
      view.setInt32(0, value as number);
      result = new Uint8Array(buffer);
    } else {
      const buffer = new ArrayBuffer(8);
      const view = new DataView(buffer);
      view.setBigInt64(0, BigInt(value));
      result = new Uint8Array(buffer);
    }
  } else {
    const buffer = new ArrayBuffer(4);
    const view = new DataView(buffer);
    view.setFloat32(0, value as number);
    result = new Uint8Array(buffer);
  }
  return result;
}

export function serializeString(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

export function serializeBoolean(value: boolean): Uint8Array {
  return new Uint8Array([value ? 1 : 0]);
}

/**
 * there isn't enough info to infer int / float from a serialized number, so we recommend providing an explicit float
 * deserialize function for values intended to be integers.
 * @param value - Uint8Array representing a number serialized as bytes
 * @returns integer
 */
export function deserializeNumber(value: Uint8Array): number {
  let result;
  const length = value.length;
  const view = new DataView(value.buffer);
  switch (length) {
    case 1: {
      result = view.getInt8(0);
      break;
    }
    case 2: {
      // 16 bit
      result = view.getInt16(0);
      break;
    }
    case 4: {
      // 32 bit
      result = view.getInt32(0);
      break;
    }
    case 8: {
      // 64 bit
      const parsed = view.getBigInt64(0);
      if (parsed >= Number.MIN_VALUE && parsed <= Number.MAX_VALUE) {
        result = Number(parsed);
      } else {
        // TODO support bigint
        result = -1;
      }
      break;
    }
    default: {
        result = view.getInt8(0);
        break;
      }
  }
  return result;
}

/**
 * there isn't enough info to infer int / float from a serialized number, so we recommend providing an explicit float
 * deserialize function for values intended to be floats or doubles.
 * @param value - Uint8Array representing byte serialization of a float
 * @returns number either 8 byte or 4 byte float. if lenght of input value is not 4 or 8, return the first byte
 */
export function deserializeFloat(value: Uint8Array): number {
  let result;
  const length = value.length;
  const view = new DataView(value.buffer);
  switch (length) {
    case 4: {
      result = view.getFloat32(0);
      break;
    }
    case 8: {
      result = view.getFloat64(0);
      break;
    }
    default: {
      result = view.getUint8(0);
      break;
    }
  }
  return result;
}

export function deserializeString(value: Uint8Array): string {
  return new TextDecoder().decode(value);
}

export function deserializeBoolean(value: Uint8Array): boolean {
  return value[0] === 1;
}
