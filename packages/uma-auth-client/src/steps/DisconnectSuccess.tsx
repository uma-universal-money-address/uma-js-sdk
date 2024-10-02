"use client";
import styled from "@emotion/styled";
import { Button, Icon } from "@lightsparkdev/ui/components";
import { Body } from "@lightsparkdev/ui/components/typography/Body";
import { Title } from "@lightsparkdev/ui/components/typography/Title";
import { useModalState } from "src/hooks/useModalState";

export const DisconnectSuccess = () => {
  const { setIsModalOpen } = useModalState();

  const handleDone = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <Container>
        <Icon name="CheckmarkCircleGreen" width={96} />
        <TextContainer>
          <Title size="Large" content="Your UMA is disconnected" />
          <Body
            size="Large"
            content="All access to this UMA has been revoked."
            color={["content", "secondary"]}
          />
        </TextContainer>
      </Container>
      <ButtonContainer>
        <Button
          text="Done"
          onClick={handleDone}
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
  padding: 12px 32px 0px 32px;
  gap: 24px;
`;

const TextContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
`;

const ButtonContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  padding: 32px;
`;
