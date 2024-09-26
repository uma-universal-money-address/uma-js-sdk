import { useEffect, useState } from "react";
import { type GetBudgetResponse } from "src/Nip47Types";
import { type NwcRequester } from "src/NwcRequester";
import { useNwcRequester } from "../useNwcRequester";
import { useOAuth } from "../useOAuth";

export const useGetBudget = () => {
  const [getBudgetResponse, setGetBudgetResponse] =
    useState<GetBudgetResponse>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | undefined>();
  const { nwcRequester } = useNwcRequester();
  const { token } = useOAuth();

  useEffect(() => {
    const fetchGetBudget = async (nwcRequester: NwcRequester) => {
      setIsLoading(true);
      try {
        const response = await nwcRequester.getBudget();
        setGetBudgetResponse(response);
      } catch (error) {
        console.error("Error fetching getBudget:", error);
        setError((error as Error).message);
      }
      setIsLoading(false);
    };

    if (nwcRequester) {
      fetchGetBudget(nwcRequester);
    }
  }, [nwcRequester, token]);

  return { getBudgetResponse, isLoading, error };
};
