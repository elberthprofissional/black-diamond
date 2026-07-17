import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getMaxNoShows, getClientNoShowCount } from './noShow';

const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock('../supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
    },
  },
}));

describe('noShow API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getMaxNoShows', () => {
    it('returns configured limit', async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { value: '5' }, error: null }),
      };
      mockFrom.mockReturnValue(chain);

      const result = await getMaxNoShows();
      expect(result).toBe(5);
    });

    it('returns default 3 when no config', async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
      mockFrom.mockReturnValue(chain);

      const result = await getMaxNoShows();
      expect(result).toBe(3);
    });

    it('returns default 3 on error', async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockRejectedValue(new Error('fail')),
      };
      mockFrom.mockReturnValue(chain);

      const result = await getMaxNoShows();
      expect(result).toBe(3);
    });
  });

  describe('getClientNoShowCount', () => {
    it('returns count of no-shows', async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockResolvedValue({ count: 2, error: null }),
      };
      mockFrom.mockReturnValue(chain);

      const result = await getClientNoShowCount('client-1');
      expect(result).toBe(2);
    });

    it('returns 0 on error', async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockRejectedValue(new Error('fail')),
      };
      mockFrom.mockReturnValue(chain);

      const result = await getClientNoShowCount('client-1');
      expect(result).toBe(0);
    });
  });
});
