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

### Connecting

The UMA Auth Client SDK helps you connect users' UMA wallets to your web app. Here's how you can get started.

First add the connect button to your app.

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
the user will be redirected to their VASP to sign in, so make sure that you persist important state if needed for
when you're redirected back to the `redirect-uri`.

Upon successful connection, connect button element will automatically exchange the authorization code for an access token.
If you don't have a connect button element on your redirect page, you can manually complete the exchange using the `useOAuth` hook:

```tsx
const oauth = useOAuth();

useEffect(() => {
  // TODO: Show token refreshes here too.
  if (oauth.isPendingAuth) {
    oauth.oAuthTokenExchange().then((res) => {
      if (res.token) {
        oauth.finishAuth();
      }
    });
  }
}, [oauth.isPendingAuth]);

const hasValidToken = oauth.hasValidToken();
const nwcConnectionUri = oauth.nwcConnectionUri;

if (hasValidToken) {
  return <div>Connected!</div>;
}
```

### Sending requests

Once you have a valid access token, you can use the `useNwcRequester` hook to send requests to the user's wallet.

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

If you need to send requests from your backend, you should send all the full token response info to your backend and utilize
any NWC library with the `nwcConnectUri`, refreshing the URI with the `refreshToken` as needed.
