import { describe, it, expect } from 'vitest';
import { maskPhone, formatPhone } from './phone';

describe('maskPhone', () => {
  it('masks a complete 11-digit phone', () => {
    expect(maskPhone('11987654321')).toBe('(11) 9****-****');
  });

  it('masks a 10-digit phone (landline)', () => {
    expect(maskPhone('1133334444')).toBe('(11) 9****-****');
  });

  it('masks phone with formatting', () => {
    expect(maskPhone('(11) 98765-4321')).toBe('(11) 9****-****');
  });

  it('returns empty for null', () => {
    expect(maskPhone(null)).toBe('');
  });

  it('returns empty for undefined', () => {
    expect(maskPhone(undefined)).toBe('');
  });

  it('returns empty for empty string', () => {
    expect(maskPhone('')).toBe('');
  });

  it('masks short phone with DDD if it has at least 2 digits', () => {
    // maskPhone extracts DDD from the last 11 digits or uses the full cleaned string
    expect(maskPhone('11')).toBe('(11) 9****-****');
  });

  it('returns empty string when phone has no digits (after cleanup)', () => {
    // maskPhone returns '' when cleaned length is 0
    expect(maskPhone('abc')).toBe('');
  });
});

describe('formatPhone', () => {
  it('formats 11-digit mobile phone', () => {
    expect(formatPhone('11987654321')).toBe('(11) 98765-4321');
  });

  it('formats 10-digit landline phone', () => {
    expect(formatPhone('1133334444')).toBe('(11) 3333-4444');
  });

  it('formats partial phone with just DDD', () => {
    expect(formatPhone('11')).toBe('11');
  });

  it('formats partial phone with DDD + prefix', () => {
    expect(formatPhone('11987')).toBe('(11) 987');
  });

  it('formats partial phone with DDD + prefix without dash', () => {
    expect(formatPhone('1198765')).toBe('(11) 9876-5');
  });

  it('returns empty for null', () => {
    expect(formatPhone(null)).toBe('');
  });

  it('returns empty for undefined', () => {
    expect(formatPhone(undefined)).toBe('');
  });

  it('returns empty for empty string', () => {
    expect(formatPhone('')).toBe('');
  });

  it('trims to 11 digits if longer', () => {
    expect(formatPhone('11987654321123')).toBe('(11) 98765-4321');
  });

  it('strips non-digit characters', () => {
    expect(formatPhone('(11) 98765-4321')).toBe('(11) 98765-4321');
  });
});
