import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useModalA11y } from '../hooks/useModalA11y';

describe('useModalA11y', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('retorna dialogRef', () => {
    const { result } = renderHook(() => useModalA11y(false, vi.fn()));
    expect(result.current.dialogRef).toBeDefined();
  });

  it('nao adiciona listener dekeydown quando modal esta fechado', () => {
    const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
    renderHook(() => useModalA11y(false, vi.fn()));
    expect(addEventListenerSpy).not.toHaveBeenCalledWith('keydown', expect.any(Function));
    addEventListenerSpy.mockRestore();
  });

  it('adiciona listener dekeydown quando modal esta aberto', () => {
    const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
    renderHook(() => useModalA11y(true, vi.fn()));
    expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    addEventListenerSpy.mockRestore();
  });

  it('chama onClose quando Escape e pressionado', () => {
    const onClose = vi.fn();
    renderHook(() => useModalA11y(true, onClose));

    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    document.dispatchEvent(event);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
