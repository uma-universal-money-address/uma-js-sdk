import { z } from "zod";

export const optionalIgnoringNull = <T>(schema: z.ZodType<T>) =>
  z.optional(schema.nullable().transform((s) => s ?? undefined));
