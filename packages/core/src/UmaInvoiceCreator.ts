export default interface UmaInvoiceCreator {
  /**
   * Creates an invoice with the given amount and encoded LNURL metadata.
   *
   * @param amountMsats The amount of the invoice in millisatoshis.
   * @param metadata The metadata that will be added to the invoice's metadata hash field.
   * @return The encoded BOLT-11 invoice that should be returned to the sender for the given `PayRequest`.
   */
  createUmaInvoice: (
    amountMsats: number,
    metadata: string,
    receiverIdentifier: string | undefined,
  ) => Promise<string | undefined>;
}
