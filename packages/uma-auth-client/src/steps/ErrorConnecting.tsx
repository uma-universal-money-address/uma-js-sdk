import styled from "@emotion/styled";
import { Button } from "@lightsparkdev/ui/components";
import { Body } from "@lightsparkdev/ui/components/typography/Body";
import { Title } from "@lightsparkdev/ui/components/typography/Title";
import { UmaDisplay } from "src/components/UmaDisplay";
import { useModalState } from "src/hooks/useModalState";
import { useUser } from "src/hooks/useUser";

export const ErrorConnecting = () => {
  const { onBack } = useModalState();
  const { uma } = useUser();
  const umaDomain = uma?.split("@")[1] || "";
  const capitalizedUmaDomain =
    umaDomain.charAt(0).toUpperCase() + umaDomain.slice(1);

  return (
    <>
      <Container>
        <UmaButtonSection>
          <UmaDisplay uma={uma} />
        </UmaButtonSection>
        <TextContainer>
          <Title size="Large" content={`${capitalizedUmaDomain} unavailable`} />
          <Body
            size="Large"
            content={`Sorry, ${capitalizedUmaDomain} doesn't support UMA Connect... yet.`}
            color={["content", "secondary"]}
          />
        </TextContainer>
      </Container>
      <ButtonContainer>
        <Button
          text="Try another UMA"
          onClick={onBack}
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
  text-align: center;
`;

const UmaButtonSection = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
`;

const ButtonContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  padding: 32px;
`;
