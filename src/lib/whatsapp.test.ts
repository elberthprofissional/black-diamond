import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  cleanPhoneForWhatsApp,
  buildWhatsAppUrl,
  openWhatsApp,
  formatWaDate,
  formatWaTime,
  formatWaCurrency,
} from './whatsapp';

describe('whatsapp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.open = vi.fn() as unknown as typeof window.open;
  });

  describe('cleanPhoneForWhatsApp', () => {
    it('adds country code if missing', () => {
      expect(cleanPhoneForWhatsApp('31980159559')).toBe('5531980159559');
    });

    it('keeps country code if present', () => {
      expect(cleanPhoneForWhatsApp('5531980159559')).toBe('5531980159559');
    });

    it('strips non-digit characters', () => {
      expect(cleanPhoneForWhatsApp('(31) 98015-9559')).toBe('5531980159559');
    });
  });

  describe('buildWhatsAppUrl', () => {
    it('builds URL with phone and encoded message', () => {
      const url = buildWhatsAppUrl('31980159559', 'Ola mundo');
      expect(url).toContain('wa.me/5531980159559');
      expect(url).toContain('text=Ola%20mundo');
    });

    it('encodes special characters', () => {
      const url = buildWhatsAppUrl('31999998888', 'Corte R$ 50,00');
      expect(url).toContain('text=');
    });
  });

  describe('openWhatsApp', () => {
    it('opens WhatsApp in new tab', () => {
      openWhatsApp('31980159559', 'Mensagem teste');
      expect(window.open).toHaveBeenCalledWith(expect.stringContaining('wa.me/'), '_blank');
    });
  });

  describe('formatWaDate', () => {
    it('formats date from YYYY-MM-DD to DD/MM/YYYY', () => {
      expect(formatWaDate('2026-07-15')).toBe('15/07/2026');
    });
  });

  describe('formatWaTime', () => {
    it('truncates time to HH:MM', () => {
      expect(formatWaTime('14:30:00')).toBe('14:30');
    });

    it('keeps HH:MM as-is', () => {
      expect(formatWaTime('09:00')).toBe('09:00');
    });
  });

  describe('formatWaCurrency', () => {
    it('formats number as BRL', () => {
      expect(formatWaCurrency(50)).toBe('R$ 50,00');
    });

    it('formats decimal values', () => {
      expect(formatWaCurrency(35.5)).toBe('R$ 35,50');
    });
  });
});
