import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDayStatus } from './useDayStatus';

// Helper: return a "next Monday" date string
function nextMonday(): Date {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 1 : day === 6 ? 2 : 8 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(10, 0, 0, 0);
  return d;
}

describe('useDayStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('retorna isClosed true quando dia está desabilitado', () => {
    vi.setSystemTime(nextMonday());

    const hours = JSON.stringify({
      '1': { enabled: false, open: '08:00', close: '18:00' },
    });

    const { result } = renderHook(() => useDayStatus(hours));
    expect(result.current.isClosed).toBe(true);
    expect(result.current.isPastClosing).toBe(false);
    expect(result.current.isBeforeOpening).toBe(false);
  });

  it('retorna isPastClosing true quando passou do horário', () => {
    const monday = nextMonday();
    monday.setHours(20, 0, 0, 0);
    vi.setSystemTime(monday);

    const hours = JSON.stringify({
      '1': { enabled: true, open: '08:00', close: '18:00' },
    });

    const { result } = renderHook(() => useDayStatus(hours));
    expect(result.current.isClosed).toBe(false);
    expect(result.current.isPastClosing).toBe(true);
    expect(result.current.isBeforeOpening).toBe(false);
  });

  it('retorna isPastClosing false quando está dentro do horário', () => {
    const monday = nextMonday();
    monday.setHours(14, 0, 0, 0);
    vi.setSystemTime(monday);

    const hours = JSON.stringify({
      '1': { enabled: true, open: '08:00', close: '18:00' },
    });

    const { result } = renderHook(() => useDayStatus(hours));
    expect(result.current.isClosed).toBe(false);
    expect(result.current.isPastClosing).toBe(false);
    expect(result.current.isBeforeOpening).toBe(false);
  });

  it('retorna isBeforeOpening true quando está antes da abertura', () => {
    const monday = nextMonday();
    monday.setHours(6, 0, 0, 0); // 6h, antes das 8h
    vi.setSystemTime(monday);

    const hours = JSON.stringify({
      '1': { enabled: true, open: '08:00', close: '18:00' },
    });

    const { result } = renderHook(() => useDayStatus(hours));
    expect(result.current.isClosed).toBe(false);
    expect(result.current.isPastClosing).toBe(false);
    expect(result.current.isBeforeOpening).toBe(true);
  });

  it('usa horário padrão 18:00 quando close não está definido', () => {
    const monday = nextMonday();
    monday.setHours(20, 0, 0, 0);
    vi.setSystemTime(monday);

    const hours = JSON.stringify({
      '1': { enabled: true, open: '08:00' },
    });

    const { result } = renderHook(() => useDayStatus(hours));
    expect(result.current.isPastClosing).toBe(true);
  });

  it('retorna valores padrão quando barberHours é string vazia', () => {
    vi.setSystemTime(nextMonday());

    const { result } = renderHook(() => useDayStatus(''));
    expect(result.current.isClosed).toBe(false);
    expect(result.current.isPastClosing).toBe(false);
    expect(result.current.isBeforeOpening).toBe(false);
  });

  it('retorna valores padrão quando JSON é inválido', () => {
    vi.setSystemTime(nextMonday());

    const { result } = renderHook(() => useDayStatus('invalid json'));
    expect(result.current.isClosed).toBe(false);
    expect(result.current.isPastClosing).toBe(false);
    expect(result.current.isBeforeOpening).toBe(false);
  });
});
