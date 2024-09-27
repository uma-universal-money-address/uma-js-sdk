/* eslint-disable react-refresh/only-export-components */
import type * as React from "react";
import {
  type TAG_NAME as UmaConnectButtonTagName,
  UmaConnectButtonWebComponent,
} from "./components/UmaConnectButton";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [UmaConnectButtonTagName]: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
    }
  }
}

export { useNwcRequester } from "./hooks/useNwcRequester";
export { useOAuth } from "./hooks/useOAuth";
export * from "./Nip47Types";
export { NwcRequester } from "./NwcRequester";
export { UmaConnectButtonWebComponent as UmaConnectButton };
