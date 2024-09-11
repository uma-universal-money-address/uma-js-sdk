import * as React from "react";
import {
  TAG_NAME as UmaConnectButtonTagName,
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
export { UmaConnectButtonWebComponent as UmaConnectButton };
