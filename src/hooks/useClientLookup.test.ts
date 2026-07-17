import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useClientLookup } from './useClientLookup';

const mockGetClientByPhone = vi.fn();
const mockGetLastBookingByPhone = vi.fn();

vi.mock('../lib/api', () => ({
  getClientByPhone: (...args: unknown[]) => mockGetClientByPhone(...args),
  getLastBookingByPhone: (...args: unknown[]) => mockGetLastBookingByPhone(...args),
}));

describe('useClientLookup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetLastBookingByPhone.mockResolvedValue(null);
  });

  it('não busca quando telefone tem menos de 11 dígitos', async () => {
    const { result } = renderHook(() => useClientLookup('1199999'));
    expect(result.current.isMensalista).toBe(false);
    expect(result.current.clientLookupLoading).toBe(false);
    expect(mockGetClientByPhone).not.toHaveBeenCalled();
  });

  it('busca cliente após debounce', async () => {
    mockGetClientByPhone.mockResolvedValue({ name: 'João', is_mensalista: true });
    const onNameFound = vi.fn();

    renderHook(() => useClientLookup('11999999999', onNameFound));

    await waitFor(() => {
      expect(mockGetClientByPhone).toHaveBeenCalledWith('11999999999');
    });
  });

  it('detecta mensalista corretamente', async () => {
    mockGetClientByPhone.mockResolvedValue({ name: 'João', is_mensalista: true });

    const { result } = renderHook(() => useClientLookup('11999999999'));

    await waitFor(() => {
      expect(result.current.isMensalista).toBe(true);
    });
  });

  it('retorna false para não-mensalista', async () => {
    mockGetClientByPhone.mockResolvedValue({ name: 'Maria', is_mensalista: false });

    const { result } = renderHook(() => useClientLookup('11999999999'));

    await waitFor(() => {
      expect(result.current.isMensalista).toBe(false);
    });
  });

  it('chama onNameFound com nome do cliente', async () => {
    mockGetClientByPhone.mockResolvedValue({ name: 'Carlos', is_mensalista: false });
    const onNameFound = vi.fn();

    renderHook(() => useClientLookup('11999999999', onNameFound));

    await waitFor(() => {
      expect(onNameFound).toHaveBeenCalledWith('Carlos');
    });
  });

  it('resetMensalista reseta estado', async () => {
    mockGetClientByPhone.mockResolvedValue({ name: 'João', is_mensalista: true });

    const { result } = renderHook(() => useClientLookup('11999999999'));

    await waitFor(() => {
      expect(result.current.isMensalista).toBe(true);
    });

    act(() => {
      result.current.resetMensalista();
    });

    expect(result.current.isMensalista).toBe(false);
  });

  it('trata erro na busca sem crashar', async () => {
    mockGetClientByPhone.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useClientLookup('11999999999'));

    await waitFor(() => {
      expect(result.current.isMensalista).toBe(false);
      expect(result.current.clientLookupLoading).toBe(false);
    });
  });

  it('limpa mensalista quando telefone fica curto', async () => {
    mockGetClientByPhone.mockResolvedValue({ name: 'João', is_mensalista: true });

    const { result, rerender } = renderHook(({ phone }) => useClientLookup(phone), {
      initialProps: { phone: '11999999999' },
    });

    await waitFor(() => {
      expect(result.current.isMensalista).toBe(true);
    });

    rerender({ phone: '11999' });

    await waitFor(() => {
      expect(result.current.isMensalista).toBe(false);
    });
  });
});
