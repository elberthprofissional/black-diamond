import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSlotBlocking } from './useSlotBlocking';

const mockToggleSlotBlock = vi.fn();
const mockUnblockDay = vi.fn();

vi.mock('../lib/api', () => ({
  toggleSlotBlock: (...args: unknown[]) => mockToggleSlotBlock(...args),
  unblockDay: (...args: unknown[]) => mockUnblockDay(...args),
}));

vi.mock('./useToast', () => ({
  useToast: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }),
}));

vi.mock('./useAuditLog', () => ({
  useAuditLog: () => ({
    log: vi.fn().mockResolvedValue(undefined),
  }),
}));

describe('useSlotBlocking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inicializa com estados nulos', () => {
    const { result } = renderHook(() => useSlotBlocking());
    expect(result.current.blockingSlot).toBeNull();
    expect(result.current.unblockingBooking).toBeNull();
    expect(result.current.blockingDay).toBe(false);
  });

  it('blockSlot bloqueia horário com sucesso', async () => {
    mockToggleSlotBlock.mockResolvedValue(undefined);
    const { result } = renderHook(() => useSlotBlocking());
    const onComplete = vi.fn().mockResolvedValue(undefined);

    await act(async () => {
      await result.current.blockSlot('2026-07-15', '10:00', onComplete);
    });

    expect(mockToggleSlotBlock).toHaveBeenCalledWith('2026-07-15', '10:00');
    expect(onComplete).toHaveBeenCalled();
    expect(result.current.blockingSlot).toBeNull();
  });

  it('blockSlot trata erro', async () => {
    mockToggleSlotBlock.mockRejectedValue(new Error('Erro'));
    const { result } = renderHook(() => useSlotBlocking());

    await act(async () => {
      await result.current.blockSlot('2026-07-15', '10:00');
    });

    expect(result.current.blockingSlot).toBeNull();
  });

  it('unblockSlot desbloqueia booking com sucesso', async () => {
    mockToggleSlotBlock.mockResolvedValue(undefined);
    const { result } = renderHook(() => useSlotBlocking());

    await act(async () => {
      result.current.setUnblockingBooking({
        id: 'b1',
        booking_date: '2026-07-15',
        booking_time: '10:00:00',
        status: 'confirmed',
      } as never);
    });

    const onComplete = vi.fn().mockResolvedValue(undefined);
    await act(async () => {
      await result.current.unblockSlot('b1', onComplete);
    });

    expect(mockToggleSlotBlock).toHaveBeenCalled();
    expect(result.current.unblockingBooking).toBeNull();
  });

  it('blockEntireDay bloqueia todos os slots', async () => {
    mockToggleSlotBlock.mockResolvedValue(undefined);
    const { result } = renderHook(() => useSlotBlocking());
    const onComplete = vi.fn().mockResolvedValue(undefined);

    await act(async () => {
      await result.current.blockEntireDay('2026-07-15', ['08:00', '09:00', '10:00'], onComplete);
    });

    expect(mockToggleSlotBlock).toHaveBeenCalledTimes(3);
    expect(onComplete).toHaveBeenCalled();
  });

  it('blockEntireDay não faz nada com slots vazios', async () => {
    const { result } = renderHook(() => useSlotBlocking());

    await act(async () => {
      await result.current.blockEntireDay('2026-07-15', []);
    });

    expect(mockToggleSlotBlock).not.toHaveBeenCalled();
  });

  it('unblockEntireDay chama unblockDay', async () => {
    mockUnblockDay.mockResolvedValue(undefined);
    const { result } = renderHook(() => useSlotBlocking());
    const onComplete = vi.fn().mockResolvedValue(undefined);

    await act(async () => {
      await result.current.unblockEntireDay(
        [
          { booking_date: '2026-07-15', is_blocked: true } as never,
          { booking_date: '2026-07-15', is_blocked: true } as never,
        ],
        onComplete
      );
    });

    expect(mockUnblockDay).toHaveBeenCalledWith('2026-07-15');
    expect(onComplete).toHaveBeenCalled();
  });

  it('unblockEntireDay não faz nada com array vazio', async () => {
    const { result } = renderHook(() => useSlotBlocking());

    await act(async () => {
      await result.current.unblockEntireDay([]);
    });

    expect(mockUnblockDay).not.toHaveBeenCalled();
  });

  it('blockSlot usa customKey quando fornecido', async () => {
    mockToggleSlotBlock.mockResolvedValue(undefined);
    const { result } = renderHook(() => useSlotBlocking());

    await act(async () => {
      await result.current.blockSlot('2026-07-15', '10:00', undefined, 'custom-key');
    });

    expect(result.current.blockingSlot).toBeNull();
  });
});
