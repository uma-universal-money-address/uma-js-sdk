// Adapted from Alby's NWC sdk: https://github.com/getAlby/js-sdk/blob/master/src/NWCClient.ts
import {
  type Event,
  type Filter,
  finalizeEvent,
  getPublicKey,
  nip04,
  nip44,
  Relay,
  type UnsignedEvent,
} from "nostr-tools";
import { NWCWalletInfo } from "nostr-tools/kinds";
import * as Nip47 from "./Nip47Types";

export interface NwcConnection {
  relayUrl: string;
  walletPubkey: string;
  secret: Uint8Array;
  lud16?: string;
}

export class NwcRequester {
  relay!: Relay;
  relayUrl!: string;
  walletPubkey!: string;
  secret!: Uint8Array;
  lud16: string | undefined;
  useNip44: boolean;
  cachedWalletInfoEvent: Event | undefined;
  clearUserAuth: () => void;
  tokenRefresh?: () => Promise<{ nwcConnectionUri: string }>;

  static parseWalletConnectUrl(walletConnectUrl: string): NwcConnection {
    walletConnectUrl = walletConnectUrl
      .replace("nostrwalletconnect://", "http://")
      .replace("nostr+walletconnect://", "http://")
      .replace("nostrwalletconnect:", "http://")
      .replace("nostr+walletconnect:", "http://");
    const url = new URL(walletConnectUrl);
    const relayUrl = url.searchParams.get("relay");
    if (!relayUrl) {
      throw new Error("No relay URL found in connection string");
    }
    const secret = url.searchParams.get("secret");
    if (!secret) {
      throw new Error("No secret key found in connection string");
    }

    const connection: NwcConnection = {
      walletPubkey: url.host,
      relayUrl,
      secret: hexToBytes(secret),
    };

    const lud16 = url.searchParams.get("lud16");
    if (lud16) {
      connection.lud16 = lud16;
    }
    return connection;
  }

  private initNwcConnection(nwcConnection: NwcConnection) {
    this.relayUrl = nwcConnection.relayUrl;
    this.relay = new Relay(this.relayUrl);
    this.secret = nwcConnection.secret;
    this.lud16 = nwcConnection.lud16;
    this.walletPubkey = nwcConnection.walletPubkey;
    this.cachedWalletInfoEvent = undefined;

    if (globalThis.WebSocket === undefined) {
      console.error(
        "WebSocket is undefined. Make sure to `import websocket-polyfill` for nodejs environments",
      );
    }
  }

  constructor(
    url: string,
    clearUserAuth: () => void,
    tokenRefresh?: () => Promise<{ nwcConnectionUri: string }>,
  ) {
    this.initNwcConnection(NwcRequester.parseWalletConnectUrl(url));
    this.clearUserAuth = clearUserAuth;
    // Use nip-44 by default for connections established with the auth flow,
    // but not for manual connections since we don't know if the wallet supports it.
    this.useNip44 = !!tokenRefresh;
    if (tokenRefresh) {
      this.tokenRefresh = tokenRefresh;
    }
  }

  get publicKey() {
    if (!this.secret) {
      throw new Error("Missing secret key");
    }
    return getPublicKey(this.secret);
  }

  signEvent(event: UnsignedEvent): Promise<Event> {
    if (!this.secret) {
      throw new Error("Missing secret key");
    }

    return Promise.resolve(finalizeEvent(event, this.secret));
  }

  close() {
    return this.relay.close();
  }

  async encrypt(pubkey: string, content: string) {
    if (!this.secret) {
      throw new Error("Missing secret");
    }

    if (this.useNip44) {
      const key = await nip44.getConversationKey(this.secret, pubkey);
      return nip44.encrypt(content, key);
    }

    return await nip04.encrypt(this.secret, pubkey, content);
  }

  async decrypt(pubkey: string, content: string) {
    if (!this.secret) {
      throw new Error("Missing secret");
    }
    if (this.useNip44) {
      const key = await nip44.getConversationKey(this.secret, pubkey);
      return nip44.decrypt(content, key);
    }

    return await nip04.decrypt(this.secret, pubkey, content);
  }

  async getInfo(): Promise<Nip47.GetInfoResponse> {
    try {
      const result = await this.executeNip47Request<Nip47.GetInfoResponse>(
        "get_info",
        {},
        (result) => !!result.methods,
      );
      return result;
    } catch (error) {
      console.error("Failed to request get_info", error);
      throw error;
    }
  }

  async getBudget(): Promise<Nip47.GetBudgetResponse> {
    try {
      const result = await this.executeNip47Request<Nip47.GetBudgetResponse>(
        "get_budget",
        {},
        (result) => true,
      );
      return result;
    } catch (error) {
      console.error("Failed to request get_budget", error);
      throw error;
    }
  }

