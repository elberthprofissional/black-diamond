import { describe, it, expect } from 'vitest';
import { parseNotifBody, relativeTime } from './notifications';

describe('notifications', () => {
  describe('parseNotifBody', () => {
    it('parses JSON body correctly', () => {
      const body = JSON.stringify({
        clientName: 'Joao Silva',
        services: 'Corte',
        dateTime: '15/07/2026 14:00',
        totalPrice: 'R$ 50,00',
        clientPhone: '31999998888',
        manageUrl: 'https://example.com',
      });
      const result = parseNotifBody(body);
      expect(result).not.toBeNull();
      expect(result!.clientName).toBe('Joao Silva');
      expect(result!.services).toBe('Corte');
    });

    it('removes [MENSALISTA] tag from name', () => {
      const body = JSON.stringify({ clientName: 'Joao [MENSALISTA]' });
      const result = parseNotifBody(body);
      expect(result!.clientName).toBe('Joao');
    });

    it('parses pipe-separated fallback format', () => {
      const body = 'Joao | Corte | 15/07 14:00 | R$ 50 | 3199999 | https://x.com';
      const result = parseNotifBody(body);
      expect(result).not.toBeNull();
      expect(result!.clientName).toBe('Joao');
      expect(result!.services).toBe('Corte');
    });

    it('returns null for invalid body', () => {
      expect(parseNotifBody('short')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(parseNotifBody('')).toBeNull();
    });
  });

  describe('relativeTime', () => {
    it('returns Agora for recent timestamps', () => {
      const now = new Date().toISOString();
      expect(relativeTime(now)).toBe('Agora');
    });

    it('returns minutes for recent times', () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60000).toISOString();
      expect(relativeTime(fiveMinAgo)).toBe('5 min');
    });

    it('returns hours for older times', () => {
      const twoHrsAgo = new Date(Date.now() - 2 * 3600000).toISOString();
      expect(relativeTime(twoHrsAgo)).toBe('2h');
    });

    it('returns Ontem for yesterday', () => {
      const yesterday = new Date(Date.now() - 25 * 3600000).toISOString();
      expect(relativeTime(yesterday)).toBe('Ontem');
    });

    it('returns days for 2-6 days ago', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
      expect(relativeTime(threeDaysAgo)).toBe('3 dias');
    });
  });
});
