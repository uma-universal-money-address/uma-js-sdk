import styled from "@emotion/styled";
import { Button, Icon } from "@lightsparkdev/ui/components";
import { Body } from "@lightsparkdev/ui/components/typography/Body";
import { Title } from "@lightsparkdev/ui/components/typography/Title";
import { UmaDisplay } from "src/components/UmaDisplay";

export const WhatIsUma = () => {
  return (
    <>
      <UmaDisplay uma="you@domain.com" />
      <Container>
        <Section>
          <Icon name="Envelope" width={16} color={["content", "secondary"]} />
          <TextContainer>
            <Title size="Medium" content="It's like email, but for money" />
            <Body
              size="Medium"
              content="A Universal Money Address (UMA) lets you send and receive instant and low-fee payments to anyone, anywhere."
              color={["content", "secondary"]}
            />
          </TextContainer>
        </Section>
        <Section>
          <Icon name="AI" width={16} color={["content", "secondary"]} />
          <TextContainer>
            <Title size="Medium" content="Connect in seconds" />
            <Body
              size="Medium"
              content="Pay or receive with your UMA in your favorite apps — Just enter your UMA and approve the connection with your UMA provider."
              color={["content", "secondary"]}
            />
            <PoweredByContainer>
              <Body
                size="Small"
                content="Powered by"
                color={["content", "secondary"]}
              />
              <Body
                size="Small"
                content={{
                  text: "Nostr Wallet Connect",
                  externalLink: "https://nwc.dev/",
                }}
                color="link"
              />
            </PoweredByContainer>
          </TextContainer>
        </Section>
      </Container>
      <ButtonContainer>
        <Button
          text="Get an UMA"
          externalLink="https://www.uma.me/#getuma"
          typography={{
            type: "Label Strong",
          }}
          kind="primary"
          fullWidth
        />
        <Button
          text="Learn more"
          externalLink="https://www.uma.me/faq"
          typography={{
            type: "Label Strong",
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
  padding: 8px 40px 0 32px;
  gap: 24px;
`;

const TextContainer = styled.div`
  display: flex;
  flex-direction: column;
  max-width: 300px;
`;

const Section = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16px;
`;

const PoweredByContainer = styled.div`
  display: flex;
  flex-direction: row;
  gap: 2px;
`;

const ButtonContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  padding: 32px;
`;
