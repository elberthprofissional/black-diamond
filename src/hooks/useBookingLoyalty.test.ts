import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useBookingLoyalty } from './useBookingLoyalty';
import type { MilestoneProgress } from '../types';

vi.mock('../lib/api/loyalty', () => ({
  getClientMilestonesPublic: vi.fn(),
}));

describe('useBookingLoyalty', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna milestoneProgress vazio e nextMilestone null quando clientId é null', () => {
    const { result } = renderHook(() => useBookingLoyalty(null));

    expect(result.current.milestoneProgress).toEqual([]);
    expect(result.current.nextMilestone).toBeNull();
  });

  it('busca milestones quando clientId é fornecido', async () => {
    const { getClientMilestonesPublic } = await import('../lib/api/loyalty');
    const mockProgress: MilestoneProgress[] = [
      {
        milestone: { id: 'm1', visits_required: 3, reward_service_id: 's1', is_active: true },
        progress: 5,
        already_claimed: false,
      },
      {
        milestone: { id: 'm2', visits_required: 10, reward_service_id: 's2', is_active: true },
        progress: 5,
        already_claimed: false,
      },
    ];

    vi.mocked(getClientMilestonesPublic).mockResolvedValue(mockProgress);

    const { result } = renderHook(() => useBookingLoyalty('client-1'));

    await waitFor(() => {
      expect(result.current.milestoneProgress).toHaveLength(2);
    });

    expect(getClientMilestonesPublic).toHaveBeenCalledWith('client-1');
    // nextMilestone should be the first unclaimed (m1)
    expect(result.current.nextMilestone?.milestone.id).toBe('m1');
  });

  it('retorna nextMilestone null quando todos já foram resgatados', async () => {
    const { getClientMilestonesPublic } = await import('../lib/api/loyalty');
    const mockProgress: MilestoneProgress[] = [
      {
        milestone: { id: 'm1', visits_required: 3, reward_service_id: 's1', is_active: true },
        progress: 5,
        already_claimed: true,
      },
    ];

    vi.mocked(getClientMilestonesPublic).mockResolvedValue(mockProgress);

    const { result } = renderHook(() => useBookingLoyalty('client-1'));

    await waitFor(() => {
      expect(result.current.milestoneProgress).toHaveLength(1);
    });

    expect(result.current.nextMilestone).toBeNull();
  });

  it('retorna próximo milestone não resgatado', async () => {
    const { getClientMilestonesPublic } = await import('../lib/api/loyalty');
    const mockProgress: MilestoneProgress[] = [
      {
        milestone: { id: 'm1', visits_required: 3, reward_service_id: 's1', is_active: true },
        progress: 5,
        already_claimed: true, // já resgatado
      },
      {
        milestone: { id: 'm2', visits_required: 10, reward_service_id: 's2', is_active: true },
        progress: 5,
        already_claimed: false, // próximo!
      },
    ];

    vi.mocked(getClientMilestonesPublic).mockResolvedValue(mockProgress);

    const { result } = renderHook(() => useBookingLoyalty('client-1'));

    await waitFor(() => {
      expect(result.current.milestoneProgress).toHaveLength(2);
    });

    expect(result.current.nextMilestone?.milestone.id).toBe('m2');
  });

  it('lida com erro na API retornando array vazio', async () => {
    const { getClientMilestonesPublic } = await import('../lib/api/loyalty');
    vi.mocked(getClientMilestonesPublic).mockRejectedValue(new Error('API error'));

    const { result } = renderHook(() => useBookingLoyalty('client-1'));

    await waitFor(() => {
      expect(result.current.milestoneProgress).toEqual([]);
    });

    expect(result.current.nextMilestone).toBeNull();
  });

  it('atualiza quando clientId muda', async () => {
    const { getClientMilestonesPublic } = await import('../lib/api/loyalty');
    vi.mocked(getClientMilestonesPublic).mockResolvedValue([]);

    const { result, rerender } = renderHook(({ clientId }) => useBookingLoyalty(clientId), {
      initialProps: { clientId: 'client-1' as string | null },
    });

    await waitFor(() => {
      expect(getClientMilestonesPublic).toHaveBeenCalledWith('client-1');
    });

    // Muda para null
    rerender({ clientId: null });

    await waitFor(() => {
      expect(result.current.milestoneProgress).toEqual([]);
    });
  });
});
