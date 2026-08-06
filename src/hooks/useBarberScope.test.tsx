import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useBarberScope } from './useBarberScope';
import { BarberProvider } from '../contexts/BarberContext';

// Mocks configuráveis (padrão do projeto — ver AdminDashboard.test.tsx)
const mockGetSession = vi.fn().mockResolvedValue({ data: { session: null }, error: null });
const mockGetBarbers = vi.fn().mockResolvedValue([]);
const mockGetBarberByUserId = vi.fn().mockResolvedValue(null);

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      onAuthStateChange: vi
        .fn()
        .mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

vi.mock('../lib/api/barbers', () => ({
  getBarbers: (...args: unknown[]) => mockGetBarbers(...args),
  getBarberByUserId: (...args: unknown[]) => mockGetBarberByUserId(...args),
}));

function Wrapper({ children }: { children: ReactNode }) {
  return <BarberProvider>{children}</BarberProvider>;
}

describe('useBarberScope', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    mockGetBarbers.mockResolvedValue([]);
    mockGetBarberByUserId.mockResolvedValue(null);
  });

  it('sem sessão: escopo aberto (null) e isScoped false', async () => {
    const { result } = renderHook(() => useBarberScope(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isScoped).toBe(false));
    expect(result.current.scopedBarberId).toBeNull();
  });

  it('barbeiro comum logado: escopo restrito ao próprio id', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'u-comum' } } },
      error: null,
    });
    mockGetBarberByUserId.mockResolvedValue({
      id: 'b-comum',
      name: 'Novo Barbeiro',
      is_owner: false,
      is_active: true,
      phone: '44999998888',
    });

    const { result } = renderHook(() => useBarberScope(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isScoped).toBe(true));
    expect(result.current.scopedBarberId).toBe('b-comum');
  });

  it('dono logado (is_owner): escopo aberto (null), vê tudo', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'u-dono' } } },
      error: null,
    });
    mockGetBarberByUserId.mockResolvedValue({
      id: 'b-dono',
      name: 'Tato',
      is_owner: true,
      is_active: true,
      phone: '43999553590',
    });

    const { result } = renderHook(() => useBarberScope(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isScoped).toBe(false));
    expect(result.current.scopedBarberId).toBeNull();
  });
});
