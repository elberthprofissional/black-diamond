export interface CsvColumn<T> {
  header: string;
  accessor: (row: T) => string | number | null | undefined;
}

/** Gera uma string CSV a partir de dados e colunas. */
export function generateCsv<T>(data: T[], columns: CsvColumn<T>[], separator = ';'): string {
  const header = columns.map((c) => c.header).join(separator);
  const rows = data.map((row) =>
    columns
      .map((c) => {
        const val = c.accessor(row);
        const str = String(val ?? '');
        // Escapa aspas duplas e envolve em aspas se contiver o separador
        if (str.includes(separator) || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      })
      .join(separator)
  );
  return [header, ...rows].join('\r\n');
}

/** Faz download de um blob CSV no navegador. */
export function downloadCsv(content: string, filename: string): void {
  const BOM = '\uFEFF'; // UTF-8 BOM para Excel abrir acentos corretamente
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;separator=;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Formata período para nome de arquivo (ex: 20260101-20260731). */
export function formatDateRange(start: Date, end: Date): string {
  const fmt = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}${m}${day}`;
  };
  return `${fmt(start)}-${fmt(end)}`;
}
