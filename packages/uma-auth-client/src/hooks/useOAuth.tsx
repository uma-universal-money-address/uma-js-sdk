import * as oauth from "oauth4webapi";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DiscoveryDocument,
  fetchDiscoveryDocument,
} from "./useDiscoveryDocument";

type UmaAuthToken = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  nwc_connection_uri: string;
  commands: string[];
  budget: string;
  nwc_expires_at?: number | undefined;
};

interface TokenState {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  commands?: string[];
  budget?: string;
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
  isPendingAuth: boolean;
  finishAuth: () => void;
  codeVerifier?: string;
  csrfState?: string;
  uma?: string;
  token?: TokenState | undefined;
  authConfig?: AuthConfig;
  nwcConnectionUri?: string;
  nwcExpiresAt?: number | undefined;
  setAuthConfig: (config: AuthConfig) => void;
  setToken: (token?: TokenState) => void;
  /** The initial OAuth request that starts the OAuth handshake. */
  initialOAuthRequest: (uma: string) => Promise<{ success: boolean }>;
  /** OAuth token exchange occurs after the initialOAuthRequest has been made. */
  oAuthTokenExchange: () => Promise<void>;
}

export const useOAuth = create<OAuthState>()(
  persist(
    (set, get) => ({
      isPendingAuth: false,
      finishAuth: () => set({ isPendingAuth: false }),
      setAuthConfig: (authConfig) => set({ authConfig }),
      setToken: (token) =>
        set({
          token,
        }),
      initialOAuthRequest: async (uma) => {
        const state = get();
        const { codeVerifier, authUrl, csrfState } = await getAuthorizationUrl(
          state,
          uma,
        );
        if (authUrl) {
          set({ codeVerifier, isPendingAuth: true, csrfState, uma });
          window.location.href = authUrl.toString();
        }
        return { success: !!authUrl };
      },
      oAuthTokenExchange: async () => {
        const state = get();
        const result = await oAuthTokenExchange(state);
        set(result);
      },
    }),
    {
      name: "uma-connect",
      partialize: (state) => ({
        isPendingAuth: state.isPendingAuth,
        nwcConnectionUri: state.nwcConnectionUri,
        codeVerifier: state.codeVerifier,
        csrfState: state.csrfState,
        uma: state.uma,
      }),
    },
  ),
);

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
    return { codeVerifier: "", authUrl: "" };
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
    uma,
  } = state;
  if (!authConfig) {
    throw new Error("Auth config not set.");
  }
  if (!uma) {
    throw new Error("UMA not set.");
  }

  // If we have a connection URI and a token that hasn't expired, we don't need to do anything
  if (
    nwcConnectionUri &&
    token &&
    (!token.expiresAt || Date.now() < token.expiresAt)
  ) {
    return state;
  }

  const discoveryDocument = await fetchDiscoveryDocument(uma);
  const as: oauth.AuthorizationServer = {
    issuer: new URL(discoveryDocument.authorization_endpoint).origin,
    authorization_endpoint: discoveryDocument.authorization_endpoint,
    token_endpoint: discoveryDocument.token_endpoint,
    code_challenge_methods_supported:
      discoveryDocument.code_challenge_methods_supported,
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

    // TODO: get code from client app in cases where they change URL params
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

  if (typeof token.budget !== "string") {
    throw new Error("Invalid budget");
  }

  const expiresAt = Date.now() + token.expires_in * 1000;
  const umaToken: UmaAuthToken = {
    access_token: token.access_token,
    refresh_token: token.refresh_token,
    expires_at: expiresAt,
    nwc_connection_uri: token.nwc_connection_uri,
    commands: commandStrings,
    budget: token.budget,
  };

  if (token.nwc_expires_at && typeof token.nwc_expires_at === "number") {
    umaToken.nwc_expires_at = token.nwc_expires_at;
  }

  return umaToken;
};
