import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWizardStep } from './useWizardStep';

describe('useWizardStep', () => {
  it('starts at step 1', () => {
    const { result } = renderHook(() => useWizardStep());
    expect(result.current.step).toBe(1);
  });

  it('returns correct step title for initial step', () => {
    const { result } = renderHook(() => useWizardStep());
    expect(result.current.stepTitle).toBe('Seus dados');
  });

  describe('goNext', () => {
    it('advances to next step (barber)', () => {
      const { result } = renderHook(() => useWizardStep());
      act(() => result.current.goNext());
      expect(result.current.step).toBe(2);
      expect(result.current.stepTitle).toBe('Escolha o barbeiro');
    });

    it('does not go beyond totalSteps', () => {
      const { result } = renderHook(() => useWizardStep(3));
      act(() => result.current.goNext());
      act(() => result.current.goNext());
      act(() => result.current.goNext());
      expect(result.current.step).toBe(3);
    });

    it('calls onConfirm at last step', () => {
      const onConfirm = vi.fn();
      const { result } = renderHook(() => useWizardStep(3));
      act(() => result.current.goNext());
      act(() => result.current.goNext());
      act(() =>
        result.current.goNext(onConfirm, {
          step: 3,
          selectedServices: [{ id: '1' }],
          selectedDate: '2026-07-20',
          selectedTime: '10:00',
          isSubmitting: false,
        })
      );
      expect(result.current.step).toBe(3);
      expect(onConfirm).toHaveBeenCalled();
    });

    it('does not advance if validation fails at step 1', () => {
      const { result } = renderHook(() => useWizardStep());
      act(() =>
        result.current.goNext(undefined, {
          step: 1,
          name: '',
          phone: '',
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

    it('step 2 (barber) disabled without barber', () => {
      const { result } = renderHook(() => useWizardStep());
      expect(
        result.current.isStepDisabled({
          step: 2,
          name: 'Joao',
          phone: '31999998888',
          selectedBarber: null,
          selectedServices: [],
          selectedDate: '',
          selectedTime: '',
          isSubmitting: false,
        })
      ).toBe(true);
    });

    it('step 2 (barber) enabled with barber', () => {
      const { result } = renderHook(() => useWizardStep());
      expect(
        result.current.isStepDisabled({
          step: 2,
          name: 'Joao',
          phone: '31999998888',
          selectedBarber: { id: 'b1' },
          selectedServices: [],
          selectedDate: '',
          selectedTime: '',
          isSubmitting: false,
        })
      ).toBe(false);
    });

    it('step 3 (services) disabled without services', () => {
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

    it('step 3 (services) enabled with services', () => {
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

    it('step 4 (date) disabled without date', () => {
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

    it('step 4 (time) disabled without time', () => {
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
