import { css } from "@emotion/css";
import styled from "@emotion/styled";
import { Icon, UnstyledButton } from "@lightsparkdev/ui/components";
import { useRef, useState } from "react";
import defineWebComponent from "src/utils/defineWebComponent";
import { ConnectUmaModal } from "./ConnectUmaModal";

export const TAG_NAME = "uma-connect-button";

const UmaConnectButton = () => {
  const buttonRef = useRef(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const clientId = "1";
  const redirectUri = "http://localhost:3001";
  const responseType = "code";
  const codeChallenge = "1234";
  const codeChallengeMethod = "S256";

  const handleOpenModal = () => {
    setIsModalOpen(true);
  }

  return (
    <>
      <Button
        ref={buttonRef}
        onClick={handleOpenModal}
      >
        <ButtonContents>
          <Icon
            name="Uma"
            width={36}
          />
          Connect
        </ButtonContents>
      </Button>
      <ConnectUmaModal visible={isModalOpen} onClose={() => setIsModalOpen(false)} insertionPoint={buttonRef.current!} />
    </>
  );
};

const Button = styled(UnstyledButton)`
  background-color: var(--uma-connect-background, #0068c9);
  border-radius: var(--uma-connect-radius, 999px);
  padding-left: var(--uma-connect-padding-x, 32px);
  padding-right: var(--uma-connect-padding-x, 32px);
  padding-top: var(--uma-connect-padding-y, 16px);
  padding-bottom: var(--uma-connect-padding-y, 16px);
  color: var(--uma-connect-text-color, #ffffff);
  font-family: var(--uma-connect-font-family, "Manrope");
  font-size: var(--uma-connect-font-size, 16px);
  font-weight: var(--uma-connect-font-weight, 700);
`;

const ButtonContents = styled.div`
  display: flex;
  flex-direction: row;
  gap: 6px;
  align-items: center;

  span {
    display: inline-flex;
  }
`;

defineWebComponent(TAG_NAME, UmaConnectButton);

export const UmaConnectButtonWebComponent = (props: Record<string, any>) => (
  <uma-connect-button {...props} />
);
