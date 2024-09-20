import styled from "@emotion/styled";
import { Button } from "@lightsparkdev/ui/components";
import { Label } from "@lightsparkdev/ui/components/typography/Label";
import { LabelModerate } from "@lightsparkdev/ui/components/typography/LabelModerate";
import { Title } from "@lightsparkdev/ui/components/typography/Title";
import { useModalState } from "src/hooks/useModalState";
import { Step } from "src/types";

export const MoreOptions = () => {
  const { setStep } = useModalState();

  return (
    <>
      <ModalBody>
        <Button
          fullWidth
          kind="primary"
          text="Forgot your UMA?"
          onClick={() => setStep(Step.ForgotYourUma)}
        />
        <OrContainer>
          <Bar />
          <Title size="Medium" content="or" color="secondary" />
          <Bar />
        </OrContainer>
        <NostrContainer>
          <NostrInfo>
            <LabelModerate size="Large" content="Nostr Wallet Connect" />
            <Label
              size="Large"
              content={[
                "Connect a Bitcoin Lightning wallet compatible with Nostr Wallet Connect (NWC). ",
                {
                  text: "Learn more",
                  externalLink: "https://nwc.dev/",
                },
              ]}
              color="grayBlue43"
            />
          </NostrInfo>
          <Button
            text="Connect wallet via NWC"
            onClick={() => {
              setStep(Step.NostrWalletConnect);
            }}
            typography={{
              type: "Label Strong",
            }}
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

const OrContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  width: 100%;
`;

const Bar = styled.div`
  opacity: 0.6;
  background: #c0c9d6;
  height: 1px;
  width: 100%;
`;

const NostrContainer = styled.div`
  display: flex;
  padding: 24px;
  flex-direction: column;
  gap: 16px;
  border-radius: 16px;
  background: ${({ theme }) => theme.controls.bg};
`;

const NostrInfo = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 2px;
  text-align: center;
`;
