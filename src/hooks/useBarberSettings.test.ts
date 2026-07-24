import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    })),
    auth: { getSession: vi.fn() },
  },
}));

vi.mock('../lib/logger', () => ({ logError: vi.fn() }));

describe('useBarberSettings (re-export)', () => {
  it('re-exports useBarberSettings from BarberSettingsContext', async () => {
    const mod = await import('./useBarberSettings');
    expect(typeof mod.useBarberSettings).toBe('function');
  });

  it('returns safe defaults when used outside provider', async () => {
    const { useBarberSettings } = await import('../contexts/BarberSettingsContext');
    const { result } = renderHook(() => useBarberSettings());

    expect(result.current.barberName).toBe('Admin');
    expect(result.current.brandName).toBe('Black Diamond');
    expect(result.current.loading).toBe(false);
    expect(typeof result.current.updateBarberName).toBe('function');
    expect(typeof result.current.refetch).toBe('function');
  });
});
