import { useEffect, useState } from "react";
import { NwcRequester } from "src/NwcRequester";
import { useOAuth } from "./useOAuth";

export const useNwcRequester = () => {
  const [nwcRequester, setNwcRequester] = useState<NwcRequester>();
  const { nwcConnectionUri } = useOAuth();

  useEffect(() => {
    if (nwcConnectionUri) {
      setNwcRequester(new NwcRequester(nwcConnectionUri));
    }
  }, [nwcConnectionUri]);

  return { nwcRequester };
};
