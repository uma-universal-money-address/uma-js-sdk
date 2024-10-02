"use client";
import { css, Global } from "@emotion/react";
import { GlobalStyles as LSGlobalStyles } from "@lightsparkdev/ui/styles/global";

export function GlobalStyles() {
  return (
    <>
      <LSGlobalStyles />
      <Global styles={globalStyles} />
    </>
  );
}

const globalStyles = css`
  html {
    font-size: 1rem;
  }
`;
