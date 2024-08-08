import { ThemeProvider } from "@emotion/react";
import { themes } from "@lightsparkdev/ui/styles/themes";
import React from "react";
import ReactDOM from "react-dom/client";
import { GlobalStyles } from "src/GlobalStyles";

export default function defineWebComponent(
  tagName: string,
  Component: React.FC,
) {
  customElements.define(
    tagName,
    class extends HTMLElement {
      private root: ReactDOM.Root;

      constructor() {
        super();
        this.root = ReactDOM.createRoot(this);
      }

      connectedCallback() {
        this.root.render(
          <React.StrictMode>
            <ThemeProvider theme={themes.umameDocsLight}>
              <GlobalStyles />
              <Component />
            </ThemeProvider>
          </React.StrictMode>,
        );
      }

      disconnectedCallback() {
        this.root.unmount();
      }
    },
  );
}
