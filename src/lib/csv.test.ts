import { describe, it, expect } from 'vitest';
import { generateCsv, formatDateRange } from './csv';

describe('generateCsv', () => {
  interface Person {
    name: string;
    age: number;
  }

  const columns = [
    { header: 'Nome', accessor: (p: Person) => p.name },
    { header: 'Idade', accessor: (p: Person) => p.age },
  ];

  it('generates CSV with header and rows', () => {
    const data: Person[] = [
      { name: 'João', age: 30 },
      { name: 'Maria', age: 25 },
    ];

    const csv = generateCsv(data, columns);
    const lines = csv.split('\r\n');

    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe('Nome;Idade');
    expect(lines[1]).toBe('João;30');
    expect(lines[2]).toBe('Maria;25');
  });

  it('sanitizes CSV injection attempts', () => {
    const data: Person[] = [{ name: '=SUM(1,1)', age: 30 }];

    const csv = generateCsv(data, columns);
    expect(csv).toContain("'=SUM(1,1)");
  });

  it('escapes double quotes in values', () => {
    const data: Person[] = [{ name: 'João "Jão" Silva', age: 30 }];

    const csv = generateCsv(data, columns);
    expect(csv).toContain('"João ""Jão"" Silva"');
  });

  it('wraps values containing separator in quotes', () => {
    const cols = [{ header: 'Nome', accessor: (p: Person) => p.name }];
    const data: Person[] = [{ name: 'João;Silva', age: 30 }];

    const csv = generateCsv(data, cols);
    expect(csv).toContain('"João;Silva"');
  });

  it('handles null and undefined values', () => {
    const data = [{ name: null, age: undefined }] as unknown as Person[];

    const csv = generateCsv(data, columns);
    expect(csv).toContain(';');
  });

  it('handles empty data', () => {
    const csv = generateCsv([], columns);
    expect(csv).toBe('Nome;Idade');
  });
});

describe('formatDateRange', () => {
  it('formats date range as YYYYMMDD-YYYYMMDD', () => {
    const start = new Date(2026, 0, 1);
    const end = new Date(2026, 6, 31);
    expect(formatDateRange(start, end)).toBe('20260101-20260731');
  });

  it('pads single digit months and days', () => {
    const start = new Date(2026, 0, 5);
    const end = new Date(2026, 1, 1);
    expect(formatDateRange(start, end)).toBe('20260105-20260201');
  });
});
