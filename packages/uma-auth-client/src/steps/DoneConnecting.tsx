import styled from "@emotion/styled";
import { Button } from "@lightsparkdev/ui/components";
import { Body } from "@lightsparkdev/ui/components/typography/Body";
import { Title } from "@lightsparkdev/ui/components/typography/Title";
import { StyledUmaConnectButton } from "src/components/UmaConnectButton";
import { useModalState } from "src/hooks/useModalState";
import { useOAuth } from "src/main";

export const DoneConnecting = () => {
  const { setIsModalOpen } = useModalState();
  const { address } = useOAuth();

  return (
    <>
      <Container>
        <UmaButtonSection>
          <UmaButtonPadding>
            <StyledUmaConnectButton address={address} />
          </UmaButtonPadding>
        </UmaButtonSection>
        <TextContainer>
          <Title size="Large" content="You're connected" />
          <Body
            size="Large"
            content="You can now use your UMA"
            color={["content", "secondary"]}
          />
        </TextContainer>
      </Container>
      <ButtonContainer>
        <Button
          text="Done"
          onClick={() => setIsModalOpen(false)}
          typography={{
            type: "Title",
          }}
          kind="secondary"
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
  max-width: 300px;
`;

const UmaButtonSection = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 16px 0;
`;

const UmaButtonPadding = styled.div`
  padding: 12px;
  align-items: center;
`;

const ButtonContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  padding: 32px;
`;
