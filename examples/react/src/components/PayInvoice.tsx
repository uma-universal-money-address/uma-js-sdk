import styled from "@emotion/styled";
import { useNwcRequester } from "@uma-sdk/uma-auth-client";
import { useState } from "react";

const PayInvoice = () => {
  const [invoice, setInvoice] = useState<string>("");
  const [amount, setAmount] = useState<number>(0);
  const [preimage, setPreimage] = useState<string | undefined>(undefined);
  const [isFullAmount, setIsFullAmount] = useState<boolean>(true);
  const { nwcRequester } = useNwcRequester();

  const payInvoice = async () => {
    if (!nwcRequester) {
      console.warn("No NwcRequester available.");
      return;
    }
    const response = await nwcRequester.payInvoice({
      invoice,
      ...(isFullAmount ? {} : { amount }),
    });
    setPreimage(response.preimage);
  };

  return (
    <CenteredDiv>
      <Row>
        <label>Invoice:</label>
        <input
          type="text"
          value={invoice}
          onChange={(e) => setInvoice(e.target.value)}
        />
      </Row>
      <Row>
        <label>Amount:</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={isFullAmount}
        />
      </Row>
      <Row>
        <label>Full Amount:</label>
        <input
          type="checkbox"
          checked={isFullAmount}
          onChange={() => setIsFullAmount(!isFullAmount)}
        />
      </Row>
      <button onClick={payInvoice}>Pay Invoice</button>
      {preimage && (
        <ResultText>
          Preimage: <pre>{preimage}</pre>
        </ResultText>
      )}
    </CenteredDiv>
  );
};

const CenteredDiv = styled.div`
  display: flex;
  justify-content: center;
  align-items: start;
  flex-direction: column;
  gap: 4px;
`;

const ResultText = styled.div`
  max-width: 400px;
  word-wrap: break-word;
`;

const Row = styled.div`
  display: flex;
  flex-direction: row;
  gap: 8px;
`;

export default PayInvoice;
