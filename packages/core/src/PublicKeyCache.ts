import { type PubKeyResponse } from "./protocol.js";

export interface PublicKeyCache {
  fetchPublicKeyForVasp(vaspDomain: string): PubKeyResponse | undefined;
  addPublicKeyForVasp(vaspDomain: string, pubKey: PubKeyResponse): void;
  removePublicKeyForVasp(vaspDomain: string): void;
  clear(): void;
}

export class InMemoryPublicKeyCache {
  cache: Map<string, PubKeyResponse>;

  constructor() {
    this.cache = new Map();
  }

  fetchPublicKeyForVasp(vaspDomain: string) {
    const entry = this.cache.get(vaspDomain);
    if (
      entry === undefined ||
      (entry.expirationTimestamp !== undefined &&
        entry.expirationTimestamp < Date.now())
    ) {
      return undefined;
    }
    return entry;
  }

  addPublicKeyForVasp(vaspDomain: string, pubKey: PubKeyResponse) {
    this.cache.set(vaspDomain, pubKey);
  }

  removePublicKeyForVasp(vaspDomain: string) {
    this.cache.delete(vaspDomain);
  }

  clear() {
    this.cache.clear();
  }
}
