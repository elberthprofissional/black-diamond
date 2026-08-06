import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNoShow } from './useNoShow';
import { queryClientWrapper } from '../test/query-client-wrapper';

const mockSupabaseFrom = vi.fn();
const mockShowSuccess = vi.fn();
const mockShowError = vi.fn();
const mockLog = vi.fn();
const mockCheckAndNotifyNoShowLimit = vi.fn();

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    }),
    removeChannel: vi.fn().mockResolvedValue({ error: null }),
  },
}));

vi.mock('./useToast', () => ({
  useToast: () => ({
    showSuccess: mockShowSuccess,
    showError: mockShowError,
  }),
}));

vi.mock('./useAuditLog', () => ({
  useAuditLog: () => ({
    log: mockLog,
  }),
}));

vi.mock('../lib/api/noShow', () => ({
  checkAndNotifyNoShowLimit: (...args: unknown[]) => mockCheckAndNotifyNoShowLimit(...args),
}));

function createSuccessChain() {
  const thenFn = vi.fn((resolve: (v: { data: null; error: null }) => void) => {
    resolve({ data: null, error: null });
    return { catch: vi.fn() };
  });
  return {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    then: thenFn,
  };
}

function createErrorChain(errorMsg: string) {
  const thenFn = vi.fn((resolve: (v: { data: null; error: Error }) => void) => {
    resolve({ data: null, error: new Error(errorMsg) });
    return { catch: vi.fn() };
  });
  return {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    then: thenFn,
  };
}

describe('useNoShow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckAndNotifyNoShowLimit.mockResolvedValue(false);
  });

  it('returns initial state', () => {
    const { result } = renderHook(() => useNoShow(), { wrapper: queryClientWrapper() });
    expect(result.current.markingNoShow).toBeNull();
    expect(typeof result.current.markAsNoShow).toBe('function');
    expect(typeof result.current.undoNoShow).toBe('function');
  });

  it('marks a booking as no-show successfully', async () => {
    mockSupabaseFrom.mockReturnValue(createSuccessChain());
    const onBookingUpdated = vi.fn();

    const { result } = renderHook(() => useNoShow({ onBookingUpdated }), {
      wrapper: queryClientWrapper(),
    });

    await act(async () => {
      await result.current.markAsNoShow('booking-1', 'Cliente Teste', 'client-1', '11999999999');
    });

    expect(mockSupabaseFrom).toHaveBeenCalledWith('bookings');
    expect(mockShowSuccess).toHaveBeenCalled();
    expect(onBookingUpdated).toHaveBeenCalled();
  });

  it('calls checkAndNotifyNoShowLimit with client data', async () => {
    mockSupabaseFrom.mockReturnValue(createSuccessChain());

    const { result } = renderHook(() => useNoShow(), { wrapper: queryClientWrapper() });

    await act(async () => {
      await result.current.markAsNoShow('booking-1', 'Cliente Teste', 'client-1', '11999999999');
    });

    expect(mockCheckAndNotifyNoShowLimit).toHaveBeenCalledWith(
      'client-1',
      'Cliente Teste',
      '11999999999'
    );
  });

  it('shows limit message when client reaches no-show limit', async () => {
    mockSupabaseFrom.mockReturnValue(createSuccessChain());
    mockCheckAndNotifyNoShowLimit.mockResolvedValue(true);

    const { result } = renderHook(() => useNoShow(), { wrapper: queryClientWrapper() });

    await act(async () => {
      await result.current.markAsNoShow('booking-1', 'Cliente Teste', 'client-1');
    });

    expect(mockShowSuccess).toHaveBeenCalledWith(
      expect.stringContaining('atingiu o limite de faltas')
    );
  });

  it('handles error when marking no-show', async () => {
    mockSupabaseFrom.mockReturnValue(createErrorChain('DB error'));

    const { result } = renderHook(() => useNoShow(), { wrapper: queryClientWrapper() });

    await act(async () => {
      await result.current.markAsNoShow('booking-1');
    });

    expect(mockShowError).toHaveBeenCalledWith('Erro ao marcar falta');
    expect(result.current.markingNoShow).toBeNull();
  });

  it('shows success without client data', async () => {
    mockSupabaseFrom.mockReturnValue(createSuccessChain());

    const { result } = renderHook(() => useNoShow(), { wrapper: queryClientWrapper() });

    await act(async () => {
      await result.current.markAsNoShow('booking-1');
    });

    expect(mockShowSuccess).toHaveBeenCalledWith('Falta registrada.');
  });

  it('undoes a no-show successfully', async () => {
    mockSupabaseFrom.mockReturnValue(createSuccessChain());
    const onBookingUpdated = vi.fn();

    const { result } = renderHook(() => useNoShow({ onBookingUpdated }), {
      wrapper: queryClientWrapper(),
    });

    await act(async () => {
      await result.current.undoNoShow('booking-1');
    });

    expect(mockSupabaseFrom).toHaveBeenCalledWith('bookings');
    expect(mockShowSuccess).toHaveBeenCalledWith('Falta removida');
    expect(onBookingUpdated).toHaveBeenCalled();
  });

  it('handles error when undoing no-show', async () => {
    mockSupabaseFrom.mockReturnValue(createErrorChain('DB error'));

    const { result } = renderHook(() => useNoShow(), { wrapper: queryClientWrapper() });

    await act(async () => {
      await result.current.undoNoShow('booking-1');
    });

    expect(mockShowError).toHaveBeenCalledWith('Erro ao remover falta');
  });

  it('works without onBookingUpdated callback', async () => {
    mockSupabaseFrom.mockReturnValue(createSuccessChain());

    const { result } = renderHook(() => useNoShow(), { wrapper: queryClientWrapper() });

    await act(async () => {
      await result.current.markAsNoShow('booking-1', 'Cliente');
    });

    expect(mockShowSuccess).toHaveBeenCalled();
  });

  it('marks no-show with specific booking ID', async () => {
    mockSupabaseFrom.mockReturnValue(createSuccessChain());

    const { result } = renderHook(() => useNoShow(), { wrapper: queryClientWrapper() });

    await act(async () => {
      await result.current.markAsNoShow('booking-xyz-123');
    });

    expect(mockSupabaseFrom).toHaveBeenCalledWith('bookings');
    expect(mockShowSuccess).toHaveBeenCalled();
  });

  it('undoes no-show with specific booking ID', async () => {
    mockSupabaseFrom.mockReturnValue(createSuccessChain());

    const { result } = renderHook(() => useNoShow(), { wrapper: queryClientWrapper() });

    await act(async () => {
      await result.current.undoNoShow('booking-abc-456');
    });

    expect(mockSupabaseFrom).toHaveBeenCalledWith('bookings');
    expect(mockShowSuccess).toHaveBeenCalled();
  });
});
