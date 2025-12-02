/**
 * Common keys used in counterparty data exchanges between VASPs.
 */
export const CounterPartyDataKeys = {
  /** The UMA address of the counterparty */
  IDENTIFIER: "identifier",

  /** The full name of the counterparty */
  NAME: "name",

  /** The email address of the counterparty */
  EMAIL: "email",

  /** Compliance-related data including KYC status, UTXOs, and travel rule information */
  COMPLIANCE: "compliance",

  /** The counterparty's date of birth, in ISO 8601 format */
  BIRTH_DATE: "birthDate",

  /** The counterparty's nationality, in ISO 3166-1 alpha-2 format */
  NATIONALITY: "nationality",

  /** The counterparty's country of residence, in ISO 3166-1 alpha-2 format */
  COUNTRY_OF_RESIDENCE: "countryOfResidence",

  /** The counterparty's phone number, in E.164 format */
  PHONE_NUMBER: "phoneNumber",
} as const;

export type CounterPartyDataKey =
  (typeof CounterPartyDataKeys)[keyof typeof CounterPartyDataKeys];
