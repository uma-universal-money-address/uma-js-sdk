export const isError = (e: unknown): e is Error => {
  return Boolean(
    typeof e === "object" &&
      e !== null &&
      "name" in e &&
      typeof e.name === "string" &&
      "message" in e &&
      typeof e.message === "string" &&
      "stack" in e &&
      (!e.stack || typeof e.stack === "string"),
  );
};

export class InvalidInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidInputError";
  }
}
