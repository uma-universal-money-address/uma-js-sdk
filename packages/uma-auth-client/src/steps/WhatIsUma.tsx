"use client";
import styled from "@emotion/styled";
import { Button, Icon } from "@lightsparkdev/ui/components";
import { Body } from "@lightsparkdev/ui/components/typography/Body";
import { Title } from "@lightsparkdev/ui/components/typography/Title";
import { UmaDisplay } from "src/components/UmaDisplay";

export const WhatIsUma = () => {
  return (
    <>
      <UmaDisplay uma="$you@domain.com" />
      <Container>
        <Section>
          <Icon name="Globus" width={16} color={["content", "secondary"]} />
          <TextContainer>
            <Title size="Medium" content="It's like email, but for money" />
            <Description>
              A Universal Money Address (UMA) lets you send and receive instant
              and low-fee payments to anyone, anywhere.
            </Description>
          </TextContainer>
        </Section>
        <Section>
          <Icon
            name="SparklesSoft"
            width={16}
            color={["content", "secondary"]}
          />
          <TextContainer>
            <Title size="Medium" content="Connect in seconds" />
            <Description>
              Pay or receive with your UMA in your favorite apps — Just enter
              your UMA and approve the connection with your UMA provider.
            </Description>
            <PoweredByContainer>
              <Body
                size="Small"
                content="Powered by"
                color={["content", "secondary"]}
              />
              <Link target="_blank" href="https://nwc.dev/">
                Nostr Wallet Connect
              </Link>
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
          size="Large"
          kind="primary"
          fullWidth
        />
        <Button
          text="Learn more"
          externalLink="https://www.uma.me/faq"
          typography={{
            type: "Label Strong",
          }}
          size="Large"
          kind="linkLight"
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

const Description = styled.span`
  font-family: Manrope;
  font-size: 14px;
  font-weight: 500;
  line-height: 22px; /* 157.143% */
  color: #686a72;
`;

const Link = styled.a`
  font-family: Manrope;
  font-size: 12px;
  font-weight: 500;
  line-height: 18px; /* 150% */
  color: #0068c9;
  text-decoration: none;
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
  gap: 3px;
  align-items: center;
`;

const ButtonContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  padding: 32px;
`;
