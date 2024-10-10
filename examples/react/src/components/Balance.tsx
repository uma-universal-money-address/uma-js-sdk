import styled from "@emotion/styled";
import { GetBalanceResponse, useNwcRequester } from "@uma-sdk/uma-auth-client";
import { useEffect, useState } from "react";

const Balance = () => {
  const [balance, setBalance] = useState<GetBalanceResponse>();
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const { nwcRequester } = useNwcRequester();
  const fetchBalance = async () => {
    setIsFetching(true);
    setError(null);
    try {
      const response = await nwcRequester.getBalance();
      setBalance(response);
    } catch (e) {
      setError(`Error fetching balance: ${e}`);
    }
    setIsFetching(false);
  };
  useEffect(() => {
    if (nwcRequester) {
      fetchBalance();
    }
  }, [nwcRequester]);

  let balanceString = "";
  if (error) {
    balanceString = error;
  }
  if (!balance || isFetching) {
    balanceString = "Loading...";
  } else if (!balance.currency) {
    balanceString = `${Math.round(balance.balance / 1000)} SAT`;
  } else {
    const amountInNormalDenom = (
      balance.balance / Math.pow(10, balance.currency.decimals)
    ).toFixed(balance.currency.decimals);
    if (balance.currency.symbol === "") {
      balanceString = `${amountInNormalDenom} ${balance.currency.code}`;
    } else {
      balanceString = `${balance.currency.symbol}${amountInNormalDenom}`;
    }
  }

  return (
    <div>
      <BalanceText>{`Balance: ${balanceString}`}</BalanceText>
    </div>
  );
};

const BalanceText = styled.div`
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 16px;
`;

export default Balance;
