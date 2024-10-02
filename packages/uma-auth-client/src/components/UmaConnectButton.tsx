"use client";
import styled from "@emotion/styled";
import { Icon, UnstyledButton } from "@lightsparkdev/ui/components";
import { Title } from "@lightsparkdev/ui/components/typography/Title";
import { type RefObject, useEffect, useRef } from "react";
import { useModalState } from "src/hooks/useModalState";
import { type AuthConfig, useOAuth } from "src/hooks/useOAuth";
import { Step } from "src/types";
import defineWebComponent from "src/utils/defineWebComponent";
import { isValidUma } from "src/utils/isValidUma";
import { ConnectUmaModal } from "./ConnectUmaModal";

export const TAG_NAME = "uma-connect-button";

interface Props {
  authConfig: AuthConfig;
}

const UmaConnectButton = (props: Props) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { step, setStep, isModalOpen, setIsModalOpen } = useModalState();
  const {
    authConfig,
    codeVerifier,
    isConnectionValid,
    oAuthTokenExchange,
    setAuthConfig,
    clearUserAuth,
    address,
  } = useOAuth();

  // Needed to prevent token refresh race condition due to react strict mode rendering the
  // component twice in dev mode.
  const isExchangingToken = useRef(false);

  const isConnected = isConnectionValid();

  if (!authConfig) {
    setAuthConfig(props.authConfig);
  }

  useEffect(() => {
    if (!address) {
      return;
    }

    let shouldOpenModalImmediately: boolean = false;
    if (
      codeVerifier &&
      !isConnected &&
      step !== Step.WaitingForApproval &&
      step !== Step.ErrorConnecting
    ) {
      setStep(Step.WaitingForApproval);

      // Only perform oauth token exchange if the code and state are present in the URL
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");
      const state = urlParams.get("state");
      if (code && state && !isExchangingToken.current) {
        isExchangingToken.current = true;
        oAuthTokenExchange()
          .catch((e) => {
            console.error(e);
            clearUserAuth();
            setStep(Step.ErrorConnecting);
          })
          .finally(() => {
            isExchangingToken.current = false;
          });
      }
      shouldOpenModalImmediately = true;
    } else if (isConnected && step === Step.WaitingForApproval) {
      setStep(Step.DoneConnecting);
      shouldOpenModalImmediately = true;
    }

    // TODO: Styles are not loaded if the modal is opened immediately
    if (!isModalOpen && shouldOpenModalImmediately) {
      setTimeout(() => {
        setIsModalOpen(true);
      }, 200);
    }
  }, [
    codeVerifier,
    address,
    isConnected,
    step,
    isModalOpen,
    clearUserAuth,
    oAuthTokenExchange,
    setStep,
    setIsModalOpen,
  ]);

  const handleOpenModal = () => {
    if (isConnected) {
      if (isValidUma(address)) {
        setStep(Step.ConnectedUma);
      } else {
        setStep(Step.ConnectedWallet);
      }
    } else if (codeVerifier && !isConnected) {
      setStep(Step.WaitingForApproval);
    } else {
      setStep(Step.Connect);
    }

    setIsModalOpen(true);
  };

  return (
    <>
      <StyledUmaConnectButton
        buttonRef={buttonRef}
        onClick={handleOpenModal}
        address={address}
      />
      <ConnectUmaModal
        appendToElement={buttonRef.current?.parentNode as HTMLElement}
      />
    </>
  );
};

export const StyledUmaConnectButton = ({
  onClick,
  buttonRef,
  address,
}: {
  onClick?: () => void;
  buttonRef?: RefObject<HTMLButtonElement>;
  address?: string | undefined;
}) => {
  let content = (
    <>
      <Icon name="Uma" width={24} />
      <Title size="Medium" content="Connect" />
    </>
  );
  if (isValidUma(address)) {
    content = (
      <>
        <Title size="Medium" content={address} />
        <Icon name="Uma" width={24} />
      </>
    );
  } else if (address) {
    content = (
      <>
        <Icon name="LogoBolt" width={12} />
        <Title size="Medium" content="Connect" />
      </>
    );
  }

  return (
    <Button onClick={onClick} ref={buttonRef}>
      <ButtonContents>{content}</ButtonContents>
    </Button>
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
