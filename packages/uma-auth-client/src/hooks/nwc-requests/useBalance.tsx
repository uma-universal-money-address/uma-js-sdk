import { useEffect, useState } from "react";
import type * as Nip47 from "src/Nip47Types";
import { type NwcRequester } from "src/NwcRequester";
import { useNwcRequester } from "../useNwcRequester";
import { useCurrency } from "./useCurrency";

export const useBalance = () => {
  const [balance, setBalance] = useState<
    Nip47.GetBalanceResponse | undefined
  >();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { nwcRequester } = useNwcRequester();
  const { currency, isLoading: isLoadingCurrency } = useCurrency();

  useEffect(() => {
    const fetchBalance = async (nwcRequester: NwcRequester) => {
      setIsLoading(true);
      try {
        const response = await nwcRequester.getBalance({
          currency_code: currency?.code || "SAT",
        });

        setBalance(response);
      } catch (error) {
        console.error("Error fetching balance:", error);
      }
      setIsLoading(false);
    };

    if (nwcRequester && !isLoadingCurrency) {
      fetchBalance(nwcRequester);
    }
  }, [nwcRequester, isLoadingCurrency, currency]);

  return { balance, isLoading };
};
