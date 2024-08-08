import styled from "@emotion/styled";
import { Body } from "@lightsparkdev/ui/components/typography/Body";
import { Title } from "@lightsparkdev/ui/components/typography/Title";
import { Spacing } from "@lightsparkdev/ui/styles/tokens/spacing";
import { UmaConnectButton } from "@uma-sdk/uma-auth-client";
import { useNavigate } from "react-router-dom";

function App() {
  const navigate = useNavigate();

  return (
    <Main>
      <Section>
        <Intro>
          <Title size="Large" content="UMA Auth Client SDK demo" />
          <Body content="Click the UMA Connect button to get started." />
        </Intro>
      </Section>
      <UmaConnectButton />
    </Main>
  );
}

const Main = styled.main`
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  gap: 24px;
  align-items: center;
  justify-content: center;
`;

const Intro = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${Spacing.sm};
  align-items: center;
`;

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export default App;
