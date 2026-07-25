import { describe, it, expect } from 'vitest';
import {
  formatPrice,
  formatDiscount,
  formatPriceAdmin,
  formatPricePublic,
  formatPriceWhatsApp,
} from './price';

describe('formatPrice', () => {
  it('formats integer price without decimals by default', () => {
    expect(formatPrice(45)).toBe('R$ 45');
  });

  it('formats with decimals when option is set', () => {
    expect(formatPrice(45, { decimals: true })).toBe('R$ 45,00');
  });

  it('formats string price', () => {
    expect(formatPrice('45')).toBe('R$ 45');
  });

  it('formats zero', () => {
    expect(formatPrice(0)).toBe('R$ 0');
  });

  it('handles null', () => {
    expect(formatPrice(null)).toBe('R$ 0');
  });

  it('handles undefined', () => {
    expect(formatPrice(undefined)).toBe('R$ 0');
  });

  it('handles NaN via string', () => {
    expect(formatPrice('not-a-number')).toBe('R$ 0');
  });

  it('formats with compact for thousands', () => {
    expect(formatPrice(1500, { compact: true })).toBe('R$2k');
  });

  it('does not compact values below 1000', () => {
    expect(formatPrice(999, { compact: true })).toBe('R$ 999');
  });

  it('formats with locale and decimals', () => {
    const result = formatPrice(1250.5, { locale: true, decimals: true });
    expect(result).toMatch(/^R\$ /);
    expect(result).toContain('1.250');
  });

  it('formats with locale without decimals', () => {
    const result = formatPrice(1250.5, { locale: true });
    expect(result).toMatch(/^R\$ /);
  });

  it('handles decimal cents correctly', () => {
    expect(formatPrice(45.9, { decimals: true })).toBe('R$ 45,90');
  });
});

describe('formatDiscount', () => {
  it('formats discount with OFF suffix', () => {
    expect(formatDiscount(10)).toBe('-R$ 10 OFF');
  });

  it('formats discount with decimals', () => {
    expect(formatDiscount(10.5, { decimals: true })).toBe('-R$ 10,50');
  });

  it('returns empty for zero discount', () => {
    expect(formatDiscount(0)).toBe('');
  });

  it('returns empty for negative discount', () => {
    expect(formatDiscount(-5)).toBe('');
  });

  it('handles null', () => {
    expect(formatDiscount(null)).toBe('');
  });

  it('handles undefined', () => {
    expect(formatDiscount(undefined)).toBe('');
  });

  it('handles string input', () => {
    expect(formatDiscount('15')).toBe('-R$ 15 OFF');
  });
});

describe('formatPriceAdmin', () => {
  it('always shows decimals', () => {
    expect(formatPriceAdmin(50)).toBe('R$ 50,00');
  });
});

describe('formatPricePublic', () => {
  it('hides decimals for whole numbers', () => {
    expect(formatPricePublic(50)).toBe('R$ 50');
  });
});

describe('formatPriceWhatsApp', () => {
  it('formats with decimals and locale', () => {
    const result = formatPriceWhatsApp(45);
    expect(result).toMatch(/^R\$ /);
  });
});
