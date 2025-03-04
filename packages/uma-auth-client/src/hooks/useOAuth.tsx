import * as oauth from "oauth4webapi";
import { getUmaUsername } from "src/utils/getUmaUsername";
import { isValidUma } from "src/utils/isValidUma";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  type DiscoveryDocument,
  fetchDiscoveryDocument,
} from "./useDiscoveryDocument";

type UmaAuthToken = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  nwc_connection_uri: string;
  commands: string[];
  budget?: string | undefined;
  nwc_expires_at?: number | undefined;
};

export interface TokenState {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  commands?: string[];
  budget?: string | undefined;
}

export interface BudgetConfig {
  amountInLowestDenom: string;
  currency: string;
  period: string;
}

export interface AuthConfig {
  identityNpub: string;
  identityRelayUrl: string;
  redirectUri: string;
  requiredCommands?: string[] | undefined;
  optionalCommands?: string[] | undefined;
  budget?: BudgetConfig | undefined;
}

interface OAuthState {
  codeVerifier?: string | undefined;
  csrfState?: string | undefined;
  address?: string | undefined;
  token?: TokenState | undefined;
  authConfig?: AuthConfig;
  nwcConnectionUri?: string | undefined;
  nwcExpiresAt?: number | undefined;
  setAuthConfig: (config: AuthConfig) => void;
  setToken: (token?: TokenState) => void;
  /** Check if the connection is valid or expired. */
  isConnectionValid: () => boolean;
  /** The initial OAuth request that starts the OAuth handshake. */
  initialOAuthRequest: (uma: string) => Promise<{ success: boolean }>;
  /** OAuth token exchange occurs after the initialOAuthRequest has been made. */
  oAuthTokenExchange: () => Promise<{
    nwcConnectionUri: string;
    token: TokenState;
    codeVerifier: string;
    nwcExpiresAt: number | undefined;
  }>;
  hasValidToken: () => boolean;
  clearUserAuth: () => void;
  setNwcConnectionUri: (nwcConnectionUri: string | undefined) => void;
  setAddress: (address: string) => void;
}

export const useOAuth = create<OAuthState>()(
  persist(
    (set, get) => ({
      setAuthConfig: (authConfig) => set({ authConfig }),
      setToken: (token) =>
        set({
          token,
        }),
      isConnectionValid: () => {
        const state = get();
        return isConnectionValid(state);
      },
      setNwcConnectionUri: (nwcConnectionUri) => set({ nwcConnectionUri }),
      setAddress: (address) => set({ address }),
      initialOAuthRequest: async (uma) => {
        const state = get();
        const { codeVerifier, authUrl, csrfState } = await getAuthorizationUrl(
          state,
          uma,
        );
        if (authUrl) {
          set({ codeVerifier, csrfState, address: uma });
          window.location.href = authUrl.toString();
        }
        return { success: !!authUrl };
      },
      oAuthTokenExchange: async () => {
        const state = get();
        const result = await oAuthTokenExchange(state);
        set(result);
        return result;
      },
      hasValidToken: () => {
        const state = get();
        const { token } = state;
        if (!token) {
          return false;
        }
        if (token.expiresAt && Date.now() >= token.expiresAt) {
          return false;
        }
        return true;
      },
      clearUserAuth: () => {
        deleteCodeAndStateFromUrl();
        set({
          token: undefined,
          nwcConnectionUri: undefined,
          nwcExpiresAt: undefined,
          codeVerifier: undefined,
          csrfState: undefined,
          address: undefined,
        });
      },
    }),
    {
      name: "uma-connect",
      partialize: (state) => ({
        nwcConnectionUri: state.nwcConnectionUri,
        nwcExpiresAt: state.nwcExpiresAt,
        token: state.token,
        codeVerifier: state.codeVerifier,
        csrfState: state.csrfState,
        address: state.address,
      }),
    },
  ),
);

const isConnectionValid = (state: OAuthState) => {
  if (!state.nwcConnectionUri) {
    return false;
  }
  return !state.nwcExpiresAt || Date.now() < state.nwcExpiresAt;
};

const getAuthorizationUrl = async (state: OAuthState, uma: string) => {
  const { authConfig } = state;
  if (!authConfig) {
    throw new Error("Auth config not set.");
  }

  let discoveryDocument: DiscoveryDocument;
  try {
    discoveryDocument = await fetchDiscoveryDocument(uma);
  } catch (e) {
    console.error("Failed to fetch discovery document", e);
    return { codeVerifier: "", authUrl: "", csrfState: "" };
  }

  const clientId = `${authConfig.identityNpub} ${authConfig.identityRelayUrl}`;
  const requiredCommands = authConfig.requiredCommands?.join(" ") || "";
  const optionalCommands = authConfig.optionalCommands?.join(" ") || "";
  let budget = "";
  if (authConfig.budget) {
    budget = `${authConfig.budget.amountInLowestDenom}.${authConfig.budget.currency}%2F${authConfig.budget.period}`;
  }

  const codeVerifier = oauth.generateRandomCodeVerifier();
  const codeChallenge = await oauth.calculatePKCECodeChallenge(codeVerifier);
  const csrfState = oauth.generateRandomState();

  const authUrl = new URL(discoveryDocument.authorization_endpoint);
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", authConfig.redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("state", csrfState);
  authUrl.searchParams.set("required_commands", requiredCommands);
  authUrl.searchParams.set("optional_commands", optionalCommands);
  authUrl.searchParams.set("budget", budget);
  authUrl.searchParams.set("uma_username", getUmaUsername(uma));

  return {
    codeVerifier,
    authUrl,
    csrfState,
  };
};

