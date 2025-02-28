/**
 * Generated error codes - DO NOT MODIFY MANUALLY
 */

export interface ErrorDetails {
  code: string;
  httpStatusCode: number;
}

export const ErrorCode = {
  /** Error fetching counterparty public key for validating signatures or encrypting messages */
  COUNTERPARTY_PUBKEY_FETCH_ERROR: {
    code: "COUNTERPARTY_PUBKEY_FETCH_ERROR",
    httpStatusCode: 424,
  },

  /** Error parsing the counterparty public key response */
  INVALID_PUBKEY_FORMAT: {
    code: "INVALID_PUBKEY_FORMAT",
    httpStatusCode: 400,
  },

  /** The provided certificate chain is invalid */
  CERT_CHAIN_INVALID: {
    code: "CERT_CHAIN_INVALID",
    httpStatusCode: 400,
  },

  /** The provided certificate chain has expired */
  CERT_CHAIN_EXPIRED: {
    code: "CERT_CHAIN_EXPIRED",
    httpStatusCode: 400,
  },

  /** The provided signature is not valid */
  INVALID_SIGNATURE: {
    code: "INVALID_SIGNATURE",
    httpStatusCode: 401,
  },

  /** The provided timestamp is not valid */
  INVALID_TIMESTAMP: {
    code: "INVALID_TIMESTAMP",
    httpStatusCode: 400,
  },

  /** The provided nonce is not valid */
  INVALID_NONCE: {
    code: "INVALID_NONCE",
    httpStatusCode: 400,
  },

  /** An unexpected error occurred on the server */
  INTERNAL_ERROR: {
    code: "INTERNAL_ERROR",
    httpStatusCode: 500,
  },

  /** This party does not support non-UMA LNURLs */
  NON_UMA_LNURL_NOT_SUPPORTED: {
    code: "NON_UMA_LNURL_NOT_SUPPORTED",
    httpStatusCode: 403,
  },

  /** Missing required UMA parameters */
  MISSING_REQUIRED_UMA_PARAMETERS: {
    code: "MISSING_REQUIRED_UMA_PARAMETERS",
    httpStatusCode: 400,
  },

  /** The counterparty UMA version is not supported */
  UNSUPPORTED_UMA_VERSION: {
    code: "UNSUPPORTED_UMA_VERSION",
    httpStatusCode: 412,
  },

  /** Error parsing the LNURLP request */
  PARSE_LNURLP_REQUEST_ERROR: {
    code: "PARSE_LNURLP_REQUEST_ERROR",
    httpStatusCode: 400,
  },

  /** This user has exceeded the velocity limit and is unable to receive payments at this time */
  VELOCITY_LIMIT_EXCEEDED: {
    code: "VELOCITY_LIMIT_EXCEEDED",
    httpStatusCode: 403,
  },

  /** The user for this UMA was not found */
  USER_NOT_FOUND: {
    code: "USER_NOT_FOUND",
    httpStatusCode: 404,
  },

  /** The user for this UMA is not ready to receive payments at this time */
  USER_NOT_READY: {
    code: "USER_NOT_READY",
    httpStatusCode: 403,
  },

  /** The request corresponding to this callback URL was not found */
  REQUEST_NOT_FOUND: {
    code: "REQUEST_NOT_FOUND",
    httpStatusCode: 404,
  },

  /** Error parsing the payreq request */
  PARSE_PAYREQ_REQUEST_ERROR: {
    code: "PARSE_PAYREQ_REQUEST_ERROR",
    httpStatusCode: 400,
  },

  /** The amount provided is not within the min/max range */
  AMOUNT_OUT_OF_RANGE: {
    code: "AMOUNT_OUT_OF_RANGE",
    httpStatusCode: 400,
  },

  /** The currency provided is not valid or supported */
  INVALID_CURRENCY: {
    code: "INVALID_CURRENCY",
    httpStatusCode: 400,
  },

  /** Payments from this sender are not accepted */
  SENDER_NOT_ACCEPTED: {
    code: "SENDER_NOT_ACCEPTED",
    httpStatusCode: 400,
  },

  /** Payer data is missing fields that are required by the receiver */
  MISSING_MANDATORY_PAYER_DATA: {
    code: "MISSING_MANDATORY_PAYER_DATA",
    httpStatusCode: 400,
  },

  /** Receiver does not recognize the mandatory payee data key */
  UNRECOGNIZED_MANDATORY_PAYEE_DATA_KEY: {
    code: "UNRECOGNIZED_MANDATORY_PAYEE_DATA_KEY",
    httpStatusCode: 501,
  },

  /** Error parsing the utxo callback */
  PARSE_UTXO_CALLBACK_ERROR: {
    code: "PARSE_UTXO_CALLBACK_ERROR",
    httpStatusCode: 400,
  },

  /** This party does not accept payments with the counterparty */
  COUNTERPARTY_NOT_ALLOWED: {
    code: "COUNTERPARTY_NOT_ALLOWED",
    httpStatusCode: 403,
  },

  /** Error parsing the LNURLP response */
  PARSE_LNURLP_RESPONSE_ERROR: {
    code: "PARSE_LNURLP_RESPONSE_ERROR",
    httpStatusCode: 400,
  },

  /** Error parsing the payreq response */
  PARSE_PAYREQ_RESPONSE_ERROR: {
    code: "PARSE_PAYREQ_RESPONSE_ERROR",
    httpStatusCode: 400,
  },

  /** The LNURLP request failed */
  LNURLP_REQUEST_FAILED: {
    code: "LNURLP_REQUEST_FAILED",
    httpStatusCode: 424,
  },

  /** The payreq request failed */
  PAYREQ_REQUEST_FAILED: {
    code: "PAYREQ_REQUEST_FAILED",
    httpStatusCode: 424,
  },

  /** No compatible UMA protocol version found between sender and receiver */
  NO_COMPATIBLE_UMA_VERSION: {
    code: "NO_COMPATIBLE_UMA_VERSION",
    httpStatusCode: 424,
  },

  /** The provided invoice is invalid */
  INVALID_INVOICE: {
    code: "INVALID_INVOICE",
    httpStatusCode: 400,
  },

  /** The invoice has expired */
  INVOICE_EXPIRED: {
    code: "INVOICE_EXPIRED",
    httpStatusCode: 400,
  },

  /** The quote has expired */
  QUOTE_EXPIRED: {
    code: "QUOTE_EXPIRED",
    httpStatusCode: 400,
  },

  /** The provided input is invalid */
  INVALID_INPUT: {
    code: "INVALID_INPUT",
    httpStatusCode: 400,
  },

  /** The request format is invalid */
  INVALID_REQUEST_FORMAT: {
    code: "INVALID_REQUEST_FORMAT",
    httpStatusCode: 400,
  },

  /** This action is not permitted for this user */
  FORBIDDEN: {
    code: "FORBIDDEN",
    httpStatusCode: 403,
  },

  /** This functionality is not implemented */
  NOT_IMPLEMENTED: {
    code: "NOT_IMPLEMENTED",
    httpStatusCode: 501,
  },

  /** The requested quote was not found */
  QUOTE_NOT_FOUND: {
    code: "QUOTE_NOT_FOUND",
    httpStatusCode: 404,
  },
} as const;
