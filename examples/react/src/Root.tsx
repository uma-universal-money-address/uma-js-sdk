import { ThemeProvider } from "@emotion/react";
import styled from "@emotion/styled";
import { themes } from "@lightsparkdev/ui/styles/themes";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App";
import { GlobalStyles } from "./GlobalStyles";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
  },
]);

export function Root() {
  return (
    <ThemeProvider theme={themes.umameDocsLight}>
      <GlobalStyles />
      <Container>
        <RouterProvider router={router} />
      </Container>
    </ThemeProvider>
  );
}

const Container = styled.div`
  width: 100%;
  height: 100vh;
  background-color: ${({ theme }) => theme.bg};
`;
