import { useState } from "react";
import { STEP_MAP, Step } from "src/types";

export const useStep = () => {
  const [step, setStep] = useState<Step>(Step.Connect);

  const stepInfo = STEP_MAP[step];

  const onBack = () => {
    if (stepInfo.prev) {
      setStep(stepInfo.prev);
    }
  };

  return {
    step,
    setStep,
    onBack,
  };
};
