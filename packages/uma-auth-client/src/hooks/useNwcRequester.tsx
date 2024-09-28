import { useEffect } from "react";
import { NwcRequester } from "src/NwcRequester";
import { create } from "zustand";
import { useOAuth } from "./useOAuth";

interface NwcRequesterStore {
  nwcRequester?: NwcRequester | undefined;
  setNwcRequester: (
    nwcConnectionUri: string,
    tokenRefresh: () => Promise<{ nwcConnectionUri: string }>,
    clearUserAuth: () => void,
  ) => void;
  resetNwcRequester: () => void;
}

const useNwcRequesterStore = create<NwcRequesterStore>((set) => ({
  nwcRequester: undefined,
  setNwcRequester: (nwcConnectionUri, tokenRefresh, clearUserAuth) =>
    set((state) => {
      if (state.nwcRequester) {
        return state;
      }
      return {
        nwcRequester: new NwcRequester(
          nwcConnectionUri,
          tokenRefresh,
          clearUserAuth,
        ),
      };
    }),
  resetNwcRequester: () => set({ nwcRequester: undefined }),
}));

export const useNwcRequester = () => {
  const { nwcRequester, setNwcRequester, resetNwcRequester } =
    useNwcRequesterStore();
  const {
    isConnectionValid,
    nwcConnectionUri,
    oAuthTokenExchange,
    clearUserAuth,
  } = useOAuth();

  useEffect(() => {
    if (isConnectionValid() && nwcConnectionUri) {
      setNwcRequester(nwcConnectionUri, oAuthTokenExchange, clearUserAuth);
    }
  }, [
    isConnectionValid,
    nwcConnectionUri,
    oAuthTokenExchange,
    setNwcRequester,
    clearUserAuth,
  ]);

  return { nwcRequester, resetNwcRequester };
};
