"use client";
import styled from "@emotion/styled";
import { Button, TextInput } from "@lightsparkdev/ui/components";
import { useEffect, useState } from "react";
import { useGetInfo } from "src/hooks/nwc-requests/useGetInfo";
import { useModalState } from "src/hooks/useModalState";
import { useOAuth } from "src/main";
import { Step } from "src/types";

export const NostrWalletConnect = () => {
  const { setStep } = useModalState();
  const [nwcConnectionString, setNwcConnectionString] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const {
    getInfoResponse,
    isLoading: isLoadingGetInfo,
    error: getInfoError,
  } = useGetInfo();
  const { setNwcConnectionUri, setAddress } = useOAuth();

  const handleInput = (value: string) => {
    setNwcConnectionString(value);
  };

  const handleConnect = () => {
    setIsLoading(true);
    setNwcConnectionUri(nwcConnectionString);
  };

  useEffect(() => {
    if (!isLoadingGetInfo && getInfoResponse?.lud16) {
      setAddress(getInfoResponse.lud16);
      setStep(Step.DoneConnecting);
    } else if (getInfoError) {
      setIsLoading(false);
      setNwcConnectionUri(undefined);
    }
  }, [
    getInfoResponse,
    isLoadingGetInfo,
    getInfoError,
    setAddress,
    setStep,
    setNwcConnectionUri,
  ]);

  return (
    <>
      <ModalBody>
        <TextInput
          value={nwcConnectionString}
          onChange={handleInput}
          placeholder="Enter your Nostr Wallet Connect URL"
        />
        <Button
          text="Connect wallet"
          onClick={handleConnect}
          typography={{
            type: "Label Strong",
          }}
          paddingY="short"
          fullWidth
          kind="tertiary"
          loading={isLoading}
          disabled={!nwcConnectionString}
        />
      </ModalBody>
    </>
  );
};

const ModalBody = styled.div`
  display: flex;
  padding: 16px 32px 32px 32px;
  flex-direction: column;
  align-items: flex-start;
  gap: 16px;
  align-self: stretch;
`;
