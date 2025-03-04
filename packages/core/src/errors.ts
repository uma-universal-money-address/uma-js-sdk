import { type ErrorDetails } from "./generated/errorCodes.js";

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

export class UmaError extends Error {
  readonly code: string;
  readonly httpStatusCode: number;

  constructor(message: string, error: ErrorDetails) {
    super(message);
    this.name = "UmaError";
    this.code = error.code;
    this.httpStatusCode = error.httpStatusCode;
  }

  getAdditionalParams(): Record<string, unknown> {
    return {};
  }

  toJSON(): string {
    return JSON.stringify({
      status: "ERROR",
      reason: this.message,
      code: this.code,
      ...this.getAdditionalParams(),
    });
  }

  toHttpStatusCode(): number {
    return this.httpStatusCode;
  }
}

export class InvalidInputError extends UmaError {
  constructor(message: string, error: ErrorDetails) {
    super(message, error);
    this.name = "InvalidInputError";
  }
}
