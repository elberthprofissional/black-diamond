import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToast } from '../hooks/useToast';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useToast', () => {
  it('inicia com toast null', () => {
    const { result } = renderHook(() => useToast());
    expect(result.current.toast).toBeNull();
  });

  it('showSuccess define toast com tipo success', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showSuccess('Agendamento criado!');
    });

    expect(result.current.toast).toEqual({
      message: 'Agendamento criado!',
      type: 'success',
    });
  });

  it('showError define toast com tipo error', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showError('Erro ao salvar');
    });

    expect(result.current.toast).toEqual({
      message: 'Erro ao salvar',
      type: 'error',
    });
  });

  it('toast desapos apos duration padrao (3000ms)', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showSuccess('Teste');
    });

    expect(result.current.toast).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.toast).toBeNull();
  });

  it('toast desaparece após duration customizada', () => {
    const { result } = renderHook(() => useToast(5000));

    act(() => {
      result.current.showSuccess('Teste');
    });

    act(() => {
      vi.advanceTimersByTime(4999);
    });
    expect(result.current.toast).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.toast).toBeNull();
  });

  it('novo toast substitui o anterior', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showSuccess('Primeiro');
    });

    act(() => {
      result.current.showError('Segundo');
    });

    expect(result.current.toast).toEqual({
      message: 'Segundo',
      type: 'error',
    });
  });
});
