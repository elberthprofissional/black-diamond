import { useState, useMemo, useCallback } from 'react';

interface WizardValidation {
  step: number;
  name?: string;
  phone?: string;
  selectedBarber?: unknown;
  selectedServices: unknown[];
  selectedDate: string;
  selectedTime: string;
  isSubmitting: boolean;
}

const STEP_TITLES: Record<number, string> = {
  1: 'Seus dados',
  2: 'Escolha o barbeiro',
  3: 'Escolha os serviços',
  4: 'Data e horário',
  5: 'Revisar agendamento',
};

export function useWizardStep(totalSteps = 5) {
  const [step, setStep] = useState(1);

  const isStepDisabled = useCallback(
    ({
      step: currentStep,
      name,
      phone,
      selectedBarber,
      selectedServices,
      selectedDate,
      selectedTime,
      isSubmitting,
    }: WizardValidation) => {
      if (currentStep === 1) {
        return (
          !name?.trim() ||
          (name?.trim().length ?? 0) < 3 ||
          (phone?.replace(/\D/g, '').length ?? 0) < 11
        );
      }
      if (currentStep === 2) return !selectedBarber;
      if (currentStep === 3) return selectedServices.length === 0;
      if (currentStep === 4) return !selectedDate || !selectedTime;
      if (currentStep === 5) return isSubmitting;
      return false;
    },
    []
  );

  const stepTitle = useMemo(() => STEP_TITLES[step] || '', [step]);

  const goNext = useCallback(
    (onConfirm?: () => void, validationInput?: WizardValidation) => {
      if (validationInput && isStepDisabled(validationInput)) return;
      if (step < totalSteps) {
        setStep((s) => s + 1);
      } else if (onConfirm) {
        onConfirm();
      }
    },
    [step, totalSteps, isStepDisabled]
  );

  const goBack = useCallback(() => {
    if (step > 1) setStep((s) => s - 1);
  }, [step]);

  return {
    step,
    setStep,
    isStepDisabled,
    stepTitle,
    goNext,
    goBack,
  };
}
