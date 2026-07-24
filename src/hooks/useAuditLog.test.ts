import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const mockGetSession = vi.fn();
const mockInsert = vi.fn();
const mockLogError = vi.fn();

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
    from: vi.fn(() => ({
      insert: (...args: unknown[]) => mockInsert(...args),
    })),
  },
}));

vi.mock('../lib/logger', () => ({
  logError: (...args: unknown[]) => mockLogError(...args),
}));

import { useAuditLog } from './useAuditLog';

describe('useAuditLog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'user-123' } } },
    });
    mockInsert.mockResolvedValue({ error: null });
  });

  it('returns log, logLogin, and logBooking functions', () => {
    const { result } = renderHook(() => useAuditLog());
    expect(typeof result.current.log).toBe('function');
    expect(typeof result.current.logLogin).toBe('function');
    expect(typeof result.current.logBooking).toBe('function');
  });

  // ── log ──────────────────────────────────────────────────────────────────────

  describe('log', () => {
    it('inserts audit log with session user_id', async () => {
      const { result } = renderHook(() => useAuditLog());
      await result.current.log({ action: 'login_success', details: { email: 'test@test.com' } });

      expect(mockGetSession).toHaveBeenCalled();
      expect(mockInsert).toHaveBeenCalledWith({
        action: 'login_success',
        user_id: 'user-123',
        target_id: undefined,
        details: { email: 'test@test.com' },
        ip_address: null,
        user_agent: navigator.userAgent,
      });
    });

    it('sets user_id to undefined when session is null', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      const { result } = renderHook(() => useAuditLog());
      await result.current.log({ action: 'logout' });

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'logout',
          user_id: undefined,
        })
      );
    });

    it('sets user_id to undefined when session.user is null', async () => {
      mockGetSession.mockResolvedValue({ data: { session: { user: null } } });
      const { result } = renderHook(() => useAuditLog());
      await result.current.log({ action: 'logout' });

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'logout',
          user_id: undefined,
        })
      );
    });

    it('inserts with target_id when provided', async () => {
      const { result } = renderHook(() => useAuditLog());
      await result.current.log({ action: 'booking_created', target_id: 'booking-1' });

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'booking_created',
          target_id: 'booking-1',
        })
      );
    });

    it('does not throw when insert fails', async () => {
      mockInsert.mockResolvedValue({ error: { message: 'Insert failed' } });
      const { result } = renderHook(() => useAuditLog());

      await expect(result.current.log({ action: 'login_success' })).resolves.not.toThrow();
    });

    it('catches and logs errors from getSession', async () => {
      mockGetSession.mockRejectedValue(new Error('Auth error'));
      const { result } = renderHook(() => useAuditLog());

      await expect(result.current.log({ action: 'login_success' })).resolves.not.toThrow();

      expect(mockLogError).toHaveBeenCalled();
    });

    it('catches and logs errors from insert', async () => {
      mockInsert.mockRejectedValue(new Error('DB error'));
      const { result } = renderHook(() => useAuditLog());

      await expect(result.current.log({ action: 'login_success' })).resolves.not.toThrow();

      expect(mockLogError).toHaveBeenCalled();
    });
  });

  // ── logLogin ────────────────────────────────────────────────────────────────

  describe('logLogin', () => {
    it('logs login_success on success', async () => {
      const { result } = renderHook(() => useAuditLog());
      await result.current.logLogin(true, 'admin@test.com');

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'login_success',
          details: { email: 'admin@test.com' },
        })
      );
    });

    it('logs login_failed on failure', async () => {
      const { result } = renderHook(() => useAuditLog());
      await result.current.logLogin(false, 'bad@test.com');

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'login_failed',
          details: { email: 'bad@test.com' },
        })
      );
    });

    it('logs login without email', async () => {
      const { result } = renderHook(() => useAuditLog());
      await result.current.logLogin(true);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'login_success',
          details: { email: undefined },
        })
      );
    });
  });

  // ── logBooking ──────────────────────────────────────────────────────────────

  describe('logBooking', () => {
    it('logs booking_created with target_id', async () => {
      const { result } = renderHook(() => useAuditLog());
      await result.current.logBooking('booking_created', 'b-1', { service: 'Haircut' });

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'booking_created',
          target_id: 'b-1',
          details: { service: 'Haircut' },
        })
      );
    });

    it('logs booking_completed without details', async () => {
      const { result } = renderHook(() => useAuditLog());
      await result.current.logBooking('booking_completed', 'b-2');

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'booking_completed',
          target_id: 'b-2',
          details: undefined,
        })
      );
    });

    it('logs booking_cancelled', async () => {
      const { result } = renderHook(() => useAuditLog());
      await result.current.logBooking('booking_cancelled', 'b-3');

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'booking_cancelled',
          target_id: 'b-3',
        })
      );
    });

    it('logs thank_you_sent', async () => {
      const { result } = renderHook(() => useAuditLog());
      await result.current.logBooking('thank_you_sent', 'b-4');

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'thank_you_sent',
          target_id: 'b-4',
        })
      );
    });
  });
});
