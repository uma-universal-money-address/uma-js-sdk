import { useEffect } from "react";
import { NwcRequester } from "src/NwcRequester";
import { create } from "zustand";
import { useOAuth } from "./useOAuth";

interface NwcRequesterStore {
  nwcRequester?: NwcRequester | undefined;
  setNwcRequester: (
    nwcConnectionUri: string,
    tokenRefresh: () => Promise<{ nwcConnectionUri: string }>,
  ) => void;
  resetNwcRequester: () => void;
}

const useNwcRequesterStore = create<NwcRequesterStore>((set) => ({
  nwcRequester: undefined,
  setNwcRequester: (nwcConnectionUri, tokenRefresh) =>
    set((state) => {
      if (state.nwcRequester) {
        return state;
      }
      return {
        nwcRequester: new NwcRequester(nwcConnectionUri, tokenRefresh),
      };
    }),
  resetNwcRequester: () => set({ nwcRequester: undefined }),
}));

export const useNwcRequester = () => {
  const { nwcRequester, setNwcRequester, resetNwcRequester } =
    useNwcRequesterStore();
  const { isConnectionValid, nwcConnectionUri, oAuthTokenExchange } =
    useOAuth();

  useEffect(() => {
    if (isConnectionValid() && nwcConnectionUri) {
      setNwcRequester(nwcConnectionUri, oAuthTokenExchange);
    }
  }, [isConnectionValid, nwcConnectionUri, oAuthTokenExchange]);

  return { nwcRequester, resetNwcRequester };
};
