'use client';

import { useState } from 'react';

interface UseIntroModalOptions {
  onClose: () => void;
}

export function useIntroModal({ onClose }: UseIntroModalOptions) {
  const [step, setStep] = useState(1);

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
    else {
      setStep(1);
      onClose();
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  return { step, setStep, handleNext, handleBack };
}
