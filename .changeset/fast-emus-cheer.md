---
"@uma-sdk/core": minor
---

Tweak conversion mechanics to be more explicit and safe:
  - Make the decimals field on Currency required and change its description to include more details about its use.
  - See https://github.com/uma-universal-money-address/protocol/blob/main/umad-04-lnurlp-response.md for details on why this is needed.

NOTE: For JS, this isn't a breaking change, but it is for other languages that need to switch from int to float for the multiplier field. Given that we're not yet at UMA 1.0, I'm bumping the protocol version here to 0.2 to indicate the bump and to be able to tell what version the counterparty is using for debugging.
