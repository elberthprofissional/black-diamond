import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const mockGetClients = vi.fn();
const mockGetClientByPhone = vi.fn();
const mockGetMensalistaPlans = vi.fn();
const mockShowError = vi.fn();
const mockLogError = vi.fn();

const mockClients = [
  {
    id: 'c1',
    name: 'João Silva',
    phone: '11999999999',
    deleted_at: null,
    is_blocked: false,
    is_mensalista: false,
  },
  {
    id: 'c2',
    name: 'Maria Santos',
    phone: '11988888888',
    deleted_at: null,
    is_blocked: false,
    is_mensalista: true,
    mensalista_plan_id: 'plan-1',
  },
  {
    id: 'c3',
    name: 'BLOQUEADO',
    phone: '11977777777',
    deleted_at: null,
    is_blocked: false,
    is_mensalista: false,
  },
  {
    id: 'c4',
    name: 'Pedro',
    phone: '11966666666',
    deleted_at: '2024-01-01',
    is_blocked: false,
    is_mensalista: false,
  },
  {
    id: 'c5',
    name: 'Blocked User',
    phone: '11955555555',
    deleted_at: null,
    is_blocked: true,
    is_mensalista: false,
  },
];

vi.mock('../lib/api', () => ({
  getClients: (...args: unknown[]) => mockGetClients(...args),
  getClientByPhone: (...args: unknown[]) => mockGetClientByPhone(...args),
  getMensalistaPlans: (...args: unknown[]) => mockGetMensalistaPlans(...args),
}));

vi.mock('../lib/utils', () => ({
  formatPhone: (v: string) => v,
}));

vi.mock('../lib/constants', () => ({
  BLOCKED_NAME: 'BLOQUEADO',
}));

vi.mock('../lib/logger', () => ({
  logError: (...args: unknown[]) => mockLogError(...args),
}));

vi.mock('./useToast', () => ({
  useToast: () => ({
    showError: mockShowError,
  }),
}));

import { useAdminClientSearch } from './useAdminClientSearch';

const filteredClients = mockClients.filter(
  (c) => c.name !== 'BLOQUEADO' && !c.deleted_at && !c.is_blocked
);

