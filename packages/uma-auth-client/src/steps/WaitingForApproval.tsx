import styled from "@emotion/styled";
import { Body } from "@lightsparkdev/ui/components/typography/Body";
import { Title } from "@lightsparkdev/ui/components/typography/Title";
import { UmaDisplay } from "src/components/UmaDisplay";
import { useUser } from "src/hooks/useUser";

export const WaitingForApproval = () => {
  const { uma } = useUser();

  return (
    <Container>
      <UmaDisplay uma={uma} isLoading={true} />
      <TextContainer>
        <Title size="Large" content="Waiting for approval" />
        <Body
          size="Large"
          content="Sign in to Rocket and follow the instructions to connect your UMA."
          color={["content", "secondary"]}
        />
      </TextContainer>
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 32px 48px 32px;
  gap: 24px;
`;

const TextContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  text-align: center;
`;
