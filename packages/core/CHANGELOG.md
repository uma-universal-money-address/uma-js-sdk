# @uma-sdk/core

## 1.2.0

### Minor Changes

- 9458b5c: add UMA invoice creation and bech32 encoding

## 1.1.0

### Minor Changes

- f04f362: Add receiverIdentifier param to createUmaInvoice interface

## 1.0.2

### Patch Changes

- b3a44ed: - Fix the amountMsats field in post-tx callback.

## 1.0.1

### Patch Changes

- aa205bf: - Automatically add compliance and identifier to payerdata for uma.
  - Fix payer identifier property enforcement for non-uma lnurl

## 1.0.0

### Major Changes

- b723ef3: - Update the SDK to the v1.0 version of the UMA Protocol 🎉. See the V1 migration guide https://docs.uma.me/uma-standard/uma-v1-migration for the full update list.

## 0.8.2

### Patch Changes

- e5f8f9d: - Fix version future-proofing with isUmaLnurlpQuery.

## 0.8.1

### Patch Changes

- 64a1f9a: Export nonce validator classes.

## 0.8.0

### Minor Changes

- ca9e6eb: - Add nonce checks to prevent replay attacks.

### Patch Changes

- ca9e6eb: - Fix timestamp for payreq signature to ensure we are using seconds instead of ms

## 0.7.3

### Patch Changes

- a24cdd2: \* Use http for more localhost formats

## 0.7.2

### Patch Changes

- 1a61c73: Use crypto.webcrypto for nonces to support node 16

## 0.7.1

### Patch Changes

- fc4d5db: Actually commit the protocol version bump. This got unintentionally dropped from the previous commit.

## 0.7.0

### Minor Changes

- 80f559b: - Add the decimals field to payreq paymentinfo for convenience
  - Bump the protocol version to 0.3

## 0.6.1

### Patch Changes

- a7dcb96: Fix the min/maxSendable fields. They should be in msats.

## 0.6.0

### Minor Changes

- 0d2a8ba: Tweak conversion mechanics to be more explicit and safe:

  - Make the decimals field on Currency required and change its description to include more details about its use.
  - See https://github.com/uma-universal-money-address/protocol/blob/main/umad-04-lnurlp-response.md for details on why this is needed.

  NOTE: For JS, this is not a breaking change, but it is for other languages that need to switch from int to float for the multiplier field. Given that we are not yet at UMA 1.0, we are bumping the protocol version here to 0.2 to indicate the bump and to be able to tell what version the counterparty is using for debugging.

## 0.5.1

### Patch Changes

- 636e2ca: Ignore nulls in currency decimals field

## 0.5.0

### Minor Changes

- 9f9fc22: Rename displayDecimals -> decimals to better match a LUD-21 proposal

## 0.4.0

### Minor Changes

- 480f4d7: Make utxoCallback optional

### Patch Changes

- 480f4d7: Normalize high signatures before verifying.

## 0.3.0

### Minor Changes

- 21d6f3a: - Add displayDecimals to the currency object. This helps the sender display the receiving currency amount correctly in their UI.

## 0.2.0

### Minor Changes

- ec6269a: Fix the name of the pr field in the payreq response.

## 0.1.5

### Patch Changes

- 12f6467: - Fix null parsing for optional fields

## 0.1.4

### Patch Changes

- 7a14f8b: - Add cause to a few errors.
  - Fix the parsing of payReq due to a bad field name.

## 0.1.3

### Patch Changes

- 4c08ea8: - Switch to DER for signature encoding
- 4c08ea8: - Minor versioning negotiation fix
  - Adding the travelRuleFormat field to payreq

## 0.1.2

### Patch Changes

- 1f67f71: - Minor versioning negotiation fix
  - Adding the travelRuleFormat field to payreq

## 0.1.1

### Patch Changes

- ecf3515: Fix lnurlp response schema

## 0.1.0

### Minor Changes

- b2753df: - Simplify the invoice creator interface
  - Make the pubkeycache an interface
  - Fix an issue with version negotiation
  - Clean up some documentation

### Patch Changes

- 61ba670: Remove unused deps

## 0.0.6

### Patch Changes

- a4079db: Update README
