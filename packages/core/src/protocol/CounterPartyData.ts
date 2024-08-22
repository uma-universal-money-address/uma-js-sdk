import { z } from "zod";

export const CounterPartyDataOptionSchema = z.object({
  mandatory: z.boolean(),
});

export type CounterPartyDataOption = z.infer<
  typeof CounterPartyDataOptionSchema
>;

/**
 * CounterPartyDataOptions describes which fields a vasp needs to know about the sender or receiver.
 * Used for payerData and payeeData.
 */
export const CounterPartyDataOptionsSchema = z.record(
  CounterPartyDataOptionSchema,
);

export type CounterPartyDataOptions = z.infer<
  typeof CounterPartyDataOptionsSchema
>;

/**
 * this function serializes CounterPartyDataOptions into bytes.  The options are sorted
 * to match other platforms
 * @param options - incoming CounterPartyDataOptions
 * @returns Uint8Array representing byte encoded string of options
 */
export function counterPartyDataOptionsToBytes(
  options: CounterPartyDataOptions,
): Uint8Array {
  const formatArray = new Array<string>();
  Object.keys(options)
    .sort()
    .forEach((key) => {
      const k = key as keyof CounterPartyDataOptions;
      formatArray.push(`${key}:${options[k].mandatory ? "1" : "0"}`);
    });
  const formatStr = formatArray.join(",");
  return new TextEncoder().encode(formatStr);
}

export function counterPartyDataOptionsFromBytes(
  bytes: Uint8Array,
): CounterPartyDataOptions {
  const result: CounterPartyDataOptions = {};
  const options = new TextDecoder().decode(bytes);
  options.split(",").forEach((dataOption) => {
    const dataOptionsSplit = dataOption.split(":");
    if (dataOptionsSplit.length == 2) {
      result[dataOptionsSplit[0]] = {
        mandatory: dataOptionsSplit[1] === "1",
      };
    }
  });
  return result;
}
