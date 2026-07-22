/**
 * PDF generator for exporting reports.
 * Uses jsPDF + jspdf-autotable for professional-looking PDFs.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PdfColumn {
  header: string;
  dataKey: string;
}

interface PdfRow {
  [key: string]: string | number;
}

interface PdfReportOptions {
  title: string;
  subtitle?: string;
  filename: string;
  columns: PdfColumn[];
  rows: PdfRow[];
  footerText?: string;
}

function formatDate(): string {
  return new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Gera um PDF formatado com tabela e faz o download.
 * Design profissional com cabeçalho dourado e rodapé.
 */
export function downloadPdf(options: PdfReportOptions): void {
  const { title, subtitle, filename, columns, rows, footerText } = options;

  // Cria documento A4
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();

  // ── Cabeçalho ────────────────────────────────────────────────────
  doc.setFillColor(26, 26, 26); // #1A1A1A
  doc.rect(0, 0, pageWidth, 40, 'F');

  // Linha dourada decorativa
  doc.setFillColor(212, 175, 55); // #D4AF37
  doc.rect(0, 38, pageWidth, 1.5, 'F');

  // Título
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text(title, 14, 22);

  // Logo / nome da barbearia
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(212, 175, 55);
  doc.text('BLACK DIAMOND', pageWidth - 14, 16, { align: 'right' });

  // Subtítulo
  if (subtitle) {
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(subtitle, pageWidth - 14, 22, { align: 'right' });
  }

  // Data de exportação
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(130, 130, 130);
  doc.text(`Exportado em: ${formatDate()}`, pageWidth - 14, 28, { align: 'right' });

  const yStart = 48;

  // ── Tabela ───────────────────────────────────────────────────────
  const tableColumns = columns.map((col) => ({ header: col.header, dataKey: col.dataKey }));
  const tableRows = rows.map((row) => {
    const r: Record<string, string | number> = {};
    columns.forEach((col) => {
      r[col.dataKey] = row[col.dataKey] ?? '';
    });
    return r;
  });

  // Se não há dados, mostra mensagem
  if (rows.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text('Nenhum registro encontrado.', pageWidth / 2, yStart + 20, { align: 'center' });
  } else {
    autoTable(doc, {
      startY: yStart,
      head: [tableColumns.map((c) => c.header)],
      body: tableRows.map((r) =>
        tableColumns.map((c) => r[c.dataKey] as string | number)
      ) as unknown as never[],
      theme: 'grid',
      headStyles: {
        fillColor: [212, 175, 55],
        textColor: [26, 26, 26],
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'center',
      },
      bodyStyles: {
        fontSize: 8.5,
        textColor: [220, 220, 220],
        lineColor: [60, 60, 60],
        lineWidth: 0.1,
      },
      alternateRowStyles: {
        fillColor: [30, 30, 30],
      },
      styles: {
        cellPadding: 3,
        valign: 'middle',
      },
      margin: { left: 14, right: 14 },
      didParseCell: (data) => {
        // Células do cabeçalho centralizadas
        if (data.section === 'head') {
          data.cell.styles.halign = 'center';
        }
      },
    });
  }

  // ── Rodapé ───────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    const pageHeight = doc.internal.pageSize.getHeight();

    // Linha separadora
    doc.setDrawColor(60, 60, 60);
    doc.line(14, pageHeight - 14, pageWidth - 14, pageHeight - 14);

    // Texto do rodapé
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(130, 130, 130);

    if (footerText) {
      doc.text(footerText, 14, pageHeight - 8);
    }

    // Número da página
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - 14, pageHeight - 8, { align: 'right' });

    // Logo no rodapé
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(212, 175, 55);
    doc.text('Black Diamond 💈', pageWidth / 2, pageHeight - 8, { align: 'center' });
  }

  // ── Download ─────────────────────────────────────────────────────
  const cleanFilename = filename.replace(/[^a-zA-Z0-9_\-.]/g, '_').replace(/\.pdf$/i, '') + '.pdf';
  doc.save(cleanFilename);
}

/**
 * Gera PDF de agendamentos.
 */
