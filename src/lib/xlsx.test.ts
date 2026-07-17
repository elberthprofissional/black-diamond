import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateBookingXlsx, generateClientXlsx, generateFinancialXlsx } from './xlsx';

describe('xlsx', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.URL.createObjectURL = vi.fn(() => 'blob:mock');
    window.URL.revokeObjectURL = vi.fn();
  });

  describe('generateBookingXlsx', () => {
    it('generates xlsx from bookings data', () => {
      const bookings = [
        { name: 'Joao', date: '2026-07-20', price: 50 },
        { name: 'Maria', date: '2026-07-21', price: 30 },
      ];
      const columns = [
        { header: 'Nome', accessor: (r: Record<string, unknown>) => r.name as string },
        { header: 'Data', accessor: (r: Record<string, unknown>) => r.date as string },
        { header: 'Valor', accessor: (r: Record<string, unknown>) => r.price as number },
      ];

      expect(() => generateBookingXlsx(bookings, columns, 'test.xlsx')).not.toThrow();
    });

    it('handles empty bookings', () => {
      const columns = [{ header: 'Col', accessor: (r: Record<string, unknown>) => r.x as string }];
      expect(() => generateBookingXlsx([], columns, 'empty.xlsx')).not.toThrow();
    });
  });

  describe('generateClientXlsx', () => {
    it('generates xlsx from clients data', () => {
      const clients = [{ name: 'Joao', phone: '31999998888' }];
      const columns = [
        { header: 'Nome', accessor: (r: Record<string, unknown>) => r.name as string },
        { header: 'Telefone', accessor: (r: Record<string, unknown>) => r.phone as string },
      ];

      expect(() => generateClientXlsx(clients, columns, 'clients.xlsx')).not.toThrow();
    });
  });

  describe('generateFinancialXlsx', () => {
    it('generates xlsx from financial data', () => {
      const data: [string, Record<string, unknown>][] = [
        ['2026-07', { month: 'Julho', revenue: 5000 }],
      ];
      const columns = [
        { header: 'Mes', accessor: (r: Record<string, unknown>) => r.month as string },
        { header: 'Receita', accessor: (r: Record<string, unknown>) => r.revenue as number },
      ];

      expect(() => generateFinancialXlsx(data, columns, 'finance.xlsx')).not.toThrow();
    });
  });
});
