import styled from "@emotion/styled";
import { Button, TextInput } from "@lightsparkdev/ui/components";
import { Label } from "@lightsparkdev/ui/components/typography/Label";
import { LabelModerate } from "@lightsparkdev/ui/components/typography/LabelModerate";
import { useStep } from "src/hooks/useStep";
import { useUser } from "src/hooks/useUser";
import { Step } from "src/types";
import { getUmaDomain } from "src/utils/getUmaDomain";
import { setLocalStorage } from "src/utils/localStorage";

interface DiscoveryDocument {
  authorization_endpoint: string;
}

export const ConnectUma = () => {
  const { setStep } = useStep();
  const { uma, setUma } = useUser();
  const handleChangeUma = (value: string) => {
    setUma(`$${value}`);
  };

  const handleConnectYourUMA = () => {
    // TODO: validate the uma format
    const validatedUma = uma!;

    setLocalStorage("uma", validatedUma);
    const umaDomain = getUmaDomain(validatedUma);

    (async () => {
      // TODO: get real discovery document for authorization_endpoint
      // const discoveryDocument = await fetch(`https://${umaDomain}/.well-known/uma-configuration`);
      // const discoveryDocumentJson = await discoveryDocument.json<DiscoveryDocument>();
      const discoveryDocumentJson = {
        authorization_endpoint: "http://localhost:3000/apps/new",
      };

      // TODO: get real client_id from vasp?
      const clientId =
        "npub1u2zfe9zpq2gcuduxatqa5k3alq5yny9qdeq8yrjfqxh4qywa6ejq8daqq6 wss://nos.lol";

      // TODO: generate redirectUri based on current page or have it provided by client app
      const redirectUri = "http://localhost:3001";

      // TODO: use oauth library to get oauth params: response_type, code_challenge, code_challenge_method
      const responseType = "code";
      const codeChallenge = "1234";
      const codeChallengeMethod = "S256";

      // TODO: get required and optional commands, budget, and expirationPeriod from client app
      const requiredCommands = "send_payments";
      const optionalCommands = "read_balance,read_transactions";
      const budget = "10.USD%2Fmonthly";
      const expirationPeriod = "year";

      // TODO: use oauth library to redirect to authorization_endpoint, don't build manually
      window.location.href = `${discoveryDocumentJson.authorization_endpoint}?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=${responseType}&code_challenge=${codeChallenge}&code_challenge_method=${codeChallengeMethod}&required_commands=${requiredCommands}&optional_commands=${optionalCommands}&budget=${budget}&expiration_period=${expirationPeriod}`;
    })();
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
          value={uma?.replace(/^\$/, "") || ""}
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
