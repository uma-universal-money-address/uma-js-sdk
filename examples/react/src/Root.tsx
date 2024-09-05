import styled from "@emotion/styled";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
  },
]);

export function Root() {
  return (
    <Container>
      <RouterProvider router={router} />
    </Container>
  );
}

const Container = styled.div`
  width: 100%;
  height: 100vh;
  background-color: ${({ theme }) => theme.bg};
`;