export function downloadBookingsPdf(
  bookings: Array<{
    booking_date: string;
    booking_time: string;
    client_name: string;
    client_phone: string;
    services: string;
    total_price: number;
    discount_amount?: number;
    status: string;
  }>,
  filename: string,
  dateRange?: string
): void {
  const columns: PdfColumn[] = [
    { header: 'Data', dataKey: 'date' },
    { header: 'Horário', dataKey: 'time' },
    { header: 'Cliente', dataKey: 'client' },
    { header: 'Telefone', dataKey: 'phone' },
    { header: 'Serviços', dataKey: 'services' },
    { header: 'Valor', dataKey: 'value' },
    { header: 'Status', dataKey: 'status' },
  ];

  const rows = bookings.map((b) => ({
    date: b.booking_date || '',
    time: b.booking_time?.slice(0, 5) || '',
    client: b.client_name || '',
    phone: b.client_phone || '',
    services: b.services || '',
    value: `R$ ${(Number(b.total_price) - Number(b.discount_amount || 0)).toFixed(2)}`,
    status: translateStatus(b.status),
  }));

  downloadPdf({
    title: 'Relatório de Agendamentos',
    subtitle: dateRange || 'Todos os agendamentos',
    filename,
    columns,
    rows,
    footerText: 'Relatório gerado pelo Black Diamond Admin',
  });
}

/**
 * Gera PDF de clientes.
 */
export function downloadClientsPdf(
  clients: Array<{
    name: string;
    phone: string;
    visits: number;
    last_visit: string;
    total_spent: number;
    is_mensalista: boolean;
    is_favorite: boolean;
  }>,
  filename: string
): void {
  const columns: PdfColumn[] = [
    { header: 'Nome', dataKey: 'name' },
    { header: 'Telefone', dataKey: 'phone' },
    { header: 'Visitas', dataKey: 'visits' },
    { header: 'Última Visita', dataKey: 'lastVisit' },
    { header: 'Total Gasto', dataKey: 'spent' },
    { header: 'Tipo', dataKey: 'type' },
  ];

  const rows = clients.map((c) => ({
    name: c.name || '',
    phone: c.phone || '',
    visits: c.visits || 0,
    lastVisit: c.last_visit || '-',
    spent: `R$ ${Number(c.total_spent || 0).toFixed(2)}`,
    type: c.is_mensalista ? 'Mensalista' : c.is_favorite ? 'Favorito' : 'Regular',
  }));

  downloadPdf({
    title: 'Relatório de Clientes',
    subtitle: 'Base completa de clientes',
    filename,
    columns,
    rows,
    footerText: 'Relatório gerado pelo Black Diamond Admin',
  });
}

/**
 * Gera PDF financeiro mensal.
 */
export function downloadFinancialPdf(
  months: Array<{
    month: string;
    bookings: number;
    revenue: number;
    cancelled: number;
    cancelRate: string;
  }>,
  filename: string
): void {
  const columns: PdfColumn[] = [
    { header: 'Mês', dataKey: 'month' },
    { header: 'Agendamentos', dataKey: 'bookings' },
    { header: 'Receita', dataKey: 'revenue' },
    { header: 'Cancelamentos', dataKey: 'cancelled' },
    { header: 'Taxa Cancel.', dataKey: 'cancelRate' },
  ];

  const rows = months.map((m) => ({
    month: m.month || '',
    bookings: m.bookings || 0,
    revenue: `R$ ${Number(m.revenue || 0).toFixed(2)}`,
    cancelled: m.cancelled || 0,
    cancelRate: m.cancelRate || '0%',
  }));

  downloadPdf({
    title: 'Relatório Financeiro',
    subtitle: 'Receita e cancelamentos por mês',
    filename,
    columns,
    rows,
    footerText: 'Relatório gerado pelo Black Diamond Admin',
  });
}

function translateStatus(status: string): string {
  const map: Record<string, string> = {
    pending: 'Pendente',
    confirmed: 'Confirmado',
    completed: 'Concluído',
    cancelled: 'Cancelado',
  };
  return map[status] || status;
}
