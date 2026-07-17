import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useServices, clearServicesCache } from './useServices';

vi.mock('../lib/api', () => ({
  getServices: vi.fn().mockResolvedValue([
    { id: '1', name: 'Corte', price: 35, duration: 30 },
    { id: '2', name: 'Barba', price: 27, duration: 20 },
  ]),
}));

describe('useServices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearServicesCache();
  });

  it('carrega servicos no mount', async () => {
    const { result } = renderHook(() => useServices());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.services).toHaveLength(2);
    expect(result.current.services[0].name).toBe('Corte');
  });

  it('usa cache no segundo render', async () => {
    const { getServices } = await import('../lib/api');

    renderHook(() => useServices());
    await waitFor(() => {
      expect(getServices).toHaveBeenCalledTimes(1);
    });

    renderHook(() => useServices());
    await waitFor(() => {
      expect(getServices).toHaveBeenCalledTimes(1);
    });
  });

  it('force refetch bypassa cache', async () => {
    const { getServices } = await import('../lib/api');

    const { result } = renderHook(() => useServices());
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    result.current.refetch();

    await waitFor(() => {
      expect(getServices).toHaveBeenCalledTimes(2);
    });
  });

  it('trata erro corretamente', async () => {
    const { getServices } = await import('../lib/api');
    vi.mocked(getServices).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useServices());

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
  });

  it('clearServicesCache reseta o cache', async () => {
    const { getServices } = await import('../lib/api');

    renderHook(() => useServices());
    await waitFor(() => {
      expect(getServices).toHaveBeenCalledTimes(1);
    });

    clearServicesCache();

    renderHook(() => useServices());
    await waitFor(() => {
      expect(getServices).toHaveBeenCalledTimes(2);
    });
  });
});