  async getBalance(
    request: Nip47.GetBalanceRequest = {},
  ): Promise<Nip47.GetBalanceResponse> {
    try {
      const result = await this.executeNip47Request<Nip47.GetBalanceResponse>(
        "get_balance",
        request,
        (result) => result.balance !== undefined,
      );
      return result;
    } catch (error) {
      console.error("Failed to request get_balance", error);
      throw error;
    }
  }

  async payInvoice(
    request: Nip47.PayInvoiceRequest,
  ): Promise<Nip47.PayResponse> {
    try {
      const result = await this.executeNip47Request<Nip47.PayResponse>(
        "pay_invoice",
        request,
        (result) => !!result.preimage,
      );
      return result;
    } catch (error) {
      console.error("Failed to request pay_invoice", error);
      throw error;
    }
  }

  async payKeysend(
    request: Nip47.PayKeysendRequest,
  ): Promise<Nip47.PayResponse> {
    try {
      const result = await this.executeNip47Request<Nip47.PayResponse>(
        "pay_keysend",
        request,
        (result) => !!result.preimage,
      );

      return result;
    } catch (error) {
      console.error("Failed to request pay_keysend", error);
      throw error;
    }
  }

  async makeInvoice(
    request: Nip47.MakeInvoiceRequest,
  ): Promise<Nip47.Transaction> {
    try {
      if (!request.amount) {
        throw new Error("No amount specified");
      }

      const result = await this.executeNip47Request<Nip47.Transaction>(
        "make_invoice",
        request,
        (result) => !!result.invoice,
      );

      return result;
    } catch (error) {
      console.error("Failed to request make_invoice", error);
      throw error;
    }
  }

  async lookupInvoice(
    request: Nip47.LookupInvoiceRequest,
  ): Promise<Nip47.Transaction> {
    try {
      const result = await this.executeNip47Request<Nip47.Transaction>(
        "lookup_invoice",
        request,
        (result) => !!result.invoice,
      );

      return result;
    } catch (error) {
      console.error("Failed to request lookup_invoice", error);
      throw error;
    }
  }

  async listTransactions(
    request: Nip47.ListTransactionsRequest,
  ): Promise<Nip47.ListTransactionsResponse> {
    try {
      const result =
        await this.executeNip47Request<Nip47.ListTransactionsResponse>(
          "list_transactions",
          request,
          (response) => !!response.transactions,
        );

      return result;
    } catch (error) {
      console.error("Failed to request list_transactions", error);
      throw error;
    }
  }

  async lookupUser(
    request: Nip47.LookupUserRequest,
  ): Promise<Nip47.LookupUserResponse> {
    try {
      const result = await this.executeNip47Request<Nip47.LookupUserResponse>(
        "lookup_user",
        request,
        (response) => !!response.currencies,
      );

      return result;
    } catch (error) {
      console.error("Failed to request lookup_user", error);
      throw error;
    }
  }

  async fetchQuote(request: Nip47.FetchQuoteRequest): Promise<Nip47.Quote> {
    try {
      const result = await this.executeNip47Request<Nip47.Quote>(
        "fetch_quote",
        request,
        (response) => !!response.multiplier,
      );

      return result;
    } catch (error) {
      console.error("Failed to request fetch_quote", error);
      throw error;
    }
  }

  async executeQuote(
    request: Nip47.ExecuteQuoteRequest,
  ): Promise<Nip47.ExecuteQuoteResponse> {
    try {
      const result = await this.executeNip47Request<Nip47.ExecuteQuoteResponse>(
        "execute_quote",
        request,
        (response) => !!response.preimage,
      );

      return result;
    } catch (error) {
      console.error("Failed to request execute_quote", error);
      throw error;
    }
  }

  async payToAddress(
    request: Nip47.PayToAddressRequest,
  ): Promise<Nip47.PayToAddressResponse> {
    try {
      const result = await this.executeNip47Request<Nip47.PayToAddressResponse>(
        "pay_to_address",
        request,
        (response) => !!response.preimage,
      );

      return result;
    } catch (error) {
      console.error("Failed to request pay_to_address", error);
      throw error;
    }
  }

