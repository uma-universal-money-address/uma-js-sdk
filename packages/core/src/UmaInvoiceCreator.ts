import { type SettlementInfo } from "./protocol/Settlement.js";

export default interface UmaInvoiceCreator {
  /**
   * Creates an invoice with the given amount and encoded LNURL metadata.
   *
   * @param amountMsats The amount of the invoice in millisatoshis.
   * @param metadata The metadata that will be added to the invoice's metadata hash field.
   * @param receiverIdentifier The receiver's UMA address.
   * @return The encoded BOLT-11 invoice that should be returned to the sender for the given `PayRequest`.
   */
  createUmaInvoice: (
    amountMsats: number,
    metadata: string,
    receiverIdentifier: string | undefined,
  ) => Promise<string | undefined>;

  /**
   * Creates a payment request with settlement-agnostic parameters.
   *
   * @param amountUnits Amount in the smallest unit of the settlement asset.
   * @param metadata Metadata to include.
   * @param receiverIdentifier Receiver's UMA address.
   * @param settlementInfo Settlement info including the layer and asset chosen by the sender.
   * @return Payment request string.
   */
  createInvoiceForSettlementLayer?: (
    amountUnits: number,
    metadata: string,
    receiverIdentifier: string | undefined,
    settlementInfo: SettlementInfo | undefined,
  ) => Promise<string | undefined>;
}

export async function createInvoiceWithSettlement(
  creator: UmaInvoiceCreator,
  amountUnits: number,
  metadata: string,
  receiverIdentifier: string | undefined,
  settlementInfo: SettlementInfo | undefined,
): Promise<string | undefined> {
  if (creator.createInvoiceForSettlementLayer) {
    return creator.createInvoiceForSettlementLayer(
      amountUnits,
      metadata,
      receiverIdentifier,
      settlementInfo,
    );
  }
  // delegate to createUmaInvoice if createInvoiceForSettlementLayer is not implemented
  return creator.createUmaInvoice(amountUnits, metadata, receiverIdentifier);
}
