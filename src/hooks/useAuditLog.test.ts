import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// O useAuditLog agora chama insertAuditLog de lib/api/audit (que é um no-op)
const mockInsertAuditLog = vi.fn();

vi.mock('../lib/api/audit', () => ({
  insertAuditLog: (...args: unknown[]) => mockInsertAuditLog(...args),
}));

import { useAuditLog } from './useAuditLog';

describe('useAuditLog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsertAuditLog.mockResolvedValue(undefined);
  });

  it('returns log, logLogin, and logBooking functions', () => {
    const { result } = renderHook(() => useAuditLog());
    expect(typeof result.current.log).toBe('function');
    expect(typeof result.current.logLogin).toBe('function');
    expect(typeof result.current.logBooking).toBe('function');
  });

  // ── log ──────────────────────────────────────────────────────────────────────

  describe('log', () => {
    it('chama insertAuditLog com action e details', async () => {
      const { result } = renderHook(() => useAuditLog());
      await result.current.log({ action: 'login_success', details: { email: 'test@test.com' } });

      expect(mockInsertAuditLog).toHaveBeenCalledWith({
        action: 'login_success',
        details: { email: 'test@test.com' },
      });
    });

    it('chama insertAuditLog com target_id quando fornecido', async () => {
      const { result } = renderHook(() => useAuditLog());
      await result.current.log({ action: 'booking_created', target_id: 'booking-1' });

      expect(mockInsertAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'booking_created',
          target_id: 'booking-1',
        })
      );
    });

    it('propaga erro quando insertAuditLog falha', async () => {
      mockInsertAuditLog.mockRejectedValue(new Error('DB error'));
      const { result } = renderHook(() => useAuditLog());

      await expect(result.current.log({ action: 'login_success' })).rejects.toThrow('DB error');
    });
  });

  // ── logLogin ────────────────────────────────────────────────────────────────

  describe('logLogin', () => {
    it('chama insertAuditLog com login_success', async () => {
      const { result } = renderHook(() => useAuditLog());
      await result.current.logLogin(true, 'admin@test.com');

      expect(mockInsertAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'login_success',
          details: { email: 'admin@test.com' },
        })
      );
    });

    it('chama insertAuditLog com login_failed', async () => {
      const { result } = renderHook(() => useAuditLog());
      await result.current.logLogin(false, 'bad@test.com');

      expect(mockInsertAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'login_failed',
          details: { email: 'bad@test.com' },
        })
      );
    });
  });

  // ── logBooking ──────────────────────────────────────────────────────────────

  describe('logBooking', () => {
    it('chama insertAuditLog com booking_created', async () => {
      const { result } = renderHook(() => useAuditLog());
      await result.current.logBooking('booking_created', 'b-1', { service: 'Haircut' });

      expect(mockInsertAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'booking_created',
          target_id: 'b-1',
          details: { service: 'Haircut' },
        })
      );
    });

    it('chama insertAuditLog com booking_cancelled', async () => {
      const { result } = renderHook(() => useAuditLog());
      await result.current.logBooking('booking_cancelled', 'b-3');

      expect(mockInsertAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'booking_cancelled',
          target_id: 'b-3',
        })
      );
    });

    it('chama insertAuditLog com thank_you_sent', async () => {
      const { result } = renderHook(() => useAuditLog());
      await result.current.logBooking('thank_you_sent', 'b-4');

      expect(mockInsertAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'thank_you_sent',
          target_id: 'b-4',
        })
      );
    });
  });
});
