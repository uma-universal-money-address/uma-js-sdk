import styled from "@emotion/styled";
import { Button, TextInput } from "@lightsparkdev/ui/components";
import { Label } from "@lightsparkdev/ui/components/typography/Label";
import { LabelModerate } from "@lightsparkdev/ui/components/typography/LabelModerate";
import { useState } from "react";
import { Step } from "src/types";

export const ConnectUma = ({ setStep }: { setStep: (step: Step) => void }) => {
  const clientId = "1";
  const redirectUri = "http://localhost:3001";
  const responseType = "code";
  const codeChallenge = "1234";
  const codeChallengeMethod = "S256";

  const [uma, setUma] = useState("");

  const handleChangeUma = (value: string) => {
    setUma(value);
  };

  const handleConnectYourUMA = () => {
    window.location.href = `http://localhost:3000/apps/new?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=${responseType}&code_challenge=${codeChallenge}&code_challenge_method=${codeChallengeMethod}&required_commands=send_payments&optional_commands=read_balance,read_transactions&budget=10.USD%2Fmonthly&expiration_period=year`;
  };

  const handleMoreOptions = () => {
    setStep(Step.MoreOptions);
  };

  return (
    <>
      <ModalBody>
        <TextInput
          icon={{
            name: "DollarManropeSmall",
            width: 12,
            side: "left",
            offset: "large",
          }}
          value={uma}
          onChange={handleChangeUma}
          borderRadius="round"
        />
        <Buttons>
          <Button
            fullWidth
            kind="primary"
            text="Connect your UMA"
            onClick={handleConnectYourUMA}
          />
          <MoreOptionsButton>
            <Button
              kind="ghost"
              text="More options"
              typography={{
                color: "secondary",
              }}
              onClick={handleMoreOptions}
            />
          </MoreOptionsButton>
        </Buttons>
      </ModalBody>
      <Footer>
        <FooterInfo>
          <LabelModerate
            size="Large"
            content="Don't have an UMA? Get yours today."
          />
          <Label
            size="Large"
            content="It's like email, but for money."
            color="grayBlue43"
          />
        </FooterInfo>
        <Button
          text="Get UMA"
          onClick={() => {
            window.location.href = "https://www.uma.me/#getuma";
          }}
          typography={{
            color: "link",
            type: "Label Strong",
          }}
          paddingY="short"
        />
      </Footer>
    </>
  );
};

const ModalBody = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 24px 12px 24px;
  gap: 16px;
`;

const Buttons = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  width: 100%;
`;

const MoreOptionsButton = styled.div`
  display: flex;
  flex-direction: column;
  place-content: center;
  height: 56px;
`;

const Footer = styled.div`
  display: flex;
  padding: 24px;
  justify-content: space-between;
  align-items: center;
  border-top: 0.5px solid #c0c9d6;
`;

const FooterInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;
