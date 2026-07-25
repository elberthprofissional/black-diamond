import { describe, it, expect } from 'vitest';
import { maskName, maskEmail, formatDisplayName } from './masking';

describe('maskName', () => {
  it('masks full name showing only first letter of each part', () => {
    expect(maskName('Felipe Silva')).toBe('F***** S****');
  });

  it('handles single name', () => {
    expect(maskName('Felipe')).toBe('F*****');
  });

  it('returns BLOQUEADO as-is', () => {
    expect(maskName('BLOQUEADO')).toBe('BLOQUEADO');
  });

  it('handles two-letter name part', () => {
    expect(maskName('João Li')).toBe('J*** L*');
  });

  it('handles single letter names', () => {
    expect(maskName('A B')).toBe('A B');
  });

  it('returns empty string for null', () => {
    expect(maskName(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(maskName(undefined)).toBe('');
  });

  it('trims whitespace', () => {
    expect(maskName('  João Silva  ')).toBe('J*** S****');
  });

  it('handles compound surnames', () => {
    expect(maskName('João Silva Santos')).toBe('J*** S**** S*****');
  });
});

describe('maskEmail', () => {
  it('masks first 2 chars of username', () => {
    expect(maskEmail('felipe@email.com')).toBe('fe***@email.com');
  });

  it('handles short username (2 chars)', () => {
    expect(maskEmail('ab@test.com')).toBe('a*@test.com');
  });

  it('handles single char username', () => {
    expect(maskEmail('a@test.com')).toBe('a*@test.com');
  });

  it('returns empty for null', () => {
    expect(maskEmail(null)).toBe('');
  });

  it('returns empty for undefined', () => {
    expect(maskEmail(undefined)).toBe('');
  });

  it('returns fallback for email without @', () => {
    expect(maskEmail('invalid-email')).toBe('***@***.com');
  });

  it('returns fallback for email without domain', () => {
    expect(maskEmail('user@')).toBe('***@***.com');
  });
});

describe('formatDisplayName', () => {
  it('returns first and last name for long names', () => {
    expect(formatDisplayName('Felipe Silva Figueiredo')).toBe('Felipe Figueiredo');
  });

  it('returns full name when has 2 parts', () => {
    expect(formatDisplayName('João Silva')).toBe('João Silva');
  });

  it('returns single name as-is', () => {
    expect(formatDisplayName('Felipe')).toBe('Felipe');
  });

  it('returns empty for null', () => {
    expect(formatDisplayName(null)).toBe('');
  });

  it('returns empty for undefined', () => {
    expect(formatDisplayName(undefined)).toBe('');
  });

  it('trims leading/trailing whitespace but preserves internal spaces for short names', () => {
    // formatDisplayName only trims and splits on /\s+/
    // For 2-part names, it returns name.trim() without normalizing internal spaces
    expect(formatDisplayName('  João  Silva  ')).toBe('João  Silva');
  });
});
