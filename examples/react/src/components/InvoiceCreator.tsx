import styled from "@emotion/styled";
import { useNwcRequester } from "@uma-sdk/uma-auth-client";
import { useState } from "react";

const InvoiceCreator = () => {
  const [invoice, setInvoice] = useState<string | undefined>(undefined);
  const { nwcRequester } = useNwcRequester();

  const createInvoice = async () => {
    if (!nwcRequester) {
      console.warn("No NwcRequester available.");
      return;
    }
    const response = await nwcRequester.makeInvoice({
      amount: 1000,
      description: "Test invoice",
    });
    setInvoice(response.invoice);
  };

  return (
    <CenteredDiv>
      <button onClick={createInvoice}>Create Invoice</button>
      {invoice && <InvoiceText>{invoice}</InvoiceText>}
    </CenteredDiv>
  );
};

const CenteredDiv = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
`;

const InvoiceText = styled.div`
  max-width: 400px;
  word-wrap: break-word;
`;

export default InvoiceCreator;
