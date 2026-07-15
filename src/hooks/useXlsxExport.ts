import { useState, useCallback } from 'react';
import { getBookings, getBookingsForStats, getClients, getServices } from '../lib/api';
import { downloadXlsx } from '../lib/xlsx';
import { formatDateRange } from '../lib/csv';

/* ─── Export XLSX (XML SpreadsheetML) ───
 * Gera arquivos .xls compativeis com Excel sem dependencias externas.
 * Cada funcao exporta um tipo de dado (agendamentos, clientes, financeiro). */

export function useXlsxExport(showError: (msg: string) => void) {
  const [isExporting, setIsExporting] = useState(false);

  const exportBookings = useCallback(
    async (startDate?: string, endDate?: string) => {
      setIsExporting(true);
      try {
        const { data: bookings } = await getBookings();
        const services = await getServices();

        let filtered = bookings;
        if (startDate) filtered = filtered.filter((b) => b.booking_date >= startDate);
        if (endDate) filtered = filtered.filter((b) => b.booking_date <= endDate);

        const rows = filtered.map((b) => {
          const final = Number(b.total_price) - Number(b.discount_amount || 0);
          return [
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
            `R$ ${final.toFixed(2)}`,
            b.status || '',
          ] as (string | number)[];
        });

        const dateSuffix =
          startDate && endDate ? `_${formatDateRange(new Date(startDate), new Date(endDate))}` : '';
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
          `agendamentos${dateSuffix}.xlsx`
        );
      } catch {
        showError('Erro ao exportar agendamentos.');
      } finally {
        setIsExporting(false);
      }
    },
    [showError]
  );

  const exportClients = useCallback(async () => {
    setIsExporting(true);
    try {
      const clients = await getClients();
      const rows = clients.map(
        (c) =>
          [
            c.name || '',
            c.phone || '',
            c.historical_visits || 0,
            c.last_visit_date || '',
            `R$ ${Number(c.historical_spent || 0).toFixed(2)}`,
            c.is_mensalista ? 'Sim' : 'Não',
            c.is_favorite ? 'Sim' : 'Não',
          ] as (string | number)[]
      );

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
    } catch {
      showError('Erro ao exportar clientes.');
    } finally {
      setIsExporting(false);
    }
  }, [showError]);

  const exportFinancial = useCallback(async () => {
    setIsExporting(true);
    try {
      const stats = await getBookingsForStats(12);

      // Agrupa por mes
      const monthly: Record<string, { count: number; revenue: number; cancelled: number }> = {};
      stats.forEach((b) => {
        const month = b.booking_date?.slice(0, 7) || 'Sem data';
        if (!monthly[month]) monthly[month] = { count: 0, revenue: 0, cancelled: 0 };
        monthly[month].count++;
        if (b.status === 'completed') monthly[month].revenue += Number(b.total_price);
        if (b.status === 'cancelled') monthly[month].cancelled++;
      });

      const entries = Object.entries(monthly).sort((a, b) => b[0].localeCompare(a[0]));
      const rows = entries.map(
        ([month, m]) =>
          [
            month,
            m.count,
            `R$ ${m.revenue.toFixed(2)}`,
            m.cancelled,
            m.count > 0 ? `${((m.cancelled / m.count) * 100).toFixed(1)}%` : '0%',
          ] as (string | number)[]
      );

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
    } catch {
      showError('Erro ao exportar relatório financeiro.');
    } finally {
      setIsExporting(false);
    }
  }, [showError]);

  return { isExporting, exportBookings, exportClients, exportFinancial };
}
