import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSlotBlocking } from './useSlotBlocking';

vi.mock('./useToast', () => ({
  useToast: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }),
}));

vi.mock('../lib/api', () => ({
  toggleSlotBlock: vi.fn().mockResolvedValue(undefined),
  unblockDay: vi.fn().mockResolvedValue(undefined),
}));

describe('useSlotBlocking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inicializa com estado correto', () => {
    const { result } = renderHook(() => useSlotBlocking());
    expect(result.current.blockingSlot).toBeNull();
    expect(result.current.blockingDay).toBe(false);
  });

  it('blockSlot chama toggleSlotBlock', async () => {
    const { toggleSlotBlock } = await import('../lib/api');
    const { result } = renderHook(() => useSlotBlocking());

    await act(async () => {
      await result.current.blockSlot('2026-07-10', '10:00');
    });

    expect(toggleSlotBlock).toHaveBeenCalledWith('2026-07-10', '10:00');
  });

  it('blockSlot chama callback', async () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useSlotBlocking());

    await act(async () => {
      await result.current.blockSlot('2026-07-10', '10:00', callback);
    });

    expect(callback).toHaveBeenCalled();
  });

  it('blockSlot mostra erro em caso de falha', async () => {
    const { toggleSlotBlock } = await import('../lib/api');
    vi.mocked(toggleSlotBlock).mockRejectedValueOnce(new Error('fail'));

    const { result } = renderHook(() => useSlotBlocking());

    await act(async () => {
      await result.current.blockSlot('2026-07-10', '10:00');
    });

    expect(result.current.blockingSlot).toBeNull();
  });

  it('blockEntireDay itera todos os slots', async () => {
    const { toggleSlotBlock } = await import('../lib/api');
    const { result } = renderHook(() => useSlotBlocking());

    await act(async () => {
      await result.current.blockEntireDay('2026-07-10', ['10:00', '11:00', '12:00']);
    });

    expect(toggleSlotBlock).toHaveBeenCalledTimes(3);
  });

  it('blockEntireDay nao faz nada se vazio', async () => {
    const { toggleSlotBlock } = await import('../lib/api');
    const { result } = renderHook(() => useSlotBlocking());

    await act(async () => {
      await result.current.blockEntireDay('2026-07-10', []);
    });

    expect(toggleSlotBlock).not.toHaveBeenCalled();
  });

  it('unblockEntireDay chama unblockDay', async () => {
    const { unblockDay } = await import('../lib/api');
    const { result } = renderHook(() => useSlotBlocking());

    await act(async () => {
      await result.current.unblockEntireDay([
        { booking_date: '2026-07-10', booking_time: '10:00', id: 'b1', client_id: 'c1', service_ids: [], status: 'confirmed' as const, total_price: 0, total_duration: 0, created_at: '', clients: { name: '', phone: '' } },
      ]);
    });

    expect(unblockDay).toHaveBeenCalledWith('2026-07-10');
  });
});
