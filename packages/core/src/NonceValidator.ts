/**
 * Interface for a class which can validate nonces to ensure that the same nonce isn't re-used between requests.
 */
export interface NonceValidator {
  /**
   * Checks if the nonce has been used before and saves it if it has not.
   *
   * @param nonce The nonce to check.
   * @param timestamp The timestamp of the message which was included in the signed payload with the nonce.
   *    This can be used to clear out old nonces if desired.
   * @returns true if the nonce was valid and has not been used before, false otherwise.
   */
  checkAndSaveNonce(nonce: string, timestamp: number): Promise<boolean>;
}

/**
 * A simple in-memory nonce validator which caches seen nonce values and rejects any which have been seen before
 * or which are older than a specified limit timestamp.
 */
export class InMemoryNonceValidator implements NonceValidator {
  constructor(private oldestValidTimestampMs: number) {}

  private seenNoncesTimestamps = new Map<string, number>();

  async checkAndSaveNonce(nonce: string, timestampSec: number) {
    if (timestampSec * 1000 < this.oldestValidTimestampMs) {
      return false;
    }

    if (this.seenNoncesTimestamps.has(nonce)) {
      return false;
    }
    this.seenNoncesTimestamps.set(nonce, timestampSec);
    return true;
  }

  /**
   * Note - this isn't used in practice, but is provided as an example of how you might purge old nonces
   * from the cache after some amount of time has elapsed.
   *
   * @param timestamp A timestamp value in ms before which all nonces should be purged.
   */
  async purgeNoncesOlderThan(timestampMs: number) {
    this.seenNoncesTimestamps.forEach((ts, nonce) => {
      if (ts * 1000 < timestampMs) {
        this.seenNoncesTimestamps.delete(nonce);
      }
    });
    this.oldestValidTimestampMs = timestampMs;
  }
}
