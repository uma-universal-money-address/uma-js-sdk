import { STEP_MAP, Step } from "src/types";
import { create } from "zustand";

interface StepState {
  step: Step;
  setStep: (step: Step) => void;
  onBack: () => void;
}

export const useStep = create<StepState>((set) => ({
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
}));
