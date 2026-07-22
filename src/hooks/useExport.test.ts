import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExport } from './useExport';

const mockGetBookings = vi.fn();
const mockGetClients = vi.fn();
const mockGetServices = vi.fn();
const mockGetBookingsForStats = vi.fn();
const mockGenerateCsv = vi.fn().mockReturnValue('csv-content');
const mockDownloadCsv = vi.fn();
const mockDownloadXlsx = vi.fn();
const mockDownloadBookingsPdf = vi.fn();
const mockDownloadClientsPdf = vi.fn();
const mockDownloadFinancialPdf = vi.fn();
const mockShowError = vi.fn();
const mockLogError = vi.fn();

vi.mock('../lib/api', () => ({
  getBookings: (...a: unknown[]) => mockGetBookings(...a),
  getClients: (...a: unknown[]) => mockGetClients(...a),
  getServices: (...a: unknown[]) => mockGetServices(...a),
  getBookingsForStats: (...a: unknown[]) => mockGetBookingsForStats(...a),
}));

vi.mock('../lib/csv', () => ({
  generateCsv: (...a: unknown[]) => mockGenerateCsv(...a),
  downloadCsv: (...a: unknown[]) => mockDownloadCsv(...a),
  formatDateRange: vi.fn(() => '2026-01-01_2026-01-31'),
}));

vi.mock('../lib/xlsx', () => ({
  downloadXlsx: (...a: unknown[]) => mockDownloadXlsx(...a),
}));

vi.mock('../lib/pdf', () => ({
  downloadBookingsPdf: (...a: unknown[]) => mockDownloadBookingsPdf(...a),
  downloadClientsPdf: (...a: unknown[]) => mockDownloadClientsPdf(...a),
  downloadFinancialPdf: (...a: unknown[]) => mockDownloadFinancialPdf(...a),
}));

vi.mock('../lib/logger', () => ({
  logError: (...a: unknown[]) => mockLogError(...a),
}));

const mockBookings = [
  {
    id: 'b1',
    booking_date: '2026-01-15',
    booking_time: '10:30:00',
    clients: { name: 'João Silva', phone: '(11) 99999-1111' },
    service_ids: ['s1', 's2'],
    total_duration: 45,
    total_price: 80,
    discount_amount: 10,
    status: 'completed',
  },
  {
    id: 'b2',
    booking_date: '2026-02-10',
    booking_time: '14:00:00',
    clients: { name: 'Maria Souza', phone: '(22) 88888-2222' },
    service_ids: ['s1'],
    total_duration: 30,
    total_price: 50,
    discount_amount: 0,
    status: 'cancelled',
  },
  {
    id: 'b3',
    booking_date: '2026-01-20',
    booking_time: '09:00:00',
    clients: undefined,
    service_ids: [],
    total_duration: 0,
    total_price: 0,
    status: 'pending',
  },
];

const mockServices = [
  { id: 's1', name: 'Corte' },
  { id: 's2', name: 'Barba' },
];

const mockClients = [
  {
    name: 'João Silva',
    phone: '(11) 99999-1111',
    historical_visits: 5,
    last_visit_date: '2026-01-15',
    historical_spent: 400,
    is_mensalista: true,
    is_favorite: false,
  },
  {
    name: 'Maria Souza',
    phone: '(22) 88888-2222',
    historical_visits: 2,
    last_visit_date: '2026-02-10',
    historical_spent: 100,
    is_mensalista: false,
    is_favorite: true,
  },
];

const mockStats = [
  { booking_date: '2026-01-05', status: 'completed', total_price: 80 },
  { booking_date: '2026-01-10', status: 'completed', total_price: 50 },
  { booking_date: '2026-01-15', status: 'cancelled', total_price: 0 },
  { booking_date: '2026-02-01', status: 'completed', total_price: 100 },
  { booking_date: '2026-02-05', status: 'cancelled', total_price: 0 },
];

