import { describe, it, expect, vi, beforeEach } from 'vitest';
import { downloadXlsx } from './xlsx';

describe('xlsx', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.URL.createObjectURL = vi.fn(() => 'blob:mock');
    window.URL.revokeObjectURL = vi.fn();
  });

  describe('downloadXlsx', () => {
    it('generates xlsx from sheet data', () => {
      const sheets = [
        {
          name: 'Agendamentos',
          columns: [{ header: 'Nome' }, { header: 'Valor' }],
          rows: [
            ['Joao', 50],
            ['Maria', 30],
          ],
        },
      ];

      expect(() => downloadXlsx(sheets, 'test.xlsx')).not.toThrow();
    });

    it('handles empty sheets array', () => {
      expect(() => downloadXlsx([], 'empty.xlsx')).not.toThrow();
    });

    it('handles single sheet with empty rows', () => {
      const sheets = [
        {
          name: 'Test',
          columns: [{ header: 'Col' }],
          rows: [],
        },
      ];
      expect(() => downloadXlsx(sheets, 'test.xlsx')).not.toThrow();
    });
  });
});