  private async executeNip47Request<T>(
    nip47Method: Nip47.Method,
    params: unknown,
    resultValidator: (result: T) => boolean,
  ): Promise<T> {
    await this._checkConnected();
    return new Promise<T>((resolve, reject) => {
      (async () => {
        const command = {
          method: nip47Method,
          params,
        };
        const encryptedCommand = await this.encrypt(
          this.walletPubkey,
          JSON.stringify(command),
        );
        const unsignedEvent: UnsignedEvent = {
          kind: 23194,
          created_at: Math.floor(Date.now() / 1000),
          tags: [
            ["p", this.walletPubkey],
            ["encryption", this.useNip44 ? "nip44_v2" : "nip04"],
          ],
          content: encryptedCommand,
          pubkey: this.publicKey,
        };

        const event = await this.signEvent(unsignedEvent);
        // subscribe to NIP_47_SUCCESS_RESPONSE_KIND and NIP_47_ERROR_RESPONSE_KIND
        // that reference the request event (NIP_47_REQUEST_KIND)
        const sub = this.relay.subscribe(
          [
            {
              kinds: [23195],
              authors: [this.walletPubkey],
              "#e": [event.id],
            },
          ],
          {
            onevent: async (event) => {
              clearTimeout(replyTimeoutCheck);
              sub.close();
              const decryptedContent = await this.decrypt(
                this.walletPubkey,
                event.content,
              );
              let response;
              try {
                response = JSON.parse(decryptedContent);
              } catch (e) {
                clearTimeout(replyTimeoutCheck);
                sub.close();
                reject(
                  new Nip47.Nip47ResponseDecodingError(
                    "failed to deserialize response",
                    "INTERNAL",
                  ),
                );
                return;
              }
              if (response.result) {
                if (resultValidator(response.result)) {
                  resolve(response.result);
                } else {
                  clearTimeout(replyTimeoutCheck);
                  sub.close();
                  reject(
                    new Nip47.Nip47ResponseValidationError(
                      "response from NWC failed validation: " +
                        JSON.stringify(response.result),
                      "INTERNAL",
                    ),
                  );
                }
              } else {
                clearTimeout(replyTimeoutCheck);
                sub.close();
                if (response.error?.code === "UNAUTHORIZED") {
                  this.clearUserAuth();
                }
                reject(
                  new Nip47.Nip47WalletError(
                    response.error?.message || "unknown Error",
                    response.error?.code || "INTERNAL",
                  ),
                );
              }
            },
          },
        );

        function replyTimeout() {
          sub.close();
          reject(
            new Nip47.Nip47ReplyTimeoutError(
              `reply timeout: event ${event.id}`,
              "INTERNAL",
            ),
          );
        }

        const replyTimeoutCheck = setTimeout(replyTimeout, 60000);

        function publishTimeout() {
          sub.close();
          reject(
            new Nip47.Nip47PublishTimeoutError(
              `publish timeout: ${event.id}`,
              "INTERNAL",
            ),
          );
        }
        const publishTimeoutCheck = setTimeout(publishTimeout, 5000);

        try {
          await this.relay.publish(event);
          clearTimeout(publishTimeoutCheck);
        } catch (error) {
          clearTimeout(publishTimeoutCheck);
          reject(
            new Nip47.Nip47PublishError(
              `failed to publish: ${error}`,
              "INTERNAL",
            ),
          );
        }
      })();
    });
  }

  private async _checkConnected() {
    if (!this.secret) {
      throw new Error("Missing secret key");
    }

    if (this.tokenRefresh) {
      const { nwcConnectionUri } = await this.tokenRefresh();
      if (!nwcConnectionUri) {
        throw new Error("Missing nwcConnectionUri upon refreshing token");
      }

      const nwcConnection =
        NwcRequester.parseWalletConnectUrl(nwcConnectionUri);
      if (!byteArraysEqual(nwcConnection.secret, this.secret)) {
        this.initNwcConnection(nwcConnection);
      }
    }

    await this.relay.connect();

    if (!this.cachedWalletInfoEvent) {
      this.cachedWalletInfoEvent = await this.fetchExistingEvent([
        {
          kinds: [NWCWalletInfo],
          authors: [this.walletPubkey],
        },
      ]);
      const encryptionTag = this.cachedWalletInfoEvent.tags.find(
        (tag) => tag[0] === "encryption",
      );
      this.useNip44 = encryptionTag?.[1].includes("nip44_v2") || false;
    }
  }

  private async fetchExistingEvent(filters: Filter[]) {
    return await new Promise<Event>((resolve, reject) => {
      const sub = this.relay.subscribe(filters, {
        onevent(event) {
          clearTimeout(timeout);
          resolve(event);
        },
        oneose() {
          clearTimeout(timeout);
          sub.close();
        },
      });
      const timeout = setTimeout(() => {
        sub.close();
        reject(
          new Nip47.Nip47ReplyTimeoutError(
            `timeout fetching info event.`,
            "INTERNAL",
          ),
        );
      }, 5000);
    });
  }
}

const hexToBytes = (hex: string): Uint8Array => {
  if (hex.length % 2 !== 0) {
    throw new Error("Invalid hex string");
  }
  return new Uint8Array(
    hex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)),
  );
};

const byteArraysEqual = (a: Uint8Array, b: Uint8Array): boolean =>
  a.length === b.length && a.every((v, i) => v === b[i]);
