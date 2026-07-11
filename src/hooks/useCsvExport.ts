import { useState, useCallback } from 'react';
import { getBookings, getBookingsForStats, getClients, getServices } from '../lib/api';
import { generateCsv, downloadCsv, formatDateRange } from '../lib/csv';

export function useCsvExport(showError: (msg: string) => void) {
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
            accessor: (b) => {
              const final = Number(b.total_price) - Number(b.discount_amount || 0);
              return `R$ ${final.toFixed(2)}`;
            },
          },
          { header: 'Status', accessor: (b) => b.status },
        ]);

        const dateSuffix =
          startDate && endDate ? `_${formatDateRange(new Date(startDate), new Date(endDate))}` : '';
        downloadCsv(csv, `agendamentos${dateSuffix}.csv`);
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

      // Group by month
      const monthly: Record<string, { count: number; revenue: number; cancelled: number }> = {};
      stats.forEach((b) => {
        const month = b.booking_date?.slice(0, 7) || 'Sem data';
        if (!monthly[month]) monthly[month] = { count: 0, revenue: 0, cancelled: 0 };
        monthly[month].count++;
        if (b.status === 'completed') monthly[month].revenue += Number(b.total_price);
        if (b.status === 'cancelled') monthly[month].cancelled++;
      });

      const csv = generateCsv(
        Object.entries(monthly).sort((a, b) => b[0].localeCompare(a[0])),
        [
          { header: 'Mês', accessor: ([month]) => month },
          { header: 'Agendamentos', accessor: ([, m]) => m.count },
          { header: 'Receita', accessor: ([, m]) => `R$ ${m.revenue.toFixed(2)}` },
          { header: 'Cancelamentos', accessor: ([, m]) => m.cancelled },
          {
            header: 'Taxa Cancelamento',
            accessor: ([, m]) =>
              m.count > 0 ? `${((m.cancelled / m.count) * 100).toFixed(1)}%` : '0%',
          },
        ]
      );

      downloadCsv(csv, 'financeiro.csv');
    } catch {
      showError('Erro ao exportar relatório financeiro.');
    } finally {
      setIsExporting(false);
    }
  }, [showError]);

  return {
    isExporting,
    exportBookings,
    exportClients,
    exportFinancial,
  };
}
