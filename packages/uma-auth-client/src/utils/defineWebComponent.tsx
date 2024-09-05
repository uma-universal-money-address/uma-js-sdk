import createCache from "@emotion/cache";
import { CacheProvider, ThemeProvider } from "@emotion/react";
import { themes } from "@lightsparkdev/ui/styles/themes";
import React from "react";
import ReactDOM from "react-dom/client";
import { GlobalStyles } from "src/GlobalStyles";

type ComponentWithShadowRoot = React.FC;

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
        this.attachShadow({ mode: "open" });
        this.root = ReactDOM.createRoot(this.shadowRoot as ShadowRoot);
      }

      connectedCallback() {
        // Create insertion node for Emotion
        const emotionInsertionPoint = document.createElement("meta");
        emotionInsertionPoint.setAttribute("name", "emotion-insertion-point");
        this.shadowRoot?.appendChild(emotionInsertionPoint);

        // Load Manrope font. Fonts can't be loaded in the shadow dom so we must load it outside.
        const style = document.createElement("style");
        const head =
          document.head ||
          (document.getElementsByTagName("head")[0] as HTMLHeadElement);
        head.appendChild(style);
        style.type = "text/css";
        style.innerHTML = `
          @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@200..800');
        `;

        // Create emotion cache so dynamic styles get defined to the insertion node
        const cache = createCache({
          key: "uma-auth-client",
          container: emotionInsertionPoint,
        });

        // Render the react node using the custom emotion cache
        const reactNode = (
          <React.StrictMode>
            <CacheProvider value={cache}>
              <ThemeProvider theme={themes.umaAuthSdkLight}>
                <GlobalStyles />
                <Component />
              </ThemeProvider>
            </CacheProvider>
          </React.StrictMode>
        );
        this.root.render(reactNode);
      }

      disconnectedCallback() {
        this.root.unmount();
      }
    },
  );
}
