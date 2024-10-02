"use client";
import styled from "@emotion/styled";
import {
  Button,
  Icon,
  Modal,
  UnstyledButton,
} from "@lightsparkdev/ui/components";
import { useModalState } from "src/hooks/useModalState";
import { STEP_MAP, Step } from "src/types";

interface Props {
  appendToElement: HTMLElement;
}

export const ConnectUmaModal = (props: Props) => {
  const { step, setStep, onBack, isModalOpen, setIsModalOpen } =
    useModalState();

  const stepInfo = STEP_MAP[step];

  const handleClose = () => {
    setIsModalOpen(false);
  };

  let topLeftButton = <LeftButton></LeftButton>;
  if (stepInfo.prev) {
    topLeftButton = (
      <LeftButton>
        <Button kind="ghost" icon="ChevronLeft" onClick={onBack} />
      </LeftButton>
    );
  } else if (step === Step.Connect) {
    topLeftButton = (
      <LeftButton>
        <Button
          kind="ghost"
          icon="QuestionCircle"
          onClick={() => {
            setStep(Step.WhatIsUma);
          }}
        />
      </LeftButton>
    );
  }

  return (
    <Modal
      ghost
      width={432}
      smKind="drawer"
      visible={isModalOpen}
      cancelHidden
      onClose={handleClose}
      onCancel={handleClose}
      appendToElement={props.appendToElement}
    >
      <ModalContents>
        <Header>
          {topLeftButton}
          {stepInfo.title ? (
            <ModalTitle>{stepInfo.title}</ModalTitle>
          ) : (
            <Icon name="Uma" width={32} />
          )}
          <CloseButton onClick={handleClose} type="button">
            <Icon name="Close" width={8} />
          </CloseButton>
        </Header>
        <stepInfo.component />
      </ModalContents>
    </Modal>
  );
};

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 24px 24px 12px 24px;
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

const CloseButton = styled(UnstyledButton)`
  width: 24px;
  height: 24px;
  justify-self: flex-end;
`;

const ModalTitle = styled.span`
  color: ${({ theme }) => theme.text};
  font-family: Manrope;
  text-align: center;
  font-size: 18px;
  font-weight: 700;
  line-height: 28px;
`;

const LeftButton = styled.div`
  width: 32px;
`;
