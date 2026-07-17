import { describe, it, expect } from 'vitest';
import { generateCsv, type CsvColumn } from './csv';

describe('csv', () => {
  describe('generateCsv', () => {
    const columns: CsvColumn<{ name: string; age: number }>[] = [
      { header: 'Nome', accessor: (r) => r.name },
      { header: 'Idade', accessor: (r) => r.age },
    ];

    it('generates CSV with header and rows', () => {
      const data = [{ name: 'Joao', age: 30 }];
      const csv = generateCsv(data, columns);
      expect(csv).toContain('Nome;Idade');
      expect(csv).toContain('Joao;30');
    });

    it('handles empty data', () => {
      const csv = generateCsv([], columns);
      expect(csv).toBe('Nome;Idade');
    });

    it('escapes values containing separator', () => {
      const cols: CsvColumn<{ val: string }>[] = [{ header: 'Val', accessor: (r) => r.val }];
      const csv = generateCsv([{ val: 'a;b' }], cols);
      expect(csv).toContain('"a;b"');
    });

    it('escapes values containing double quotes', () => {
      const cols: CsvColumn<{ val: string }>[] = [{ header: 'Val', accessor: (r) => r.val }];
      const csv = generateCsv([{ val: 'say "hello"' }], cols);
      expect(csv).toContain('"say ""hello"""');
    });

    it('prevents CSV injection', () => {
      const cols: CsvColumn<{ val: string }>[] = [{ header: 'Val', accessor: (r) => r.val }];
      const csv = generateCsv([{ val: '=SUM(A1)' }], cols);
      expect(csv).toContain("'=SUM(A1)");
    });

    it('handles null/undefined values', () => {
      const cols: CsvColumn<{ val: string | null }>[] = [{ header: 'Val', accessor: (r) => r.val }];
      const csv = generateCsv([{ val: null }], cols);
      expect(csv).toContain('Val');
    });

    it('uses custom separator', () => {
      const data = [{ name: 'Joao', age: 30 }];
      const csv = generateCsv(data, columns, ',');
      expect(csv).toContain('Nome,Idade');
      expect(csv).toContain('Joao,30');
    });
  });
});
