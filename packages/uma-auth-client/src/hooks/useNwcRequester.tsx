import { useEffect, useState } from "react";
import { NwcRequester } from "../NwcRequester";
import { useOAuth } from "./useOAuth";

export const useNwcRequester = () => {
  const [nwcRequester, setNwcRequester] = useState<NwcRequester>();
  // TODO(Brian): Handle expired token refreshes.
  const { nwcConnectionUri } = useOAuth();

  useEffect(() => {
    if (nwcConnectionUri) {
      setNwcRequester(new NwcRequester(nwcConnectionUri));
    }
  }, [nwcConnectionUri]);

  return { nwcRequester };
};
