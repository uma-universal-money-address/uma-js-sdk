# uma-auth-client

The UMA Auth Client SDK for web apps!

## Installation

```bash
npm install @uma-sdk/uma-auth-client
```

or

```bash
yarn add @uma-sdk/uma-auth-client
```

## Quick Start

See the full UMA Auth documentation [here](https://docs.uma.me/uma-auth/uma-auth-client/client-quick-start).

### Connecting

The UMA Auth Client SDK helps you connect users' UMA wallets to your web app. Here's how you can get started.

First, [generate a keypair and publish info about your app](https://github.com/uma-universal-money-address/uma-auth-cli?tab=readme-ov-file#uma-auth-cli).

Next, add the connect button to your app and provide the pubkey you generated.

In React, you can use the UmaConnectButton element:

```tsx
import { UmaConnectButton } from '@uma-sdk/uma-auth-client';

const App = () => {
  return (
    <UmaConnectButton
      app-identity-pubkey="npub1scmpzl2ehnrtnhu289d9rfrwprau9z6ka0pmuhz6czj2ae5rpuhs2l4j9d"
      nostr-relay="wss://nos.lol"
      redirect-uri="http://localhost:3001"
      required-commands={["pay_invoice", "get_balance"]}
      optional-commands={["list_transactions"]}
      budget-amount="500"
      budget-currency="USD"
      budget-period="monthly"
      style={{
        "--uma-connect-background": "#7366C5",
        "--uma-connect-radius": "8px",
        "--uma-connect-padding-x": "32px",
        "--uma-connect-padding-y": "16px",
        "--uma-connect-text-color": "#F9F9F9",
        "--uma-connect-font-family": "Arial",
        "--uma-connect-font-size": "16px",
        "--uma-connect-font-weight": "600",
      }}
    />
  );
};
```

Alternatively, in raw HTML or a non-react context, you can use the web component implementation:

```html
<!-- TODO: Host the cjs package in a public CDN. -->
<script src="../../packages/uma-auth-client/dist/uma-auth-client-web-components.umd.cjs"></script>
<uma-connect-button
  app-identity-pubkey="npub1scmpzl2ehnrtnhu289d9rfrwprau9z6ka0pmuhz6czj2ae5rpuhs2l4j9d"
  nostr-relay="wss://nos.lol"
  redirect-uri="http://localhost:3001"
  required-commands="pay_invoice,get_balance"
  optional-commands="list_transactions"
  budget-amount="500"
  budget-currency="USD"
  budget-period="monthly"
/>
```

Users can click their button to move through the flow to connect their wallet. Note that like a normal OAuth flow,
the user will be redirected to their wallet app to sign in, so make sure that you persist important state if needed for
when you're redirected back to the `redirect-uri`.

Upon successful connection, connect button element will automatically exchange the authorization code for an access token.

If you don't have a connect button element on your redirect page, you can manually complete the exchange using the react hook `useOAuth`:

```tsx
const oAuth = useOAuth();

useEffect(() => {
  if (oAuth.codeVerifier) {
    oAuth.oAuthTokenExchange().then((res) => {
      console.log(res);
    });
  }
}, [oAuth.codeVerifier]);

const isConnectionValid = oAuth.isConnectionValid();
const nwcConnectionUri = oAuth.nwcConnectionUri;

if (isConnectionValid) {
  return <div>Connected!</div>;
}
```

In non-react contexts, you can still use `useOAuth` to complete the token exchange:

```ts
const oAuth = useOAuth.getState();
if (oAuth.codeVerifier) {
  oAuth.oAuthTokenExchange().then((res) => {
    const isConnectionValid = oAuth.isConnectionValid();
    const nwcConnectionUri = oAuth.nwcConnectionUri;

    if (isConnectionValid) {
      return console.log("Connected!", res);
    }
  });
}
```

### Sending requests

Once you have a valid access token, you can use the react hook `useNwcRequester` to send requests to the user's wallet.

```tsx
const { nwcRequester } = useNwcRequester();
const [balance, setBalance] = useState<
  Nip47.GetBalanceResponse | undefined
>();

useEffect(() => {
  async function fetchBalance(nwcRequester: NwcRequester) {
    const res = await nwcRequester.getBalance();
    setBalance(res);
  }
  if (nwcRequester) {
    fetchBalance(nwcRequester);
  }
}, [nwcRequester]);
```

In non-react contexts, you can use the `NwcRequester` class directly.

```ts
let requester: NwcRequester | null = null;
useOAuth.subscribe((oAuth) => {
  if (oAuth.isConnectionValid() && oAuth.nwcConnectionUri && !requester) {
    requester = new NwcRequester(oAuth.nwcConnectionUri, oAuth.clearUserAuth, oAuth.oAuthTokenExchange);
    requester.getBalance().then((res) => {
      console.log("Balance:", res);
    });
  }
});
```

If provided a token exchange handler, the NwcRequester will also handle refreshing tokens in case the access token expires (e.g. `oAuthTokenExchange`).

If you need to send requests from your backend, you should send all the full token response info to your backend and utilize
any NWC library with the `nwcConnectUri`, refreshing the URI with the `refreshToken` as needed.
