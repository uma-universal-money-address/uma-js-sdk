import { Currency } from "src/types/connection";

export const convertToNormalDenomination = (
  amount: number,
  currency: Currency,
) => {
  return (amount / Math.pow(10, currency.decimals)).toFixed(currency.decimals);
};

export const formatAmountString = ({
  currency,
  amountInLowestDenom,
}: {
  currency: Currency;
  amountInLowestDenom: number;
}) => {
  if (currency.symbol === "") {
    return `${convertToNormalDenomination(amountInLowestDenom, currency)} ${currency.code}`;
  }
  return `${currency.symbol}${convertToNormalDenomination(amountInLowestDenom, currency)}`;
};
