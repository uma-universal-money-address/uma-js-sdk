# @uma-sdk/core

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
