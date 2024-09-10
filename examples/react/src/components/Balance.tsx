import styled from "@emotion/styled";
import { useNwcRequester } from "@uma-sdk/uma-auth-client";
import { useEffect, useState } from "react";

const Balance = () => {
  const [balance, setBalance] = useState(0);
  const [isFetching, setIsFetching] = useState(true);
  const { nwcRequester } = useNwcRequester();
  const fetchBalance = async () => {
    // TODO: Should also check for an invalid token.
    if (!nwcRequester) {
      return;
    }
    setIsFetching(true);
    const response = await nwcRequester.getBalance();
    setBalance(response.balance);
    setIsFetching(false);
  };
  useEffect(() => {
    fetchBalance();
  }, [nwcRequester]);

  return (
    <div>
      <BalanceText>{isFetching ? "Fetching balance..." : `Balance: ${balance} sats`}</BalanceText>
    </div>
  );
};

const BalanceText = styled.div`
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 16px;
`;

export default Balance;
