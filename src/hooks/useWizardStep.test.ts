import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWizardStep } from './useWizardStep';

describe('useWizardStep', () => {
  it('starts at step 1', () => {
    const { result } = renderHook(() => useWizardStep());
    expect(result.current.step).toBe(1);
  });

  it('returns correct step title', () => {
    const { result } = renderHook(() => useWizardStep());
    expect(result.current.stepTitle).toBe('Seus dados');
  });

  describe('goNext', () => {
    it('advances to next step', () => {
      const { result } = renderHook(() => useWizardStep());
      act(() => result.current.goNext());
      expect(result.current.step).toBe(2);
      expect(result.current.stepTitle).toBe('Escolha o barbeiro');
    });

    it('does not go beyond totalSteps', () => {
      const { result } = renderHook(() => useWizardStep(2));
      act(() => result.current.goNext());
      act(() => result.current.goNext());
      expect(result.current.step).toBe(2);
    });

    it('calls onConfirm at last step', () => {
      const onConfirm = vi.fn();
      const { result } = renderHook(() => useWizardStep(2));
      act(() => result.current.goNext());
      act(() =>
        result.current.goNext(onConfirm, {
          step: 2,
          selectedBarber: { id: 'b1', name: 'Barber' },
          selectedServices: [{ id: '1' }],
          selectedDate: '2026-07-20',
          selectedTime: '10:00',
          isSubmitting: false,
        })
      );
      // Step stays at 2, onConfirm should be called
      expect(result.current.step).toBe(2);
      expect(onConfirm).toHaveBeenCalled();
    });

    it('does not advance if validation fails', () => {
      const { result } = renderHook(() => useWizardStep());
      act(() =>
        result.current.goNext(undefined, {
          step: 1,
          name: '',
          phone: '',
          selectedBarber: undefined,
          selectedServices: [],
          selectedDate: '',
          selectedTime: '',
          isSubmitting: false,
        })
      );
      expect(result.current.step).toBe(1);
    });
  });

  describe('goBack', () => {
    it('goes back to previous step', () => {
      const { result } = renderHook(() => useWizardStep());
      act(() => result.current.goNext());
      expect(result.current.step).toBe(2);
      act(() => result.current.goBack());
      expect(result.current.step).toBe(1);
    });

    it('does not go below step 1', () => {
      const { result } = renderHook(() => useWizardStep());
      act(() => result.current.goBack());
      expect(result.current.step).toBe(1);
    });
  });

  describe('isStepDisabled', () => {
    it('step 1 disabled without name', () => {
      const { result } = renderHook(() => useWizardStep());
      expect(
        result.current.isStepDisabled({
          step: 1,
          name: '',
          phone: '31999998888',
          selectedServices: [],
          selectedDate: '',
          selectedTime: '',
          isSubmitting: false,
        })
      ).toBe(true);
    });

    it('step 1 disabled with short name', () => {
      const { result } = renderHook(() => useWizardStep());
      expect(
        result.current.isStepDisabled({
          step: 1,
          name: 'Jo',
          phone: '31999998888',
          selectedServices: [],
          selectedDate: '',
          selectedTime: '',
          isSubmitting: false,
        })
      ).toBe(true);
    });

    it('step 1 disabled without phone', () => {
      const { result } = renderHook(() => useWizardStep());
      expect(
        result.current.isStepDisabled({
          step: 1,
          name: 'Joao',
          phone: '',
          selectedServices: [],
          selectedDate: '',
          selectedTime: '',
          isSubmitting: false,
        })
      ).toBe(true);
    });

    it('step 1 enabled with valid data', () => {
      const { result } = renderHook(() => useWizardStep());
      expect(
        result.current.isStepDisabled({
          step: 1,
          name: 'Joao Silva',
          phone: '31999998888',
          selectedServices: [],
          selectedDate: '',
          selectedTime: '',
          isSubmitting: false,
        })
      ).toBe(false);
    });

    it('step 2 disabled without barber', () => {
      const { result } = renderHook(() => useWizardStep());
      expect(
        result.current.isStepDisabled({
          step: 2,
          name: 'Joao',
          phone: '31999998888',
          selectedBarber: undefined,
          selectedServices: [],
          selectedDate: '',
          selectedTime: '',
          isSubmitting: false,
        })
      ).toBe(true);
    });

    it('step 2 enabled with barber', () => {
      const { result } = renderHook(() => useWizardStep());
      expect(
        result.current.isStepDisabled({
          step: 2,
          name: 'Joao',
          phone: '31999998888',
          selectedBarber: { id: 'b1', name: 'Barber' },
          selectedServices: [],
          selectedDate: '',
          selectedTime: '',
          isSubmitting: false,
        })
      ).toBe(false);
    });

    it('step 3 disabled without services', () => {
      const { result } = renderHook(() => useWizardStep());
      expect(
        result.current.isStepDisabled({
          step: 3,
          name: 'Joao',
          phone: '31999998888',
          selectedBarber: { id: 'b1' },
          selectedServices: [],
          selectedDate: '',
          selectedTime: '',
          isSubmitting: false,
        })
      ).toBe(true);
    });

    it('step 3 enabled with services', () => {
      const { result } = renderHook(() => useWizardStep());
      expect(
        result.current.isStepDisabled({
          step: 3,
          name: 'Joao',
          phone: '31999998888',
          selectedBarber: { id: 'b1' },
          selectedServices: [{ id: '1' }],
          selectedDate: '',
          selectedTime: '',
          isSubmitting: false,
        })
      ).toBe(false);
    });

    it('step 4 disabled without date', () => {
      const { result } = renderHook(() => useWizardStep());
      expect(
        result.current.isStepDisabled({
          step: 4,
          name: 'Joao',
          phone: '31999998888',
          selectedBarber: { id: 'b1' },
          selectedServices: [{ id: '1' }],
          selectedDate: '',
          selectedTime: '10:00',
          isSubmitting: false,
        })
      ).toBe(true);
    });

    it('step 4 disabled without time', () => {
      const { result } = renderHook(() => useWizardStep());
      expect(
        result.current.isStepDisabled({
          step: 4,
          name: 'Joao',
          phone: '31999998888',
          selectedBarber: { id: 'b1' },
          selectedServices: [{ id: '1' }],
          selectedDate: '2026-07-20',
          selectedTime: '',
          isSubmitting: false,
        })
      ).toBe(true);
    });

    it('step 4 enabled with date and time', () => {
      const { result } = renderHook(() => useWizardStep());
      expect(
        result.current.isStepDisabled({
          step: 4,
          name: 'Joao',
          phone: '31999998888',
          selectedBarber: { id: 'b1' },
          selectedServices: [{ id: '1' }],
          selectedDate: '2026-07-20',
          selectedTime: '10:00',
          isSubmitting: false,
        })
      ).toBe(false);
    });

    it('step 5 disabled while submitting', () => {
      const { result } = renderHook(() => useWizardStep());
      expect(
        result.current.isStepDisabled({
          step: 5,
          name: 'Joao',
          phone: '31999998888',
          selectedBarber: { id: 'b1' },
          selectedServices: [{ id: '1' }],
          selectedDate: '2026-07-20',
          selectedTime: '10:00',
          isSubmitting: true,
        })
      ).toBe(true);
    });

    it('step 5 enabled when not submitting', () => {
      const { result } = renderHook(() => useWizardStep());
      expect(
        result.current.isStepDisabled({
          step: 5,
          name: 'Joao',
          phone: '31999998888',
          selectedBarber: { id: 'b1' },
          selectedServices: [{ id: '1' }],
          selectedDate: '2026-07-20',
          selectedTime: '10:00',
          isSubmitting: false,
        })
      ).toBe(false);
    });
  });

  describe('setStep', () => {
    it('allows jumping to any step', () => {
      const { result } = renderHook(() => useWizardStep());
      act(() => result.current.setStep(3));
      expect(result.current.step).toBe(3);
    });
  });
});
