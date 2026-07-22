import { useState, useCallback } from 'react';
import { getBookings, getBookingsForStats, getClients, getServices } from '../lib/api';
import { generateCsv, downloadCsv, formatDateRange } from '../lib/csv';
import { downloadXlsx } from '../lib/xlsx';
import { downloadBookingsPdf, downloadClientsPdf, downloadFinancialPdf } from '../lib/pdf';
import { logError } from '../lib/logger';

export type ExportFormat = 'csv' | 'xlsx' | 'pdf';
export type ExportType = 'bookings' | 'clients' | 'financial';

export function useExport(showError: (msg: string) => void) {
  const [isExporting, setIsExporting] = useState(false);

  const exportBookings = useCallback(
    async (format: ExportFormat, startDate?: string, endDate?: string) => {
      setIsExporting(true);
      try {
        const { data: bookings } = await getBookings();
        const services = await getServices();

        let filtered = bookings;
        if (startDate) filtered = filtered.filter((b) => b.booking_date >= startDate);
        if (endDate) filtered = filtered.filter((b) => b.booking_date <= endDate);

        const dateSuffix =
          startDate && endDate ? `_${formatDateRange(new Date(startDate), new Date(endDate))}` : '';
        const filename = `agendamentos${dateSuffix}`;

        if (format === 'csv') {
          const csv = generateCsv(filtered, [
            { header: 'Data', accessor: (b) => b.booking_date },
            { header: 'Horário', accessor: (b) => b.booking_time?.slice(0, 5) },
            { header: 'Cliente', accessor: (b) => b.clients?.name || '' },
            { header: 'Telefone', accessor: (b) => b.clients?.phone || '' },
            {
              header: 'Serviços',
              accessor: (b) =>
                (b.service_ids || [])
                  .map((id: string) => services.find((s) => s.id === id)?.name || id)
                  .join(', '),
            },
            { header: 'Duração (min)', accessor: (b) => b.total_duration },
            { header: 'Preço Total', accessor: (b) => `R$ ${Number(b.total_price).toFixed(2)}` },
            {
              header: 'Desconto',
              accessor: (b) =>
                b.discount_amount ? `-R$ ${Number(b.discount_amount).toFixed(2)}` : '',
            },
            {
              header: 'Valor Final',
              accessor: (b) =>
                `R$ ${(Number(b.total_price) - Number(b.discount_amount || 0)).toFixed(2)}`,
            },
            { header: 'Status', accessor: (b) => b.status },
          ]);
          downloadCsv(csv, `${filename}.csv`);
        } else if (format === 'xlsx') {
          const rows = filtered.map((b) => [
            b.booking_date || '',
            b.booking_time?.slice(0, 5) || '',
            b.clients?.name || '',
            b.clients?.phone || '',
            (b.service_ids || [])
              .map((id: string) => services.find((s) => s.id === id)?.name || id)
              .join(', '),
            b.total_duration || 0,
            `R$ ${Number(b.total_price).toFixed(2)}`,
            b.discount_amount ? `-R$ ${Number(b.discount_amount).toFixed(2)}` : '',
            `R$ ${(Number(b.total_price) - Number(b.discount_amount || 0)).toFixed(2)}`,
            b.status || '',
          ]);
          downloadXlsx(
            [
              {
                name: 'Agendamentos',
                columns: [
                  { header: 'Data', width: 14 },
                  { header: 'Horário', width: 10 },
                  { header: 'Cliente', width: 25 },
                  { header: 'Telefone', width: 16 },
                  { header: 'Serviços', width: 35 },
                  { header: 'Duração (min)', width: 14 },
                  { header: 'Preço Total', width: 14 },
                  { header: 'Desconto', width: 14 },
                  { header: 'Valor Final', width: 14 },
                  { header: 'Status', width: 12 },
                ],
                rows,
              },
            ],
            `${filename}.xlsx`
          );
        } else {
          // PDF format
          const dateSuffix =
            startDate && endDate
              ? `_${formatDateRange(new Date(startDate), new Date(endDate))}`
              : '';
          downloadBookingsPdf(
            filtered.map((b) => ({
              booking_date: b.booking_date || '',
              booking_time: b.booking_time || '',
              client_name: b.clients?.name || '',
              client_phone: b.clients?.phone || '',
              services: (b.service_ids || [])
                .map((id: string) => services.find((s) => s.id === id)?.name || id)
                .join(', '),
              total_price: Number(b.total_price) || 0,
              discount_amount: Number(b.discount_amount || 0),
              status: b.status || '',
            })),
            `agendamentos${dateSuffix}`,
            startDate && endDate ? `${startDate} a ${endDate}` : undefined
          );
        }
      } catch (e) {
        logError(e);
        showError('Erro ao exportar agendamentos.');
      } finally {
        setIsExporting(false);
      }
    },
    [showError]
  );

  const exportClients = useCallback(
    async (format: ExportFormat) => {
      setIsExporting(true);
      try {
        const clients = await getClients();

        if (format === 'csv') {
          const csv = generateCsv(clients, [
            { header: 'Nome', accessor: (c) => c.name },
            { header: 'Telefone', accessor: (c) => c.phone },
            { header: 'Total de Visitas', accessor: (c) => c.historical_visits || 0 },
            { header: 'Última Visita', accessor: (c) => c.last_visit_date || '' },
            {
              header: 'Total Gasto',
              accessor: (c) => `R$ ${Number(c.historical_spent || 0).toFixed(2)}`,
            },
            { header: 'Mensalista', accessor: (c) => (c.is_mensalista ? 'Sim' : 'Não') },
            { header: 'Favorito', accessor: (c) => (c.is_favorite ? 'Sim' : 'Não') },
          ]);
          downloadCsv(csv, 'clientes.csv');
        } else if (format === 'xlsx') {
          const rows = clients.map((c) => [
            c.name || '',
            c.phone || '',
            c.historical_visits || 0,
            c.last_visit_date || '',
            `R$ ${Number(c.historical_spent || 0).toFixed(2)}`,
            c.is_mensalista ? 'Sim' : 'Não',
            c.is_favorite ? 'Sim' : 'Não',
          ]);
          downloadXlsx(
            [
              {
                name: 'Clientes',
                columns: [
                  { header: 'Nome', width: 25 },
                  { header: 'Telefone', width: 16 },
                  { header: 'Total de Visitas', width: 18 },
                  { header: 'Última Visita', width: 14 },
                  { header: 'Total Gasto', width: 14 },
                  { header: 'Mensalista', width: 12 },
                  { header: 'Favorito', width: 10 },
                ],
                rows,
              },
            ],
            'clientes.xlsx'
          );
        } else {
          // PDF format
          downloadClientsPdf(
            clients.map((c) => ({
              name: c.name || '',
              phone: c.phone || '',
              visits: c.historical_visits || 0,
              last_visit: c.last_visit_date || '',
              total_spent: Number(c.historical_spent || 0),
              is_mensalista: !!c.is_mensalista,
              is_favorite: !!c.is_favorite,
            })),
            'clientes'
          );
        }
      } catch (e) {
        logError(e);
        showError('Erro ao exportar clientes.');
      } finally {
        setIsExporting(false);
      }
    },
    [showError]
  );

  const exportFinancial = useCallback(
    async (format: ExportFormat) => {
      setIsExporting(true);
      try {
        const stats = await getBookingsForStats(12);
        const monthly: Record<string, { count: number; revenue: number; cancelled: number }> = {};
        stats.forEach((b) => {
          const month = b.booking_date?.slice(0, 7) || 'Sem data';
          if (!monthly[month]) monthly[month] = { count: 0, revenue: 0, cancelled: 0 };
          monthly[month].count++;
          if (b.status === 'completed') monthly[month].revenue += Number(b.total_price);
          if (b.status === 'cancelled') monthly[month].cancelled++;
        });

        const entries = Object.entries(monthly).sort((a, b) => b[0].localeCompare(a[0]));

        if (format === 'csv') {
          const csv = generateCsv(entries, [
            { header: 'Mês', accessor: ([month]) => month },
            { header: 'Agendamentos', accessor: ([, m]) => m.count },
            { header: 'Receita', accessor: ([, m]) => `R$ ${m.revenue.toFixed(2)}` },
            { header: 'Cancelamentos', accessor: ([, m]) => m.cancelled },
            {
              header: 'Taxa Cancelamento',
              accessor: ([, m]) =>
                m.count > 0 ? `${((m.cancelled / m.count) * 100).toFixed(1)}%` : '0%',
            },
          ]);
          downloadCsv(csv, 'financeiro.csv');
        } else if (format === 'xlsx') {
          const rows = entries.map(([month, m]) => [
            month,
            m.count,
            `R$ ${m.revenue.toFixed(2)}`,
            m.cancelled,
            m.count > 0 ? `${((m.cancelled / m.count) * 100).toFixed(1)}%` : '0%',
          ]);
          downloadXlsx(
            [
              {
                name: 'Financeiro',
                columns: [
                  { header: 'Mês', width: 14 },
                  { header: 'Agendamentos', width: 16 },
                  { header: 'Receita', width: 16 },
                  { header: 'Cancelamentos', width: 16 },
                  { header: 'Taxa Cancelamento', width: 20 },
                ],
                rows,
              },
            ],
            'financeiro.xlsx'
          );
        } else {
          // PDF format
          downloadFinancialPdf(
            entries.map(([month, m]) => ({
              month,
              bookings: m.count,
              revenue: m.revenue,
              cancelled: m.cancelled,
              cancelRate: m.count > 0 ? `${((m.cancelled / m.count) * 100).toFixed(1)}%` : '0%',
            })),
            'financeiro'
          );
        }
      } catch (e) {
        logError(e);
        showError('Erro ao exportar relatório financeiro.');
      } finally {
        setIsExporting(false);
      }
    },
    [showError]
  );

  const exportData = useCallback(
    async (type: ExportType, format: ExportFormat, startDate?: string, endDate?: string) => {
      switch (type) {
        case 'bookings':
          return exportBookings(format, startDate, endDate);
        case 'clients':
          return exportClients(format);
        case 'financial':
          return exportFinancial(format);
      }
    },
    [exportBookings, exportClients, exportFinancial]
  );

  return { isExporting, export: exportData };
}
