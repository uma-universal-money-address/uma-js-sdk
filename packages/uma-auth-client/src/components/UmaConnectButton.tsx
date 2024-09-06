import styled from "@emotion/styled";
import { Icon, UnstyledButton } from "@lightsparkdev/ui/components";
import { Title } from "@lightsparkdev/ui/components/typography/Title";
import { useRef, useState } from "react";
import { AuthConfig, useOAuth } from "src/hooks/useOAuth";
import { useStep } from "src/hooks/useStep";
import { useUser } from "src/hooks/useUser";
import { Step } from "src/types";
import defineWebComponent from "src/utils/defineWebComponent";
import { getLocalStorage } from "src/utils/localStorage";
import { ConnectUmaModal } from "./ConnectUmaModal";

export const TAG_NAME = "uma-connect-button";

interface Props {
  authConfig: AuthConfig;
}

const UmaConnectButton = (props: Props) => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { uma, setUma } = useUser();
  const { step, setStep } = useStep();
  const { authConfig, codeVerifier, oAuthTokenExchange, setAuthConfig } =
    useOAuth();

  if (!authConfig) {
    setAuthConfig(props.authConfig);
  }

  // Check if already connected
  const isConnected = getLocalStorage("connectionUri");
  if (!uma) {
    const persistedUma = getLocalStorage("uma");
    if (persistedUma) {
      setUma(persistedUma);
    }
  }

  // TODO: Check if code is provided by client app
  if (uma && codeVerifier && step !== Step.WaitingForApproval) {
    setStep(Step.WaitingForApproval);
    oAuthTokenExchange(uma);

    // TODO: Styles are not loaded if the modal is opened immediately
    setTimeout(() => {
      setIsModalOpen(true);
    }, 1000);
  }

  const handleOpenModal = () => {
    if (isConnected) {
      if (uma) {
        setStep(Step.ConnectedUma);
      } else {
        setStep(Step.ConnectedWallet);
      }
    } else {
      setStep(Step.Connect);
    }

    setIsModalOpen(true);
  };

  return (
    <>
      <Button onClick={handleOpenModal} ref={buttonRef}>
        <ButtonContents>
          {isConnected ? (
            <>
              <Title size="Medium" content={uma} />
              <Icon name="Uma" width={24} />
            </>
          ) : (
            <>
              <Icon name="Uma" width={24} />
              <Title size="Medium" content="Connect" />
            </>
          )}
        </ButtonContents>
      </Button>
      <ConnectUmaModal
        visible={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        appendToElement={buttonRef.current?.parentNode as HTMLElement}
      />
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
