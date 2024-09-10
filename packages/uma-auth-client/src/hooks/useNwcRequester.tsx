import { useEffect, useState } from "react";
import { NwcRequester } from "src/NwcRequester";
import { useOAuth } from "./useOAuth";

export const useNwcRequester = () => {
  const [nwcRequester, setNwcRequester] = useState<NwcRequester>();
  const { isConnectionValid, nwcConnectionUri, oAuthTokenExchange } =
    useOAuth();

  useEffect(() => {
    if (isConnectionValid() && nwcConnectionUri) {
      setNwcRequester(new NwcRequester(nwcConnectionUri, oAuthTokenExchange));
    }
  }, [isConnectionValid, nwcConnectionUri, oAuthTokenExchange]);

  return { nwcRequester };
};
