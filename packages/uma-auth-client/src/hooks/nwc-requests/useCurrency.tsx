import { useEffect, useState } from "react";
import { type NwcRequester } from "src/NwcRequester";
import { type Currency } from "src/types/connection";
import { useNwcRequester } from "../useNwcRequester";
import { type TokenState, useOAuth } from "../useOAuth";

const SAT_CURRENCY: Currency = {
  code: "SAT",
  name: "Satoshi",
  symbol: "",
  decimals: 0,
};

const getConnectionCurrency = (
  token: TokenState | undefined,
  currencies: Currency[],
) => {
  const [leftOfPeriod, rightOfPeriod] = token?.budget?.split(".") || [];
  if (!leftOfPeriod || !rightOfPeriod) {
    return SAT_CURRENCY;
  }

  const currencyCode = rightOfPeriod.split("/")[0];
  const currency = currencies.find(
    (currency) => currency.code.toLowerCase() === currencyCode.toLowerCase(),
  );
  if (!currency) {
    throw new Error(
      "Connection currency not found in currencies provided by NWC",
    );
  }
  return currency;
};

export const useCurrency = () => {
  const [currency, setCurrency] = useState<Currency>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { nwcRequester } = useNwcRequester();
  const { token } = useOAuth();

  useEffect(() => {
    const fetchCurrency = async (nwcRequester: NwcRequester) => {
      setIsLoading(true);
      try {
        const response = await nwcRequester.getInfo();
        const currencies = response.currencies;

        if (!currencies) {
          throw new Error("Currencies not found in get_info response");
        }

        const connectionCurrency = getConnectionCurrency(
          token,
          currencies.map((currency) => ({
            code: currency.code,
            name: currency.name,
            symbol: currency.symbol,
            decimals: currency.decimals,
          })),
        );
        setCurrency(connectionCurrency);
      } catch (error) {
        console.error("Error fetching currency:", error);
      }
      setIsLoading(false);
    };

    if (nwcRequester) {
      fetchCurrency(nwcRequester);
    }
  }, [nwcRequester, token]);

  return { currency, isLoading };
};
