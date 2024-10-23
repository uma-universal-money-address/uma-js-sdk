"use client";
import styled from "@emotion/styled";
import { Button } from "@lightsparkdev/ui/components";
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
        <SuccessIcon>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="41"
            height="40"
            viewBox="0 0 41 40"
            fill="none"
          >
            <path
              d="M5.5 25L16.4813 33.236C16.8567 33.5175 17.3905 33.4338 17.6615 33.0507L36.3333 6.66667"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </SuccessIcon>
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

const SuccessIcon = styled.div`
  display: flex;
  width: 96px;
  height: 96px;
  justify-content: center;
  align-items: center;
  border-radius: 999px;
  background: #19981e;
`;
