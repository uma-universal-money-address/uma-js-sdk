import { useEffect } from "react";
import { NwcRequester } from "src/NwcRequester";
import { create } from "zustand";
import { useOAuth } from "./useOAuth";

interface NwcRequesterStore {
  nwcRequester?: NwcRequester | undefined;
  setNwcRequester: (
    nwcConnectionUri: string,
    clearUserAuth: () => void,
    tokenRefresh?: () => Promise<{ nwcConnectionUri: string }>,
  ) => void;
  resetNwcRequester: () => void;
}

const useNwcRequesterStore = create<NwcRequesterStore>((set) => ({
  nwcRequester: undefined,
  setNwcRequester: (nwcConnectionUri, clearUserAuth, tokenRefresh) =>
    set((state) => {
      if (state.nwcRequester) {
        return state;
      }
      return {
        nwcRequester: new NwcRequester(
          nwcConnectionUri,
          clearUserAuth,
          tokenRefresh,
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
    token,
  } = useOAuth();

  useEffect(() => {
    if (isConnectionValid() && nwcConnectionUri) {
      if (token) {
        setNwcRequester(nwcConnectionUri, clearUserAuth, oAuthTokenExchange);
      } else {
        setNwcRequester(nwcConnectionUri, clearUserAuth);
      }
    }
  }, [
    isConnectionValid,
    nwcConnectionUri,
    token,
    oAuthTokenExchange,
    setNwcRequester,
    clearUserAuth,
  ]);

  return { nwcRequester, resetNwcRequester };
};
