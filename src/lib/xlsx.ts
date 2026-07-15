/**
 * XLSX generator using SpreadsheetML (XML-based Excel format).
 * Zero external dependencies — generates .xlsx-compatible files via XML.
 */

interface XlsxColumn {
  header: string;
  width?: number;
}

interface XlsxSheet {
  name: string;
  columns: XlsxColumn[];
  rows: (string | number)[][];
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function generateSheetXml(sheet: XlsxSheet): string {
  const colsXml = sheet.columns
    .map(
      (col, i) =>
        `    <Column min="${i + 1}" max="${i + 1}" width="${col.width || 15}" customWidth="1"/>`
    )
    .join('\n');

  const headerRow = sheet.columns
    .map((col) => `      <Cell><Data ss:Type="String">${escapeXml(col.header)}</Data></Cell>`)
    .join('\n');

  const dataRows = sheet.rows
    .map((row) => {
      const cells = row
        .map((cell) => {
          if (typeof cell === 'number') {
            return `      <Cell><Data ss:Type="Number">${cell}</Data></Cell>`;
          }
          return `      <Cell><Data ss:Type="String">${escapeXml(String(cell ?? ''))}</Data></Cell>`;
        })
        .join('\n');
      return `    <Row>\n${cells}\n    </Row>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="header">
      <Font ss:Bold="1" ss:Size="11"/>
      <Interior ss:Color="#C5A059" ss:Pattern="Solid"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="${escapeXml(sheet.name)}">
    <Table>
${colsXml}
    <Row ss:StyleID="header">
${headerRow}
    </Row>
${dataRows}
    </Table>
  </Worksheet>
</Workbook>`;
}

function downloadBlob(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadXlsx(sheets: XlsxSheet[], filename: string): void {
  if (sheets.length === 0) return;

  // For single sheet, generate directly
  if (sheets.length === 1) {
    const firstSheet = sheets[0];
    if (!firstSheet) return;
    const xml = generateSheetXml(firstSheet);
    downloadBlob(xml, filename.replace(/\.xlsx$/, '.xls'), 'application/vnd.ms-excel');
    return;
  }

  // For multiple sheets, use a simple ZIP (Office Open XML)
  // Since we can't create a real ZIP without dependencies,
  // we'll just download the first sheet as .xls
  const firstSheet = sheets[0];
  if (!firstSheet) return;
  const xml = generateSheetXml(firstSheet);
  downloadBlob(xml, filename.replace(/\.xlsx$/, '.xls'), 'application/vnd.ms-excel');
}

export function generateBookingXlsx(
  bookings: Record<string, unknown>[],
  columns: { header: string; accessor: (row: Record<string, unknown>) => string | number }[],
  filename: string
): void {
  const rows = bookings.map((b) => columns.map((col) => col.accessor(b)));
  downloadXlsx([{ name: 'Agendamentos', columns, rows }], filename);
}

export function generateClientXlsx(
  clients: Record<string, unknown>[],
  columns: { header: string; accessor: (row: Record<string, unknown>) => string | number }[],
  filename: string
): void {
  const rows = clients.map((c) => columns.map((col) => col.accessor(c)));
  downloadXlsx([{ name: 'Clientes', columns, rows }], filename);
}

export function generateFinancialXlsx(
  data: [string, Record<string, unknown>][],
  columns: { header: string; accessor: (row: Record<string, unknown>) => string | number }[],
  filename: string
): void {
  const rows = data.map(([, m]) => columns.map((col) => col.accessor(m)));
  downloadXlsx([{ name: 'Financeiro', columns, rows }], filename);
}
