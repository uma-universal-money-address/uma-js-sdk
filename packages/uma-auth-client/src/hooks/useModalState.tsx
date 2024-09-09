import { STEP_MAP, Step } from "src/types";
import { create } from "zustand";

interface ModalState {
  step: Step;
  setStep: (step: Step) => void;
  onBack: () => void;
  isModalOpen: boolean;
  setIsModalOpen: (isModalOpen: boolean) => void;
}

export const useModalState = create<ModalState>((set) => ({
  step: Step.Connect,
  setStep: (step) => set({ step }),
  onBack: () =>
    set(({ step }) => {
      const stepInfo = STEP_MAP[step];
      if (stepInfo.prev) {
        return { step: stepInfo.prev };
      }
      return { step };
    }),
  isModalOpen: false,
  setIsModalOpen: (isModalOpen) => set({ isModalOpen }),
}));
