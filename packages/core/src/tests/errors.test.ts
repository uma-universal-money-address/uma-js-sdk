import { InvalidInputError, UmaError } from "../errors.js";
import { ErrorCode } from "../generated/errorCodes.js";
import { UnsupportedVersionError } from "../version.js";

describe("uma errors", () => {
  it("should create base UMA error with correct properties", () => {
    const error = new UmaError("test reason", ErrorCode.INTERNAL_ERROR);
    const jsonOutput = JSON.parse(error.toJSON());

    expect(jsonOutput.status).toBe("ERROR");
    expect(jsonOutput.reason).toBe("test reason");
    expect(jsonOutput.code).toBe("INTERNAL_ERROR");
    expect(error.httpStatusCode).toBe(500);
  });

  it("should create error with invalid signature code", () => {
    const error = new InvalidInputError(
      "Bad signature",
      ErrorCode.INVALID_SIGNATURE,
    );
    const jsonOutput = JSON.parse(error.toJSON());

    expect(jsonOutput.status).toBe("ERROR");
    expect(jsonOutput.reason).toBe("Bad signature");
    expect(jsonOutput.code).toBe("INVALID_SIGNATURE");
    expect(error.httpStatusCode).toBe(401);
  });

  it("should create error with unsupported version code", () => {
    const error = new UnsupportedVersionError("1.2", [0, 1]);
    const jsonOutput = JSON.parse(error.toJSON());

    expect(jsonOutput.status).toBe("ERROR");
    expect(jsonOutput.reason).toBe("unsupported version: 1.2");
    expect(jsonOutput.code).toBe("UNSUPPORTED_UMA_VERSION");
    expect(jsonOutput.supportedMajorVersions).toEqual([0, 1]);
    expect(error.httpStatusCode).toBe(412);
  });
});
