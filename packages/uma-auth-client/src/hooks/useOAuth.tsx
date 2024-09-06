import { auth } from "@getalby/sdk";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { fetchDiscoveryDocument } from "./useDiscoveryDocument";

type UmaAuthToken = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  nwc_connection_uri: string;
  commands: string[];
  budget: string;
  nwc_expires_at: number;
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
  codeVerifier?: string;
  token?: TokenState | undefined;
  authConfig?: AuthConfig;
  nwcConnectionUri?: string;
  nwcExpiresAt?: number;
  setAuthConfig: (config: AuthConfig) => void;
  setToken: (token?: TokenState) => void;
  /** The initial OAuth request that starts the OAuth handshake. */
  initialOAuthRequest: (uma: string) => Promise<void>;
  /** OAuth token exchange occurs after the initialOAuthRequest has been made. */
  oAuthTokenExchange: (uma: string) => Promise<void>;
}

export const useOAuth = create<OAuthState>()(
  persist(
    (set, get) => ({
      setAuthConfig: (authConfig) => set({ authConfig }),
      setToken: (token) =>
        set({
          token,
        }),
      initialOAuthRequest: async (uma) => {
        const state = get();
        const { codeVerifier, authUrl } = await getAuthorizationUrl(state, uma);
        set({ codeVerifier });
        window.location.href = authUrl;
      },
      oAuthTokenExchange: async (uma) => {
        const state = get();
        const result = await oAuthTokenExchange(state, uma);
        set(result);
      },
    }),
    {
      name: "uma-connect",
      partialize: (state) => ({
        nwcConnectionUri: state.nwcConnectionUri,
        codeVerifier: state.codeVerifier,
      }),
    },
  ),
);

const getAuthorizationUrl = async (state: OAuthState, uma: string) => {
  const { codeVerifier, authConfig } = state;
  if (!authConfig) {
    throw new Error("Auth config not set.");
  }

  const discoveryDocument = await fetchDiscoveryDocument(uma);

  const authClient = new auth.OAuth2User({
    client_id: `${authConfig.identityNpub} ${authConfig.identityRelayUrl}`,
    callback: authConfig.redirectUri,
    scopes: [],
    user_agent: "uma-connect",
  });

  const requiredCommands = authConfig.requiredCommands?.join(",") || "";
  const optionalCommands = authConfig.optionalCommands?.join(",") || "";
  let budget = "";
  if (authConfig.budget) {
    budget = `${authConfig.budget.amountInLowestDenom}.${authConfig.budget.currency}%2F${authConfig.budget.period}`;
  }

  const authUrl = await authClient.generateAuthURL({
    authorizeUrl: `${discoveryDocument.authorization_endpoint}?required_commands=${requiredCommands}&optional_commands=${optionalCommands}&budget=${budget}`,
    code_challenge_method: "S256",
  });

  return {
    codeVerifier: authClient.code_verifier || "",
    authUrl,
  };
};

const oAuthTokenExchange = async (state: OAuthState, uma: string) => {
  const { codeVerifier, token, nwcConnectionUri, nwcExpiresAt, authConfig } =
    state;
  if (!authConfig) {
    throw new Error("Auth config not set.");
  }

  const discoveryDocument = await fetchDiscoveryDocument(uma);

  // If we have a connection URI and a token that hasn't expired, we don't need to do anything
  if (
    nwcConnectionUri &&
    token &&
    (!token.expiresAt || Date.now() < token.expiresAt)
  ) {
    return state;
  }

  const authClient = new auth.OAuth2User({
    client_id: `${authConfig.identityNpub} ${authConfig.identityRelayUrl}`,
    callback: authConfig.redirectUri,
    scopes: [],
    user_agent: "uma-connect",
    request_options: {
      base_url: new URL(discoveryDocument.token_endpoint).origin,
    },
  });

  let resultToken: UmaAuthToken;
  if (token?.refreshToken && nwcExpiresAt && Date.now() < nwcExpiresAt) {
    authClient.token = {
      access_token: token.accessToken,
      refresh_token: token.refreshToken,
      expires_at: token.expiresAt,
    };

    resultToken = (await authClient.refreshAccessToken()).token as UmaAuthToken;
  } else {
    if (!codeVerifier) {
      throw new Error(
        "Code verifier not found. Make initial OAuth request first.",
      );
    }
    authClient.code_verifier = codeVerifier;

    // TODO: get code from client app in cases where they change URL params
    const code = new URLSearchParams(window.location.search).get("code");
    if (!code) {
      throw new Error("Code not found in URL params");
    }

    resultToken = (await authClient.requestAccessToken(code))
      .token as UmaAuthToken;
  }
  validateUmaAuthToken(resultToken);

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

const validateUmaAuthToken = (token: UmaAuthToken) => {
  if (
    !token.access_token ||
    !token.refresh_token ||
    !token.expires_at ||
    !token.nwc_connection_uri ||
    !token.commands
  ) {
    throw new Error("Invalid UMA token");
  }
};
