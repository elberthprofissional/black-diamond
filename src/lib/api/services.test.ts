import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServices } from './services';

const mockFrom = vi.fn();

vi.mock('../supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

describe('getServices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns services from database', async () => {
    const services = [
      { id: '1', name: 'Corte', price: 50, duration: 30 },
      { id: '2', name: 'Barba', price: 30, duration: 20 },
    ];
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: services, error: null }),
    });

    const result = await getServices();
    expect(result).toEqual(services);
  });

  it('returns all services without frontend dedup (unique constraint in DB)', async () => {
    const services = [
      { id: '1', name: 'Corte', price: 50, duration: 30 },
      { id: '2', name: 'Corte', price: 60, duration: 40 },
      { id: '3', name: 'Barba', price: 30, duration: 20 },
    ];
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: services, error: null }),
    });

    const result = await getServices();
    // Dedup removido — unique constraint agora é no banco (migration 009)
    expect(result).toHaveLength(3);
  });

  it('returns empty array when no data', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    const result = await getServices();
    expect(result).toEqual([]);
  });

  it('throws on error', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: { message: 'fail' } }),
    });

    await expect(getServices()).rejects.toThrow();
  });
});
