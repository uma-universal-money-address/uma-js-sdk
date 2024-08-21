import styled from "@emotion/styled";
import {
  Button,
  Icon,
  Modal,
  TextInput,
  UnstyledButton,
} from "@lightsparkdev/ui/components";
import { Label } from "@lightsparkdev/ui/components/typography/Label";
import { LabelModerate } from "@lightsparkdev/ui/components/typography/LabelModerate";
import { useState } from "react";

interface Props {
  visible: boolean;
  onClose: () => void;
  appendToElement: HTMLElement;
}

export const ConnectUmaModal = (props: Props) => {
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
    console.log("More options button clicked");
  };

  let backButton = null;

  const helpButton = (
    <Button
      kind="ghost"
      icon="QuestionCircle"
      onClick={() => {
        console.log("Help button clicked");
      }}
    />
  );

  return (
    <Modal
      ghost
      width={432}
      smKind="drawer"
      visible={props.visible}
      cancelHidden
      onClose={props.onClose}
      onCancel={props.onClose}
      appendToElement={props.appendToElement}
    >
      <ModalContents>
        <Header>
          {backButton ? backButton : helpButton}
          <Icon name="Uma" width={32} />
          <CloseButton onClick={props.onClose} type="button">
            <Icon name="Close" width={8} />
          </CloseButton>
        </Header>
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
              console.log("Learn more button clicked");
            }}
            typography={{
              color: "link",
              type: "Label Strong",
            }}
            paddingY="short"
          />
        </Footer>
      </ModalContents>
    </Modal>
  );
};

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 16px 16px 12px 16px;
`;

const ModalContents = styled.div`
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.bg};
  border-radius: 24px;
  box-shadow:
    0px 0px 0px 1px rgba(0, 0, 0, 0.06),
    0px 1px 1px -0.5px rgba(0, 0, 0, 0.06),
    0px 3px 3px -1.5px rgba(0, 0, 0, 0.06),
    0px 6px 6px -3px rgba(0, 0, 0, 0.06),
    0px 12px 12px -6px rgba(0, 0, 0, 0.06),
    0px 24px 24px -12px rgba(0, 0, 0, 0.06);
`;

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

const CloseButton = styled(UnstyledButton)`
  width: 24px;
  height: 24px;
  justify-self: flex-end;
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
