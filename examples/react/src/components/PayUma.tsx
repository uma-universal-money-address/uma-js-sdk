import styled from "@emotion/styled";
import {
  Currency,
  PayToAddressResponse,
  useNwcRequester,
} from "@uma-sdk/uma-auth-client";
import { useEffect, useState } from "react";

const PayUma = () => {
  const [uma, setUma] = useState<string>("");
  const [amount, setAmount] = useState<number>(0);
  const [paymentResult, setPaymentResult] = useState<
    PayToAddressResponse | undefined
  >(undefined);
  const [currencies, setCurrencies] = useState<Currency[] | undefined>(
    undefined,
  );
  const [selectedCurrency, setSelectedCurrency] = useState<string | undefined>(
    undefined,
  );
  const { nwcRequester } = useNwcRequester();

  useEffect(() => {
    async function fetchCurrencies() {
      const response = await nwcRequester.getInfo();
      setCurrencies(response.currencies);
      setSelectedCurrency(response.currencies[0].code);
    }
    if (nwcRequester) {
      fetchCurrencies();
    }
  }, [nwcRequester]);

  const payUma = async () => {
    if (!nwcRequester) {
      console.warn("No NwcRequester available.");
      return;
    }
    const response = await nwcRequester.payToAddress({
      receiver: {
        lud16: uma,
      },
      sending_currency_code: selectedCurrency!,
      sending_currency_amount: amount,
    });
    setPaymentResult(response);
  };

  return (
    <CenteredDiv>
      <Row>
        <label>UMA:</label>
        <input
          type="text"
          value={uma}
          onChange={(e) => setUma(e.target.value)}
        />
      </Row>
      <Row>
        <label>Amount:</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
        />
      </Row>
      <Row>
        <label>Currency:</label>
        {currencies && (
          <select
            value={selectedCurrency}
            onChange={(e) => setSelectedCurrency(e.target.value)}
          >
            {currencies.map((currency) => (
              <option key={currency.code} value={currency.code}>
                {currency.code}
              </option>
            ))}
          </select>
        )}
      </Row>
      <button disabled={!selectedCurrency} onClick={payUma}>
        Pay UMA
      </button>
      {paymentResult && (
        <ResultText>
          Payment preimage: <pre>{paymentResult.preimage}</pre>
          Payment quote:{" "}
          <pre>{JSON.stringify(paymentResult.quote, null, 2)}</pre>
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

export default PayUma;
