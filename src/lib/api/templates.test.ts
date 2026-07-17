import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTemplates, createTemplate, deleteTemplate } from './templates';

const mockFrom = vi.fn();

vi.mock('../supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

describe('templates API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTemplates', () => {
    it('returns templates filtered by key', async () => {
      const templates = [
        { id: '1', key: 'reminder', name: 'Lembrete', body: 'Oi', created_at: '', updated_at: '' },
      ];
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: templates, error: null }),
      };
      mockFrom.mockReturnValue(chain);

      const result = await getTemplates('reminder');
      expect(result).toEqual(templates);
      expect(chain.eq).toHaveBeenCalledWith('key', 'reminder');
    });

    it('throws on error', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'fail' } }),
      });

      await expect(getTemplates('x')).rejects.toThrow();
    });
  });

  describe('createTemplate', () => {
    it('inserts template and returns it', async () => {
      const template = {
        id: '1',
        key: 'reminder',
        name: 'Test',
        body: 'Hello',
        created_at: '',
        updated_at: '',
      };
      const chain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: template, error: null }),
      };
      mockFrom.mockReturnValue(chain);

      const result = await createTemplate('reminder', 'Test', 'Hello');
      expect(result).toEqual(template);
      expect(chain.insert).toHaveBeenCalledWith({ key: 'reminder', name: 'Test', body: 'Hello' });
    });
  });

  describe('deleteTemplate', () => {
    it('deletes template by id', async () => {
      const chain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };
      mockFrom.mockReturnValue(chain);

      await deleteTemplate('123');
      expect(chain.eq).toHaveBeenCalledWith('id', '123');
    });
  });
});