describe('useExport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetBookings.mockResolvedValue({ data: mockBookings });
    mockGetClients.mockResolvedValue(mockClients);
    mockGetServices.mockResolvedValue(mockServices);
    mockGetBookingsForStats.mockResolvedValue(mockStats);
  });

  function renderExportHook() {
    return renderHook(() => useExport(mockShowError));
  }

  // ── exportBookings CSV ──────────────────────────────────────────────

  describe('exportBookings CSV', () => {
    it('calls generateCsv with correct columns and downloadCsv', async () => {
      const { result } = renderExportHook();

      await act(async () => {
        await result.current.export('bookings', 'csv');
      });

      expect(mockGetBookings).toHaveBeenCalledOnce();
      expect(mockGetServices).toHaveBeenCalledOnce();
      expect(mockGenerateCsv).toHaveBeenCalledOnce();

      const [data, columns] = mockGenerateCsv.mock.calls[0];
      expect(data).toHaveLength(3);
      expect(columns).toHaveLength(10);

      const headers = columns.map((c: { header: string }) => c.header);
      expect(headers).toEqual([
        'Data',
        'Horário',
        'Cliente',
        'Telefone',
        'Serviços',
        'Duração (min)',
        'Preço Total',
        'Desconto',
        'Valor Final',
        'Status',
      ]);

      // Verify accessor functions produce correct values for first booking
      const firstRow = data[0];
      expect(columns[0].accessor(firstRow)).toBe('2026-01-15');
      expect(columns[1].accessor(firstRow)).toBe('10:30');
      expect(columns[2].accessor(firstRow)).toBe('João Silva');
      expect(columns[3].accessor(firstRow)).toBe('(11) 99999-1111');
      expect(columns[4].accessor(firstRow)).toBe('Corte, Barba');
      expect(columns[5].accessor(firstRow)).toBe(45);
      expect(columns[6].accessor(firstRow)).toBe('R$ 80.00');
      expect(columns[7].accessor(firstRow)).toBe('-R$ 10.00');
      expect(columns[8].accessor(firstRow)).toBe('R$ 70.00');
      expect(columns[9].accessor(firstRow)).toBe('completed');

      expect(mockDownloadCsv).toHaveBeenCalledWith('csv-content', 'agendamentos.csv');
    });

    it('formats discount as empty when no discount', async () => {
      const { result } = renderExportHook();

      await act(async () => {
        await result.current.export('bookings', 'csv');
      });

      const [, columns] = mockGenerateCsv.mock.calls[0];
      const secondRow = mockBookings[1];
      expect(columns[7].accessor(secondRow)).toBe('');
    });

    it('handles missing client data gracefully', async () => {
      const { result } = renderExportHook();

      await act(async () => {
        await result.current.export('bookings', 'csv');
      });

      const [, columns] = mockGenerateCsv.mock.calls[0];
      const thirdRow = mockBookings[2];
      expect(columns[2].accessor(thirdRow)).toBe('');
      expect(columns[3].accessor(thirdRow)).toBe('');
      expect(columns[4].accessor(thirdRow)).toBe('');
    });

    it('maps service_ids to service names via services list', async () => {
      const { result } = renderExportHook();

      await act(async () => {
        await result.current.export('bookings', 'csv');
      });

      const [, columns] = mockGenerateCsv.mock.calls[0];
      expect(columns[4].accessor(mockBookings[0])).toBe('Corte, Barba');
      expect(columns[4].accessor(mockBookings[1])).toBe('Corte');
      expect(columns[4].accessor(mockBookings[2])).toBe('');
    });
  });

  // ── exportBookings XLSX ─────────────────────────────────────────────

  describe('exportBookings XLSX', () => {
    it('calls downloadXlsx with correct sheet structure', async () => {
      const { result } = renderExportHook();

      await act(async () => {
        await result.current.export('bookings', 'xlsx');
      });

      expect(mockDownloadXlsx).toHaveBeenCalledOnce();

      const [sheets, filename] = mockDownloadXlsx.mock.calls[0];
      expect(filename).toBe('agendamentos.xlsx');
      expect(sheets).toHaveLength(1);

      const sheet = sheets[0];
      expect(sheet.name).toBe('Agendamentos');
      expect(sheet.columns).toHaveLength(10);
      expect(sheet.rows).toHaveLength(3);

      // Verify column headers and widths
      expect(sheet.columns.map((c: { header: string }) => c.header)).toEqual([
        'Data',
        'Horário',
        'Cliente',
        'Telefone',
        'Serviços',
        'Duração (min)',
        'Preço Total',
        'Desconto',
        'Valor Final',
        'Status',
      ]);
      expect(sheet.columns.map((c: { width: number }) => c.width)).toEqual([
        14, 10, 25, 16, 35, 14, 14, 14, 14, 12,
      ]);
    });

    it('maps row data correctly in XLSX', async () => {
      const { result } = renderExportHook();

      await act(async () => {
        await result.current.export('bookings', 'xlsx');
      });

      const [sheets] = mockDownloadXlsx.mock.calls[0];
      const firstRow = sheets[0].rows[0];
      expect(firstRow).toEqual([
        '2026-01-15',
        '10:30',
        'João Silva',
        '(11) 99999-1111',
        'Corte, Barba',
        45,
        'R$ 80.00',
        '-R$ 10.00',
        'R$ 70.00',
        'completed',
      ]);
    });

    it('formats zero total_price correctly', async () => {
      const { result } = renderExportHook();

      await act(async () => {
        await result.current.export('bookings', 'xlsx');
      });

      const [sheets] = mockDownloadXlsx.mock.calls[0];
      const thirdRow = sheets[0].rows[2];
      expect(thirdRow[6]).toBe('R$ 0.00');
      expect(thirdRow[8]).toBe('R$ 0.00');
    });
  });

  // ── exportBookings with date filter ─────────────────────────────────

  describe('exportBookings with date filter', () => {
    it('filters bookings by date range', async () => {
      const { result } = renderExportHook();

      await act(async () => {
        await result.current.export('bookings', 'csv', '2026-01-01', '2026-01-31');
      });

      const [data] = mockGenerateCsv.mock.calls[0];
      expect(data).toHaveLength(2);
      expect(data.map((b: { id: string }) => b.id)).toEqual(['b1', 'b3']);
    });

    it('includes date suffix in filename when both dates provided', async () => {
      const { result } = renderExportHook();

      await act(async () => {
        await result.current.export('bookings', 'csv', '2026-01-01', '2026-01-31');
      });

      expect(mockDownloadCsv).toHaveBeenCalledWith(
        'csv-content',
        'agendamentos_2026-01-01_2026-01-31.csv'
      );
    });

    it('filters by start date only', async () => {
      const { result } = renderExportHook();

      await act(async () => {
        await result.current.export('bookings', 'csv', '2026-02-01', undefined);
      });

      const [data] = mockGenerateCsv.mock.calls[0];
      expect(data).toHaveLength(1);
      expect(data[0].id).toBe('b2');
    });

    it('filters by end date only', async () => {
      const { result } = renderExportHook();

      await act(async () => {
        await result.current.export('bookings', 'csv', undefined, '2026-01-20');
      });

      const [data] = mockGenerateCsv.mock.calls[0];
      expect(data).toHaveLength(2);
      expect(data.map((b: { id: string }) => b.id)).toEqual(['b1', 'b3']);
    });

    it('no date filter exports all bookings', async () => {
      const { result } = renderExportHook();

      await act(async () => {
        await result.current.export('bookings', 'csv');
      });

      const [data] = mockGenerateCsv.mock.calls[0];
      expect(data).toHaveLength(3);
    });
  });

  // ── exportClients CSV ───────────────────────────────────────────────

  describe('exportClients CSV', () => {
    it('generates CSV with correct client columns', async () => {
      const { result } = renderExportHook();

      await act(async () => {
        await result.current.export('clients', 'csv');
      });

      expect(mockGetClients).toHaveBeenCalledOnce();
      expect(mockGenerateCsv).toHaveBeenCalledOnce();

      const [data, columns] = mockGenerateCsv.mock.calls[0];
      expect(data).toHaveLength(2);
      expect(columns).toHaveLength(7);

      const headers = columns.map((c: { header: string }) => c.header);
      expect(headers).toEqual([
        'Nome',
        'Telefone',
        'Total de Visitas',
        'Última Visita',
        'Total Gasto',
        'Mensalista',
        'Favorito',
      ]);
    });

    it('formats client data correctly via accessors', async () => {
      const { result } = renderExportHook();

      await act(async () => {
        await result.current.export('clients', 'csv');
      });

      const [, columns] = mockGenerateCsv.mock.calls[0];
      const client = mockClients[0];
      expect(columns[0].accessor(client)).toBe('João Silva');
      expect(columns[1].accessor(client)).toBe('(11) 99999-1111');
      expect(columns[2].accessor(client)).toBe(5);
      expect(columns[3].accessor(client)).toBe('2026-01-15');
      expect(columns[4].accessor(client)).toBe('R$ 400.00');
      expect(columns[5].accessor(client)).toBe('Sim');
      expect(columns[6].accessor(client)).toBe('Não');
    });

    it('formats mensalista and favorito booleans', async () => {
      const { result } = renderExportHook();

      await act(async () => {
        await result.current.export('clients', 'csv');
      });

      const [, columns] = mockGenerateCsv.mock.calls[0];

      // João: is_mensalista=true, is_favorite=false
      expect(columns[5].accessor(mockClients[0])).toBe('Sim');
      expect(columns[6].accessor(mockClients[0])).toBe('Não');

      // Maria: is_mensalista=false, is_favorite=true
      expect(columns[5].accessor(mockClients[1])).toBe('Não');
      expect(columns[6].accessor(mockClients[1])).toBe('Sim');
    });

    it('calls downloadCsv with clientes.csv filename', async () => {
      const { result } = renderExportHook();

      await act(async () => {
        await result.current.export('clients', 'csv');
      });

      expect(mockDownloadCsv).toHaveBeenCalledWith('csv-content', 'clientes.csv');
    });
  });

  // ── exportClients XLSX ──────────────────────────────────────────────

  describe('exportClients XLSX', () => {
    it('calls downloadXlsx with correct sheet structure', async () => {
      const { result } = renderExportHook();

      await act(async () => {
        await result.current.export('clients', 'xlsx');
      });

      expect(mockDownloadXlsx).toHaveBeenCalledOnce();

      const [sheets, filename] = mockDownloadXlsx.mock.calls[0];
      expect(filename).toBe('clientes.xlsx');
      expect(sheets).toHaveLength(1);

      const sheet = sheets[0];
      expect(sheet.name).toBe('Clientes');
      expect(sheet.columns).toHaveLength(7);
      expect(sheet.rows).toHaveLength(2);

      expect(sheet.columns.map((c: { header: string }) => c.header)).toEqual([
        'Nome',
        'Telefone',
        'Total de Visitas',
        'Última Visita',
        'Total Gasto',
        'Mensalista',
        'Favorito',
      ]);
      expect(sheet.columns.map((c: { width: number }) => c.width)).toEqual([
        25, 16, 18, 14, 14, 12, 10,
      ]);
    });

    it('maps client rows correctly', async () => {
      const { result } = renderExportHook();

      await act(async () => {
        await result.current.export('clients', 'xlsx');
      });

      const [sheets] = mockDownloadXlsx.mock.calls[0];
      const firstRow = sheets[0].rows[0];
      expect(firstRow).toEqual([
        'João Silva',
        '(11) 99999-1111',
        5,
        '2026-01-15',
        'R$ 400.00',
        'Sim',
        'Não',
      ]);
    });
  });

  // ── exportFinancial CSV ─────────────────────────────────────────────

  describe('exportFinancial CSV', () => {
    it('aggregates monthly data correctly', async () => {
      const { result } = renderExportHook();

      await act(async () => {
        await result.current.export('financial', 'csv');
      });

      expect(mockGetBookingsForStats).toHaveBeenCalledWith(12);
      expect(mockGenerateCsv).toHaveBeenCalledOnce();

      const [data, columns] = mockGenerateCsv.mock.calls[0];

      // Should have 2 months: 2026-02 and 2026-01 (sorted desc)
      expect(data).toHaveLength(2);

      const headers = columns.map((c: { header: string }) => c.header);
      expect(headers).toEqual([
        'Mês',
        'Agendamentos',
        'Receita',
        'Cancelamentos',
        'Taxa Cancelamento',
      ]);
    });

    it('calculates revenue only from completed bookings', async () => {
      const { result } = renderExportHook();

      await act(async () => {
        await result.current.export('financial', 'csv');
      });

      const [data] = mockGenerateCsv.mock.calls[0];

      // February: 1 completed (100), 1 cancelled → revenue=100
      const feb = data.find(([m]: [string]) => m === '2026-02');
      expect(feb[1].revenue).toBe(100);
      expect(feb[1].count).toBe(2);
      expect(feb[1].cancelled).toBe(1);

      // January: 2 completed (80+50), 1 cancelled → revenue=130
      const jan = data.find(([m]: [string]) => m === '2026-01');
      expect(jan[1].revenue).toBe(130);
      expect(jan[1].count).toBe(3);
      expect(jan[1].cancelled).toBe(1);
    });

    it('calculates cancellation rate correctly via accessor', async () => {
      const { result } = renderExportHook();

      await act(async () => {
        await result.current.export('financial', 'csv');
      });

      const [data, columns] = mockGenerateCsv.mock.calls[0];

      // Taxa Cancelamento accessor (last column)
      const taxaAccessor = columns[4].accessor;

      // February: 1/2 = 50%
      const feb = data.find(([m]: [string]) => m === '2026-02');
      expect(taxaAccessor(feb)).toBe('50.0%');

      // January: 1/3 = 33.3%
      const jan = data.find(([m]: [string]) => m === '2026-01');
      expect(taxaAccessor(jan)).toBe('33.3%');
    });

    it('sorts months in descending order', async () => {
      const { result } = renderExportHook();

      await act(async () => {
        await result.current.export('financial', 'csv');
      });

      const [data] = mockGenerateCsv.mock.calls[0];
      const months = data.map(([m]: [string]) => m);
      expect(months).toEqual(['2026-02', '2026-01']);
    });

    it('calls downloadCsv with financeiro.csv filename', async () => {
      const { result } = renderExportHook();

      await act(async () => {
        await result.current.export('financial', 'csv');
      });

      expect(mockDownloadCsv).toHaveBeenCalledWith('csv-content', 'financeiro.csv');
    });

    it('formats revenue as BRL string via accessor', async () => {
      const { result } = renderExportHook();

      await act(async () => {
        await result.current.export('financial', 'csv');
      });

      const [data, columns] = mockGenerateCsv.mock.calls[0];
      const receitaAccessor = columns[2].accessor;

      const feb = data.find(([m]: [string]) => m === '2026-02');
      expect(receitaAccessor(feb)).toBe('R$ 100.00');

      const jan = data.find(([m]: [string]) => m === '2026-01');
      expect(receitaAccessor(jan)).toBe('R$ 130.00');
    });
  });

  // ── exportFinancial XLSX ────────────────────────────────────────────

  describe('exportFinancial XLSX', () => {
    it('calls downloadXlsx with correct sheet structure', async () => {
      const { result } = renderExportHook();

      await act(async () => {
        await result.current.export('financial', 'xlsx');
      });

      expect(mockDownloadXlsx).toHaveBeenCalledOnce();

      const [sheets, filename] = mockDownloadXlsx.mock.calls[0];
      expect(filename).toBe('financeiro.xlsx');
      expect(sheets).toHaveLength(1);

      const sheet = sheets[0];
      expect(sheet.name).toBe('Financeiro');
      expect(sheet.columns).toHaveLength(5);
      expect(sheet.columns.map((c: { header: string }) => c.header)).toEqual([
        'Mês',
        'Agendamentos',
        'Receita',
        'Cancelamentos',
        'Taxa Cancelamento',
      ]);
      expect(sheet.columns.map((c: { width: number }) => c.width)).toEqual([14, 16, 16, 16, 20]);
    });

    it('maps financial rows correctly', async () => {
      const { result } = renderExportHook();

      await act(async () => {
        await result.current.export('financial', 'xlsx');
      });

      const [sheets] = mockDownloadXlsx.mock.calls[0];
      const rows = sheets[0].rows;

      // Descending order: February first
      expect(rows[0]).toEqual(['2026-02', 2, 'R$ 100.00', 1, '50.0%']);
      expect(rows[1]).toEqual(['2026-01', 3, 'R$ 130.00', 1, '33.3%']);
    });
  });

  // ── exportBookings PDF ──────────────────────────────────────────────

  describe('exportBookings PDF', () => {
    it('calls downloadBookingsPdf with correct data', async () => {
      const { result } = renderExportHook();

      await act(async () => {
        await result.current.export('bookings', 'pdf');
      });

      expect(mockGetBookings).toHaveBeenCalledOnce();
      expect(mockGetServices).toHaveBeenCalledOnce();
      expect(mockDownloadBookingsPdf).toHaveBeenCalledOnce();

      const [data, filename, dateRange] = mockDownloadBookingsPdf.mock.calls[0];
      expect(data).toHaveLength(3);
      expect(filename).toBe('agendamentos');
      expect(dateRange).toBeUndefined();

      // First booking
      expect(data[0]).toMatchObject({
        booking_date: '2026-01-15',
        booking_time: '10:30:00',
        client_name: 'João Silva',
        client_phone: '(11) 99999-1111',
        services: 'Corte, Barba',
        total_price: 80,
        discount_amount: 10,
      });

      // Second booking
      expect(data[1].services).toBe('Corte');
      expect(data[1].total_price).toBe(50);

      // Third booking (no client)
      expect(data[2].client_name).toBe('');
      expect(data[2].services).toBe('');
    });

    it('passes date range as subtitle', async () => {
      const { result } = renderExportHook();

      await act(async () => {
        await result.current.export('bookings', 'pdf', '2026-01-01', '2026-01-31');
      });

      const [data, , dateRange] = mockDownloadBookingsPdf.mock.calls[0];
      expect(data).toHaveLength(2); // Only Jan bookings
      expect(dateRange).toBe('2026-01-01 a 2026-01-31');
    });
  });

  // ── exportClients PDF ───────────────────────────────────────────────

  describe('exportClients PDF', () => {
    it('calls downloadClientsPdf with correct data', async () => {
      const { result } = renderExportHook();

      await act(async () => {
        await result.current.export('clients', 'pdf');
      });

      expect(mockGetClients).toHaveBeenCalledOnce();
      expect(mockDownloadClientsPdf).toHaveBeenCalledOnce();

      const [data, filename] = mockDownloadClientsPdf.mock.calls[0];
      expect(data).toHaveLength(2);
      expect(filename).toBe('clientes');

      expect(data[0]).toMatchObject({
        name: 'João Silva',
        visits: 5,
        total_spent: 400,
        is_mensalista: true,
        is_favorite: false,
      });

      expect(data[1]).toMatchObject({
        name: 'Maria Souza',
        visits: 2,
        total_spent: 100,
        is_mensalista: false,
        is_favorite: true,
      });
    });
  });

  // ── exportFinancial PDF ─────────────────────────────────────────────

  describe('exportFinancial PDF', () => {
    it('calls downloadFinancialPdf with aggregated data', async () => {
      const { result } = renderExportHook();

      await act(async () => {
        await result.current.export('financial', 'pdf');
      });

      expect(mockGetBookingsForStats).toHaveBeenCalledWith(12);
      expect(mockDownloadFinancialPdf).toHaveBeenCalledOnce();

      const [data, filename] = mockDownloadFinancialPdf.mock.calls[0];
      expect(data).toHaveLength(2);
      expect(filename).toBe('financeiro');

      // February first (descending)
      expect(data[0]).toMatchObject({
        month: '2026-02',
        bookings: 2,
        revenue: 100,
        cancelled: 1,
        cancelRate: '50.0%',
      });

      // January second
      expect(data[1]).toMatchObject({
        month: '2026-01',
        bookings: 3,
        revenue: 130,
        cancelled: 1,
        cancelRate: '33.3%',
      });
    });
  });

  // ── isExporting state ───────────────────────────────────────────────

  describe('isExporting', () => {
    it('is false initially', () => {
      const { result } = renderExportHook();
      expect(result.current.isExporting).toBe(false);
    });

    it('is true during export and false after completion', async () => {
      let resolveBookings: (v: unknown) => void;
      mockGetBookings.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveBookings = resolve;
          })
      );

      const { result } = renderExportHook();

      act(() => {
        result.current.export('bookings', 'csv');
      });

      expect(result.current.isExporting).toBe(true);

      await act(async () => {
        resolveBookings!({ data: mockBookings });
        // Need to also resolve getServices
        await vi.waitFor(() => expect(mockGetServices).toHaveBeenCalled());
      });

      expect(result.current.isExporting).toBe(false);
    });

    it('is false after export error', async () => {
      mockGetBookings.mockRejectedValue(new Error('API failure'));

      const { result } = renderExportHook();

      await act(async () => {
        await result.current.export('bookings', 'csv');
      });

      expect(result.current.isExporting).toBe(false);
    });
  });

  // ── Error handling ──────────────────────────────────────────────────

  describe('Error handling', () => {
    it('calls showError on bookings export failure', async () => {
      mockGetBookings.mockRejectedValue(new Error('Network error'));

      const { result } = renderExportHook();

      await act(async () => {
        await result.current.export('bookings', 'csv');
      });

      expect(mockShowError).toHaveBeenCalledWith('Erro ao exportar agendamentos.');
      expect(mockLogError).toHaveBeenCalled();
    });

    it('calls showError on clients export failure', async () => {
      mockGetClients.mockRejectedValue(new Error('Network error'));

      const { result } = renderExportHook();

      await act(async () => {
        await result.current.export('clients', 'csv');
      });

      expect(mockShowError).toHaveBeenCalledWith('Erro ao exportar clientes.');
      expect(mockLogError).toHaveBeenCalled();
    });

    it('calls showError on financial export failure', async () => {
      mockGetBookingsForStats.mockRejectedValue(new Error('Network error'));

      const { result } = renderExportHook();

      await act(async () => {
        await result.current.export('financial', 'csv');
      });

      expect(mockShowError).toHaveBeenCalledWith('Erro ao exportar relatório financeiro.');
      expect(mockLogError).toHaveBeenCalled();
    });
  });

  // ── exportData routing ──────────────────────────────────────────────

  describe('exportData routing', () => {
    it('routes bookings type to exportBookings', async () => {
      const { result } = renderExportHook();

      await act(async () => {
        await result.current.export('bookings', 'csv');
      });

      expect(mockGetBookings).toHaveBeenCalledOnce();
      expect(mockGenerateCsv).toHaveBeenCalledOnce();
    });

    it('routes clients type to exportClients', async () => {
      const { result } = renderExportHook();

      await act(async () => {
        await result.current.export('clients', 'csv');
      });

      expect(mockGetClients).toHaveBeenCalledOnce();
      expect(mockGenerateCsv).toHaveBeenCalledOnce();
    });

    it('routes financial type to exportFinancial', async () => {
      const { result } = renderExportHook();

      await act(async () => {
        await result.current.export('financial', 'csv');
      });

      expect(mockGetBookingsForStats).toHaveBeenCalledWith(12);
      expect(mockGenerateCsv).toHaveBeenCalledOnce();
    });

    it('routes bookings xlsx to downloadXlsx', async () => {
      const { result } = renderExportHook();

      await act(async () => {
        await result.current.export('bookings', 'xlsx');
      });

      expect(mockDownloadXlsx).toHaveBeenCalledOnce();
    });

    it('routes clients xlsx to downloadXlsx', async () => {
      const { result } = renderExportHook();

      await act(async () => {
        await result.current.export('clients', 'xlsx');
      });

      expect(mockDownloadXlsx).toHaveBeenCalledOnce();
    });

    it('routes financial xlsx to downloadXlsx', async () => {
      const { result } = renderExportHook();

      await act(async () => {
        await result.current.export('financial', 'xlsx');
      });

      expect(mockDownloadXlsx).toHaveBeenCalledOnce();
    });

    it('routes bookings pdf to downloadBookingsPdf', async () => {
      const { result } = renderExportHook();

      await act(async () => {
        await result.current.export('bookings', 'pdf');
      });

      expect(mockDownloadBookingsPdf).toHaveBeenCalledOnce();
    });

    it('routes clients pdf to downloadClientsPdf', async () => {
      const { result } = renderExportHook();

      await act(async () => {
        await result.current.export('clients', 'pdf');
      });

      expect(mockDownloadClientsPdf).toHaveBeenCalledOnce();
    });

    it('routes financial pdf to downloadFinancialPdf', async () => {
      const { result } = renderExportHook();

      await act(async () => {
        await result.current.export('financial', 'pdf');
      });

      expect(mockDownloadFinancialPdf).toHaveBeenCalledOnce();
    });
  });
});
