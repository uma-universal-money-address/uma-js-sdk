import { useEffect, useState } from "react";
import { type GetInfoResponse } from "src/Nip47Types";
import { type NwcRequester } from "src/NwcRequester";
import { useNwcRequester } from "../useNwcRequester";
import { useOAuth } from "../useOAuth";

export const useGetInfo = () => {
  const [getInfoResponse, setGetInfoResponse] = useState<GetInfoResponse>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | undefined>();
  const { nwcRequester } = useNwcRequester();
  const { token } = useOAuth();

  useEffect(() => {
    const fetchGetInfo = async (nwcRequester: NwcRequester) => {
      setIsLoading(true);
      try {
        const response = await nwcRequester.getInfo();
        setGetInfoResponse(response);
      } catch (error) {
        console.error("Error fetching getInfo:", error);
        setError((error as Error).message);
      }
      setIsLoading(false);
    };

    if (nwcRequester) {
      fetchGetInfo(nwcRequester);
    }
  }, [nwcRequester, token]);

  return { getInfoResponse, isLoading, error };
};
