import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useServices, clearServicesCache } from './useServices';
import {
  queryClientWrapper as createWrapper,
  createSharedWrapper,
} from '../test/query-client-wrapper';

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
    localStorage.clear();
  });

  it('carrega servicos no mount', async () => {
    const { result } = renderHook(() => useServices(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.services).toHaveLength(2);
    expect(result.current.services[0]?.name).toBe('Corte');
  });

  it('usa cache interno do React Query entre renders', async () => {
    const { getServices } = await import('../lib/api');
    const { wrapper } = createSharedWrapper();

    // Primeiro render: carrega dados
    renderHook(() => useServices(), { wrapper });
    await waitFor(() => {
      expect(getServices).toHaveBeenCalledTimes(1);
    });

    // Segundo render: usa cache do QueryClient (NÃO chama API de novo)
    renderHook(() => useServices(), { wrapper });
    await waitFor(() => {
      expect(getServices).toHaveBeenCalledTimes(1); // ainda 1 — cache funcionou
    });
  });

  it('refetch força nova requisicao', async () => {
    const { getServices } = await import('../lib/api');

    const { result } = renderHook(() => useServices(), { wrapper: createWrapper() });
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await result.current.refetch();

    await waitFor(() => {
      expect(getServices).toHaveBeenCalledTimes(2);
    });
  });

  it('trata erro corretamente', async () => {
    const { getServices } = await import('../lib/api');
    vi.mocked(getServices).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useServices(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
  });

  it('clearServicesCache nao quebra o hook', async () => {
    const { result } = renderHook(() => useServices(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    clearServicesCache();

    expect(result.current.services).toHaveLength(2);
  });
});
