"use client";
import styled from "@emotion/styled";
import { Button } from "@lightsparkdev/ui/components";
import { LabelModerate } from "@lightsparkdev/ui/components/typography/LabelModerate";
import { useModalState } from "src/hooks/useModalState";
import { Step } from "src/types";

export const MoreOptions = () => {
  const { setStep } = useModalState();

  return (
    <>
      <ModalBody>
        {/* TODO: Finish implementing Forgot UMA flow */}
        {/* <Button
          fullWidth
          kind="primary"
          text="Forgot your UMA?"
          onClick={() => setStep(Step.ForgotYourUma)}
        />
        <OrContainer>
          <Bar />
          <Title size="Medium" content="or" color="secondary" />
          <Bar />
        </OrContainer> */}
        <NostrContainer>
          <NostrInfo>
            <LabelModerate size="Large" content="Nostr Wallet Connect" />
            <Description>
              Connect a Bitcoin Lightning wallet compatible with Nostr Wallet
              Connect (NWC).{" "}
              <Link target="_blank" href="https://nwc.dev/">
                Learn more
              </Link>
            </Description>
          </NostrInfo>
          <Button
            text="Connect wallet via NWC"
            onClick={() => {
              setStep(Step.NostrWalletConnect);
            }}
            typography={{
              type: "Label Strong",
            }}
            size="Large"
            paddingY="short"
            fullWidth
            kind="tertiary"
          />
        </NostrContainer>
      </ModalBody>
    </>
  );
};

const ModalBody = styled.div`
  display: flex;
  padding: 16px 32px 32px 32px;
  flex-direction: column;
  align-items: flex-start;
  gap: 16px;
  align-self: stretch;
`;

// const OrContainer = styled.div`
//   display: flex;
//   justify-content: center;
//   align-items: center;
//   gap: 8px;
//   width: 100%;
// `;

// const Bar = styled.div`
//   opacity: 0.6;
//   background: #c0c9d6;
//   height: 1px;
//   width: 100%;
// `;

const NostrContainer = styled.div`
  display: flex;
  padding: 24px;
  flex-direction: column;
  gap: 16px;
  border-radius: 16px;
  background: #f2f2f2;
`;

const NostrInfo = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 2px;
  text-align: center;
`;

const Description = styled.div`
  color: #686a72;
  font-family: Manrope;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px; /* 142.857% */
`;

const Link = styled.a`
  font-family: Manrope;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px; /* 142.857% */
  color: #0068c9;
  text-decoration: none;
`;
