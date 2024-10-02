"use client";
import styled from "@emotion/styled";
import { Icon } from "@lightsparkdev/ui/components";
import { Title } from "@lightsparkdev/ui/components/typography/Title";
import {
  motion,
  useAnimationFrame,
  useMotionTemplate,
  useMotionValue,
  useTransform,
} from "framer-motion";
import type React from "react";
import { useRef } from "react";

const BORDER_RADIUS = "999px";

export const UmaDisplay = ({
  uma,
  isLoading,
}: {
  uma?: string | undefined;
  isLoading?: boolean;
}) => {
  return (
    <Container>
      <LoaderContainer>
        <Loader>
          <MovingBorder rx="30%" ry="30%">
            {isLoading && <Gradient />}
          </MovingBorder>
        </Loader>
        <UmaTagInnerBorder />
        <UmaTagContainer>
          <UmaTag>
            <Title content={uma} color={["content", "secondary"]} />
            <Icon name="Uma" width={26} color={["content", "secondary"]} />
          </UmaTag>
        </UmaTagContainer>
      </LoaderContainer>
    </Container>
  );
};

export const MovingBorder = ({
  children,
  duration = 2000,
  rx,
  ry,
}: {
  children: React.ReactNode;
  duration?: number;
  rx?: string;
  ry?: string;
}) => {
  const pathRef = useRef<SVGRectElement | null>(null);
  const progress = useMotionValue<number>(0);

  useAnimationFrame((time) => {
    const length = pathRef.current?.getTotalLength();
    if (length) {
      const pxPerMillisecond = length / duration;
      progress.set((time * pxPerMillisecond) % length);
    }
  });

  const x = useTransform(
    progress,
    (val) => pathRef.current?.getPointAtLength(val).x,
  );
  const y = useTransform(
    progress,
    (val) => pathRef.current?.getPointAtLength(val).y,
  );

  const transform = useMotionTemplate`translateX(${x}px) translateY(${y}px) translateX(-50%) translateY(-50%)`;

  return (
    <>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        style={{
          position: "absolute",
          height: "100%",
          width: "100%",
        }}
        width="100%"
        height="100%"
      >
        <rect
          fill="none"
          width="100%"
          height="100%"
          rx={rx}
          ry={ry}
          ref={pathRef}
        />
      </svg>
      <motion.div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          display: "inline-block",
          transform,
        }}
      >
        {children}
      </motion.div>
    </>
  );
};

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 16px 0;
  position: relative;
`;

const LoaderContainer = styled.div`
  background: ${({ theme }) => theme.controls.bg};
  position: relative;
  overflow: hidden;
  border-radius: ${BORDER_RADIUS};
`;

const Loader = styled.div`
  position: absolute;
  inset: 0;
  border-radius: ${BORDER_RADIUS};
`;

const UmaTagInnerBorder = styled.div`
  background: ${({ theme }) => theme.bg};
  border-radius: ${BORDER_RADIUS};
  margin: 4px;
  position: absolute;
  inset: 0;
`;

const UmaTagContainer = styled.div`
  margin: 12px;
`;

const UmaTag = styled.div`
  background: ${({ theme }) => theme.controls.bg};
  border-radius: ${BORDER_RADIUS};
  padding: 16px;
  z-index: 999;
  display: flex;
  align-items: center;
  gap: 4px;
  position: relative;
`;

const Gradient = styled.div`
  height: 80px;
  width: 80px;
  opacity: 0.8;
  background: radial-gradient(#0068c9 40%, transparent 60%);
`;