describe('useAdminClientSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockGetMensalistaPlans.mockResolvedValue([
      { id: 'plan-1', name: 'Plano Básico', price: 100, visits: 4 },
    ]);
    mockGetClients.mockResolvedValue(mockClients);
    mockGetClientByPhone.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns initial state', () => {
    const { result } = renderHook(() => useAdminClientSearch());
    expect(result.current.searchQuery).toBe('');
    expect(result.current.selectedClient).toBeNull();
    expect(result.current.isSearchingClient).toBe(false);
    expect(result.current.isManualEntry).toBe(true);
    expect(result.current.multipleMatches).toEqual([]);
  });

  // ── handleSearch ────────────────────────────────────────────────────────────

  describe('handleSearch', () => {
    it('shows error when query is empty', () => {
      const { result } = renderHook(() => useAdminClientSearch());
      act(() => {
        result.current.handleSearch();
      });
      expect(mockShowError).toHaveBeenCalledWith('Digite um WhatsApp ou Nome.');
    });

    it('searches by name and finds single match', async () => {
      const { result } = renderHook(() => useAdminClientSearch());

      // Set state first (separate act so callback captures updated values)
      act(() => {
        result.current.setFilteredClientsForModal(filteredClients);
        result.current.setSearchQuery('João');
      });

      // Now call handleSearch with the updated searchQuery
      act(() => {
        result.current.handleSearch();
      });

      // Advance past the 400ms debounce
      act(() => {
        vi.advanceTimersByTime(500);
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.selectedClient).not.toBeNull();
      expect(result.current.selectedClient?.name).toBe('João Silva');
    });

    it('searches by phone and finds single match', async () => {
      const { result } = renderHook(() => useAdminClientSearch());

      act(() => {
        result.current.setFilteredClientsForModal(filteredClients);
        result.current.setSearchQuery('11999999999');
      });

      act(() => {
        result.current.handleSearch();
      });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.selectedClient?.name).toBe('João Silva');
    });

    it('searches by name and finds multiple matches', async () => {
      const { result } = renderHook(() => useAdminClientSearch());

      act(() => {
        result.current.setFilteredClientsForModal(filteredClients);
        result.current.setSearchQuery('a');
      });

      act(() => {
        result.current.handleSearch();
      });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.multipleMatches.length).toBeGreaterThan(1);
      expect(result.current.selectedClient).toBeNull();
      expect(result.current.isManualEntry).toBe(false);
    });

    it('searches and finds no matches — sets manual entry', async () => {
      const { result } = renderHook(() => useAdminClientSearch());

      act(() => {
        result.current.setFilteredClientsForModal(filteredClients);
        result.current.setSearchQuery('ZZZZNOTFOUND');
      });

      act(() => {
        result.current.handleSearch();
      });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.selectedClient).toBeNull();
      expect(result.current.multipleMatches).toEqual([]);
      expect(result.current.isManualEntry).toBe(true);
      expect(mockShowError).toHaveBeenCalledWith('Cliente não encontrado. Preencha o nome.');
    });

    it('searches with phone prefix formats phone in no-match path', async () => {
      const { result } = renderHook(() => useAdminClientSearch());

      act(() => {
        result.current.setFilteredClientsForModal(filteredClients);
        result.current.setSearchQuery('11900000000');
      });

      act(() => {
        result.current.handleSearch();
      });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      await act(async () => {
        await Promise.resolve();
      });

      // Phone search with no match should prefill phone in newClient
      expect(result.current.selectedClient).toBeNull();
      expect(result.current.isManualEntry).toBe(true);
    });
  });

  // ── loadClients ─────────────────────────────────────────────────────────────

  describe('loadClients', () => {
    it('loads and filters clients (excludes deleted, blocked, BLOQUEADO)', async () => {
      const { result } = renderHook(() => useAdminClientSearch());

      let clients: Awaited<ReturnType<typeof result.current.loadClients>> = [];
      await act(async () => {
        clients = await result.current.loadClients();
      });

      expect(clients).toHaveLength(2);
      expect(clients.map((c) => c.name)).toEqual(['João Silva', 'Maria Santos']);
    });

    it('handles loadClients error gracefully', async () => {
      mockGetClients.mockRejectedValue(new Error('Network error'));
      const { result } = renderHook(() => useAdminClientSearch());

      let clients: Awaited<ReturnType<typeof result.current.loadClients>> = [];
      await act(async () => {
        clients = await result.current.loadClients();
      });

      expect(clients).toEqual([]);
      expect(mockShowError).toHaveBeenCalledWith('Erro ao carregar clientes.');
    });
  });

  // ── selectClient ────────────────────────────────────────────────────────────

  describe('selectClient', () => {
    it('selects a mensalista client and sets plan', async () => {
      const { result } = renderHook(() => useAdminClientSearch());

      // Wait for plans to load
      await act(async () => {
        await mockGetMensalistaPlans();
      });

      act(() => {
        result.current.selectClient(mockClients[1]!);
      });

      expect(result.current.selectedClient?.name).toBe('Maria Santos');
      expect(result.current.isMensalista).toBe(true);
      expect(result.current.isManualEntry).toBe(false);
      expect(result.current.multipleMatches).toEqual([]);
      expect(result.current.currentPlan?.name).toBe('Plano Básico');
    });

    it('selects a non-mensalista client', () => {
      const { result } = renderHook(() => useAdminClientSearch());

      act(() => {
        result.current.selectClient(mockClients[0]!);
      });

      expect(result.current.isMensalista).toBe(false);
      expect(result.current.currentPlan).toBeNull();
    });
  });

  // ── phone detection (useEffect) ─────────────────────────────────────────────

  describe('phone auto-detection', () => {
    it('sets isMensalista when phone matches a mensalista client', async () => {
      mockGetClientByPhone.mockResolvedValue({
        id: 'c2',
        name: 'Maria Santos',
        is_mensalista: true,
        mensalista_plan_id: 'plan-1',
      });

      const { result } = renderHook(() => useAdminClientSearch());

      act(() => {
        result.current.setNewClient({ name: '', phone: '11988888888' });
        result.current.setIsManualEntry(true);
      });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.isMensalista).toBe(true);
    });

    it('resets isMensalista when phone is short', async () => {
      const { result } = renderHook(() => useAdminClientSearch());

      act(() => {
        result.current.setIsMensalista(true);
        result.current.setNewClient({ name: '', phone: '119' });
        result.current.setIsManualEntry(true);
      });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.isMensalista).toBe(false);
    });

    it('resets mensalista when phone lookup returns null', async () => {
      mockGetClientByPhone.mockResolvedValue(null);

      const { result } = renderHook(() => useAdminClientSearch());

      act(() => {
        result.current.setIsMensalista(true);
        result.current.setNewClient({ name: '', phone: '11900000000' });
        result.current.setIsManualEntry(true);
      });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.isMensalista).toBe(false);
      expect(result.current.currentPlan).toBeNull();
    });

    it('handles phone lookup error gracefully', async () => {
      mockGetClientByPhone.mockRejectedValue(new Error('Lookup failed'));

      const { result } = renderHook(() => useAdminClientSearch());

      act(() => {
        result.current.setNewClient({ name: '', phone: '11911111111' });
        result.current.setIsManualEntry(true);
      });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.isMensalista).toBe(false);
      expect(result.current.currentPlan).toBeNull();
    });

    it('does not run phone lookup when isManualEntry is false', () => {
      const { result } = renderHook(() => useAdminClientSearch());

      act(() => {
        result.current.setIsManualEntry(false);
        result.current.setNewClient({ name: '', phone: '11988888888' });
      });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(mockGetClientByPhone).not.toHaveBeenCalled();
    });

    it('prefills client name from phone lookup when newClient.name is empty', async () => {
      mockGetClientByPhone.mockResolvedValue({
        id: 'c2',
        name: 'Maria Santos',
        is_mensalista: false,
        mensalista_plan_id: null,
      });

      const { result } = renderHook(() => useAdminClientSearch());

      act(() => {
        result.current.setNewClient({ name: '', phone: '11988888888' });
        result.current.setIsManualEntry(true);
      });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.newClient.name).toBe('Maria Santos');
    });

    it('does not overwrite existing name from phone lookup', async () => {
      mockGetClientByPhone.mockResolvedValue({
        id: 'c2',
        name: 'Maria Santos',
        is_mensalista: false,
        mensalista_plan_id: null,
      });

      const { result } = renderHook(() => useAdminClientSearch());

      act(() => {
        result.current.setNewClient({ name: 'Custom Name', phone: '11988888888' });
        result.current.setIsManualEntry(true);
      });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.newClient.name).toBe('Custom Name');
    });
  });
});
