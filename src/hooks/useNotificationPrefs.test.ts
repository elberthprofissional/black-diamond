import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useNotificationPrefs } from './useNotificationPrefs';

// Use vi.hoisted to avoid hoisting issues with vi.mock
const mockGetUser = vi.hoisted(() => vi.fn());
const mockSelect = vi.hoisted(() => vi.fn());
const mockEq = vi.hoisted(() => vi.fn());
const mockMaybeSingle = vi.hoisted(() => vi.fn());
const mockUpsert = vi.hoisted(() => vi.fn());

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: mockGetUser,
    },
    from: vi.fn(() => ({
      select: mockSelect,
      upsert: mockUpsert,
    })),
  },
}));

vi.mock('../lib/logger', () => ({
  logError: vi.fn(),
}));

describe('useNotificationPrefs', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock chain
    mockSelect.mockReturnValue({
      eq: mockEq,
    });
    mockEq.mockReturnValue({
      maybeSingle: mockMaybeSingle,
    });

    mockGetUser.mockResolvedValue({
      data: { user: { id: 'admin-1', email: 'admin@test.com' } },
    });
  });

  it('inicializa com valores padrão enquanto carrega', () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => useNotificationPrefs());

    expect(result.current.loading).toBe(true);
    expect(result.current.prefs).toEqual({
      inApp: true,
      sound: true,
      preview: true,
      badge: true,
    });
  });

  it('carrega preferências salvas do servidor', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { value: JSON.stringify({ inApp: false, sound: true, preview: false, badge: true }) },
      error: null,
    });

    const { result } = renderHook(() => useNotificationPrefs());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.prefs.inApp).toBe(false);
    expect(result.current.prefs.sound).toBe(true);
    expect(result.current.prefs.preview).toBe(false);
    expect(result.current.prefs.badge).toBe(true);
  });

  it('usa defaults quando não há preferências salvas', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => useNotificationPrefs());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.prefs).toEqual({
      inApp: true,
      sound: true,
      preview: true,
      badge: true,
    });
  });

  it('usa defaults quando JSON salvo é inválido', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { value: 'invalid json' },
      error: null,
    });

    const { result } = renderHook(() => useNotificationPrefs());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.prefs).toEqual({
      inApp: true,
      sound: true,
      preview: true,
      badge: true,
    });
  });

  it('não busca preferências quando não há usuário logado', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { result } = renderHook(() => useNotificationPrefs());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.prefs).toEqual({
      inApp: true,
      sound: true,
      preview: true,
      badge: true,
    });
  });

  it('updatePref atualiza preferência otimisticamente', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockUpsert.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useNotificationPrefs());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      const success = await result.current.updatePref('sound', false);
      expect(success).toBe(true);
    });

    expect(result.current.prefs.sound).toBe(false);
    expect(result.current.prefs.inApp).toBe(true);
  });

  it('updatePref faz rollback em caso de erro', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockUpsert.mockResolvedValue({ error: new Error('DB error') });

    const { result } = renderHook(() => useNotificationPrefs());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      const success = await result.current.updatePref('sound', false);
      expect(success).toBe(false);
    });

    // Rollback: sound volta a ser true (default)
    expect(result.current.prefs.sound).toBe(true);
  });

  it('resetPrefs restaura valores padrão', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { value: JSON.stringify({ inApp: false, sound: false, preview: false, badge: false }) },
      error: null,
    });
    mockUpsert.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useNotificationPrefs());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.prefs.inApp).toBe(false);

    await act(async () => {
      const success = await result.current.resetPrefs();
      expect(success).toBe(true);
    });

    expect(result.current.prefs).toEqual({
      inApp: true,
      sound: true,
      preview: true,
      badge: true,
    });
  });

  it('refetch recarrega preferências', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null }).mockResolvedValueOnce({
      data: { value: JSON.stringify({ inApp: false, sound: false, preview: false, badge: false }) },
      error: null,
    });

    const { result } = renderHook(() => useNotificationPrefs());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.prefs.inApp).toBe(false);
    expect(mockMaybeSingle).toHaveBeenCalledTimes(2);
  });
});
