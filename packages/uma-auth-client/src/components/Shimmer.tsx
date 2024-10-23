import styled from "@emotion/styled";

export const Shimmer = styled.div<{
  height: number;
  width?: number | undefined;
}>`
  background: linear-gradient(to right, #f6f7f8 0%, #686a72 50%, #f6f7f8 100%);
  background-size: 200% 100%;
  height: ${({ height }) => `${height}px`};
  border-radius: 999px;
  animation: shimmer 2s linear infinite;
  width: ${({ width }) => (width ? `${width}px` : "100%")};
  max-width: 300px;
  opacity: 0.2;

  @keyframes shimmer {
    0% {
      background-position: 100% 0;
    }
    100% {
      background-position: -100% 0;
    }
  }
`;