const oAuthTokenExchange = async (state: OAuthState) => {
  const {
    codeVerifier,
    token,
    nwcConnectionUri,
    nwcExpiresAt,
    authConfig,
    address,
  } = state;
  if (!authConfig) {
    throw new Error("Auth config not set.");
  }
  if (!address || !isValidUma(address)) {
    throw new Error("UMA not set.");
  }

  // If we have a connection URI and the access token that hasn't expired, we don't need to do
  // anything
  if (
    nwcConnectionUri &&
    token &&
    (!token.expiresAt || Date.now() < token.expiresAt)
  ) {
    return {
      codeVerifier: "",
      token,
      nwcConnectionUri,
      nwcExpiresAt,
    };
  }

  const discoveryDocument = await fetchDiscoveryDocument(address);

  const as: oauth.AuthorizationServer = {
    issuer: new URL(discoveryDocument.authorization_endpoint).origin,
    authorization_endpoint: discoveryDocument.authorization_endpoint,
    token_endpoint: discoveryDocument.token_endpoint,
    code_challenge_methods_supported:
      discoveryDocument.code_challenge_methods_supported || ["S256"],
  };

  const authClient: oauth.Client = {
    client_id: `${authConfig.identityNpub} ${authConfig.identityRelayUrl}`,
    token_endpoint_auth_method: "none",
  };

  let resultToken: UmaAuthToken;
  if (token?.refreshToken && nwcExpiresAt && Date.now() < nwcExpiresAt) {
    authClient.token = {
      access_token: token.accessToken,
      refresh_token: token.refreshToken,
      expires_at: token.expiresAt,
    };

    const resultTokenResponse = await oauth.refreshTokenGrantRequest(
      as,
      authClient,
      token.refreshToken,
    );
    const result = await oauth.processRefreshTokenResponse(
      as,
      authClient,
      resultTokenResponse,
    );
    if (oauth.isOAuth2Error(result)) {
      console.error("Error Response", result);
      throw new Error(); // Handle OAuth 2.0 response body error
    }

    resultToken = processAsUmaAuthToken(result);
  } else {
    if (!codeVerifier) {
      throw new Error(
        "Code verifier not found. Make initial OAuth request first.",
      );
    }

    const params = oauth.validateAuthResponse(
      as,
      authClient,
      new URL(window.location.href),
      state.csrfState,
    );
    if (oauth.isOAuth2Error(params)) {
      console.error("Error Response", params);
      throw new Error("Invalid auth response"); // Handle OAuth 2.0 redirect error
    }

    const response = await oauth.authorizationCodeGrantRequest(
      as,
      authClient,
      params,
      authConfig.redirectUri,
      codeVerifier,
    );

    const result = await oauth.processAuthorizationCodeOAuth2Response(
      as,
      authClient,
      response,
    );
    if (oauth.isOAuth2Error(result)) {
      console.error("Error Response", result);
      throw new Error("Failed code exchange"); // Handle OAuth 2.0 response body error
    }

    console.log("Access Token Response", result);
    resultToken = processAsUmaAuthToken(result);
  }

  deleteCodeAndStateFromUrl();

  return {
    codeVerifier: "",
    token: {
      accessToken: resultToken.access_token,
      refreshToken: resultToken.refresh_token,
      expiresAt: resultToken.expires_at,
      commands: resultToken.commands,
      budget: resultToken.budget,
    },
    nwcConnectionUri: resultToken.nwc_connection_uri,
    nwcExpiresAt: resultToken.nwc_expires_at,
  };
};

const processAsUmaAuthToken = (
  token: oauth.OAuth2TokenEndpointResponse | oauth.TokenEndpointResponse,
): UmaAuthToken => {
  if (
    !token.access_token ||
    !token.refresh_token ||
    !token.expires_in ||
    !token.nwc_connection_uri ||
    !token.commands
  ) {
    throw new Error("Invalid UMA token");
  }

  if (typeof token.nwc_connection_uri !== "string") {
    throw new Error("Invalid NWC connection URI");
  }

  const commandStrings: string[] = [];
  if (!Array.isArray(token.commands)) {
    throw new Error("Invalid commands");
  }
  for (const command of token.commands) {
    if (typeof command !== "string") {
      throw new Error("Invalid command");
    }
    commandStrings.push(command);
  }

  if (token.budget != null && typeof token.budget !== "string") {
    throw new Error("Invalid budget");
  }

  const expiresAt = Date.now() + token.expires_in * 1000;
  const umaToken: UmaAuthToken = {
    access_token: token.access_token,
    refresh_token: token.refresh_token,
    expires_at: expiresAt,
    nwc_connection_uri: token.nwc_connection_uri,
    commands: commandStrings,
    budget: token.budget || undefined,
  };

  if (token.nwc_expires_at && typeof token.nwc_expires_at === "number") {
    umaToken.nwc_expires_at = token.nwc_expires_at * 1000;
  }

  return umaToken;
};

const deleteCodeAndStateFromUrl = () => {
  const url = new URL(window.location.href);
  url.searchParams.delete("code");
  url.searchParams.delete("state");
  window.history.replaceState({}, document.title, url.toString());
};
