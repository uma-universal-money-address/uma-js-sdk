import { UmaError } from "./errors.js";
import { ErrorCode } from "./generated/errorCodes.js";

export const MAJOR_VERSION = 1;
export const MINOR_VERSION = 0;
const backCompatibleVersions = ["0.3"];

export const UmaProtocolVersion = `${MAJOR_VERSION}.${MINOR_VERSION}`;

export class UnsupportedVersionError extends UmaError {
  unsupportedVersion: string;
  supportedMajorVersions: number[];

  constructor(
    unsupportedVersion: string,
    supportedMajorVersions: number[] = Array.from(getSupportedMajorVersions()),
  ) {
    super(
      `unsupported version: ${unsupportedVersion}`,
      ErrorCode.UNSUPPORTED_UMA_VERSION,
    );
    this.unsupportedVersion = unsupportedVersion;
    this.supportedMajorVersions = supportedMajorVersions;
  }

  getAdditionalParams(): Record<string, unknown> {
    return {
      supportedMajorVersions: this.supportedMajorVersions,
    };
  }
}

export function getHighestSupportedVersionForMajorVersion(
  majorVersion: number,
): string {
  if (majorVersion === MAJOR_VERSION) {
    return UmaProtocolVersion;
  }

  for (const backCompatibleVersion of backCompatibleVersions) {
    if (getMajorVersion(backCompatibleVersion) === majorVersion) {
      return backCompatibleVersion;
    }
  }
  throw new UmaError(
    "unsupported major version",
    ErrorCode.NO_COMPATIBLE_UMA_VERSION,
  );
}

export function selectHighestSupportedVersion(
  otherVaspSupportedMajorVersions: number[],
): string {
  let highestVersion: string | undefined;
  const supportedMajorVersions = getSupportedMajorVersions();
  for (const otherVaspMajorVersion of otherVaspSupportedMajorVersions) {
    if (!supportedMajorVersions.has(otherVaspMajorVersion)) {
      continue;
    }

    if (highestVersion === undefined) {
      highestVersion = getHighestSupportedVersionForMajorVersion(
        otherVaspMajorVersion,
      );
      continue;
    }
    if (otherVaspMajorVersion > getMajorVersion(highestVersion)) {
      highestVersion = getHighestSupportedVersionForMajorVersion(
        otherVaspMajorVersion,
      );
    }
  }
  if (highestVersion === undefined) {
    throw new UmaError(
      "no supported versions",
      ErrorCode.NO_COMPATIBLE_UMA_VERSION,
    );
  }
  return highestVersion;
}

export function selectLowerVersion(
  version1String: string,
  version2String: string,
): string {
  const version1 = parseVersion(version1String);
  const version2 = parseVersion(version2String);
  if (
    version1.major > version2.major ||
    (version1.major === version2.major && version1.minor > version2.minor)
  ) {
    return version2String;
  } else {
    return version1String;
  }
}

export function isVersionSupported(version: string): boolean {
  const parsedVersion = parseVersion(version);
  if (parsedVersion === undefined) {
    return false;
  }
  return getSupportedMajorVersions().has(parsedVersion.major);
}

export function getMajorVersion(version: string): number {
  const parsedVersion = parseVersion(version);
  if (parsedVersion === undefined) {
    throw new UmaError("invalid version", ErrorCode.INVALID_INPUT);
  }
  return parsedVersion.major;
}

export function getMinorVersion(version: string): number {
  const parsedVersion = parseVersion(version);
  if (parsedVersion === undefined) {
    throw new UmaError("invalid version", ErrorCode.INVALID_INPUT);
  }
  return parsedVersion.minor;
}

export function parseVersion(version: string): {
  major: number;
  minor: number;
} {
  const [major, minor] = version.split(".");
  if (major === undefined || minor === undefined) {
    throw new UmaError("Invalid UMA version", ErrorCode.INVALID_INPUT);
  }
  return { major: parseInt(major), minor: parseInt(minor) };
}

export function getSupportedMajorVersions(): Set<number> {
  return new Set(
    [MAJOR_VERSION].concat(backCompatibleVersions.map(getMajorVersion)),
  );
}
