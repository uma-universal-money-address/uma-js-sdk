"use client";
import styled from "@emotion/styled";
import { Button } from "@lightsparkdev/ui/components";
import { Body } from "@lightsparkdev/ui/components/typography/Body";
import { Title } from "@lightsparkdev/ui/components/typography/Title";
import { useModalState } from "src/hooks/useModalState";
import { useOAuth } from "src/main";
import { Step } from "src/types";

export const DisconnectConfirmation = () => {
  const { setStep, onBack } = useModalState();
  const { clearUserAuth } = useOAuth();

  const handleDisconnect = () => {
    clearUserAuth();
    setStep(Step.DisconnectSuccess);
  };

  return (
    <>
      <Container>
        <TextContainer>
          <Title size="Large" content="Disconnect now" />
          <Body
            size="Large"
            content="You will no longer be able to use your UMA with this app."
            color={["content", "secondary"]}
          />
        </TextContainer>
      </Container>
      <ButtonContainer>
        <Button
          text="Disconnect"
          onClick={handleDisconnect}
          typography={{
            type: "Title",
          }}
          kind="quaternary"
          fullWidth
        />
        <Button
          text="Cancel"
          onClick={onBack}
          typography={{
            type: "Title",
          }}
          kind="tertiary"
          fullWidth
        />
      </ButtonContainer>
    </>
  );
};

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 32px 0px 32px;
  gap: 24px;
`;

const TextContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 300px;
  gap: 8px;
  text-align: center;
`;

const ButtonContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  padding: 32px;
`;
