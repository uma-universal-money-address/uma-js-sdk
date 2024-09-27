import styled from "@emotion/styled";
import { Button } from "@lightsparkdev/ui/components";
import { Body } from "@lightsparkdev/ui/components/typography/Body";
import { Title } from "@lightsparkdev/ui/components/typography/Title";
import { useState } from "react";
import { UmaDisplay } from "src/components/UmaDisplay";
import { useModalState } from "src/hooks/useModalState";
import { useUser } from "src/hooks/useUser";
import { useOAuth } from "src/main";
import { Step } from "src/types";

export const WaitingForApproval = () => {
  const { uma } = useUser();
  const { initialOAuthRequest, clearUserAuth } = useOAuth();
  const { setStep } = useModalState();
  const [isLoadingRetry, setIsLoadingRetry] = useState(false);

  const handleRetry = async () => {
    setIsLoadingRetry(true);
    const { success } = await initialOAuthRequest(uma!);
    if (!success) {
      clearUserAuth();
      setStep(Step.ErrorConnecting);
    }
  };

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
      <Button
        text="Retry"
        kind="secondary"
        fullWidth
        onClick={handleRetry}
        loading={isLoadingRetry}
      />
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
