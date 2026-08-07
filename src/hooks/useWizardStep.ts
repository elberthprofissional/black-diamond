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

const STEP_TITLES_4: Record<number, string> = {
  1: 'Seus dados',
  2: 'Escolha os serviços',
  3: 'Data e horário',
  4: 'Revisar agendamento',
};

const STEP_TITLES_5: Record<number, string> = {
  1: 'Seus dados',
  2: 'Escolha os serviços',
  3: 'Escolha o barbeiro',
  4: 'Data e horário',
  5: 'Revisar agendamento',
};

/**
 * Wizard de agendamento.
 *
 * - `totalSteps = 4` (padrão): Dados → Serviços → Data/Horário → Revisar
 * - `totalSteps = 5`: Dados → Serviços → **Barbeiro** → Data/Horário → Revisar
 *   (usado quando há 2+ barbeiros ativos fora do modo solo — a escolha do
 *   barbeiro vem antes da data para que os horários sejam os DELE).
 */
export function useWizardStep(totalSteps = 4) {
  const [step, setStep] = useState(1);

  const hasBarberStep = totalSteps === 5;

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
      if (currentStep === 2) return selectedServices.length === 0;
      if (hasBarberStep) {
        if (currentStep === 3) return !selectedBarber;
        if (currentStep === 4) return !selectedDate || !selectedTime;
        if (currentStep === 5) return isSubmitting;
        return false;
      }
      if (currentStep === 3) return !selectedDate || !selectedTime;
      if (currentStep === 4) return isSubmitting;
      return false;
    },
    [hasBarberStep]
  );

  const stepTitle = useMemo(
    () => (hasBarberStep ? STEP_TITLES_5[step] || '' : STEP_TITLES_4[step] || ''),
    [step, hasBarberStep]
  );

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
