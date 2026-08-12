import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getLocalDateString, formatDateBR, getNextDays, isTimeOccupied } from './dates';

describe('getLocalDateString', () => {
  it('formats date as YYYY-MM-DD', () => {
    const date = new Date(2026, 6, 25); // July 25, 2026
    expect(getLocalDateString(date)).toBe('2026-07-25');
  });

  it('pads single digit month and day', () => {
    const date = new Date(2026, 0, 5); // Jan 5, 2026
    expect(getLocalDateString(date)).toBe('2026-01-05');
  });

  it('uses current date when no argument', () => {
    const result = getLocalDateString();
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    expect(result).toBe(expected);
  });
});

describe('formatDateBR', () => {
  it('converts YYYY-MM-DD to DD/MM/YYYY', () => {
    expect(formatDateBR('2026-07-25')).toBe('25/07/2026');
  });

  it('handles single digit months and days', () => {
    expect(formatDateBR('2026-01-05')).toBe('05/01/2026');
  });
});

describe('getNextDays', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns correct days from Monday to Saturday (sunday disabled, before closing)', () => {
    // July 27, 2026 is a Monday
    vi.setSystemTime(new Date(2026, 6, 27, 10, 0, 0));

    const days = getNextDays({ saturdayCloseHour: 18, sundayEnabled: false });

    // Monday to Saturday = 6 days
    expect(days).toHaveLength(6);
    expect(days[0].dayName).toBe('SEG');
    expect(days[0].fullDate).toBe('2026-07-27');
    expect(days[0].isToday).toBe(true);
    expect(days[5].dayName).toBe('SÁB');
    expect(days[5].fullDate).toBe('2026-08-01');
  });

  it('includes Sunday when sundayEnabled is true', () => {
    // July 27, 2026 is a Monday
    vi.setSystemTime(new Date(2026, 6, 27, 10, 0, 0));

    const days = getNextDays({ saturdayCloseHour: 18, sundayEnabled: true });

    // Monday to Sunday = 7 days
    expect(days).toHaveLength(7);
    expect(days[6].dayName).toBe('DOM');
  });

  it('on Saturday after closing, shows next week starting Monday', () => {
    // July 25, 2026 is a Saturday
    vi.setSystemTime(new Date(2026, 6, 25, 20, 0, 0)); // After 18h closing

    const days = getNextDays({ saturdayCloseHour: 18, sundayEnabled: false });

    expect(days).toHaveLength(6);
    expect(days[0].dayName).toBe('SEG');
    expect(days[0].fullDate).toBe('2026-07-27'); // Next Monday
  });

  it('on Saturday after closing with sunday enabled returns 7 days', () => {
    vi.setSystemTime(new Date(2026, 6, 25, 20, 0, 0));

    const days = getNextDays({ saturdayCloseHour: 18, sundayEnabled: true });

    expect(days).toHaveLength(7);
    expect(days[0].dayName).toBe('SEG');
    expect(days[6].dayName).toBe('DOM');
  });

  it('on Sunday with sunday disabled jumps to Monday', () => {
    // July 26, 2026 is a Sunday
    vi.setSystemTime(new Date(2026, 6, 26, 10, 0, 0));

    const days = getNextDays({ sundayEnabled: false });

    expect(days).toHaveLength(6);
    expect(days[0].dayName).toBe('SEG');
    expect(days[0].fullDate).toBe('2026-07-27');
  });

  it('on Sunday with sunday enabled shows Sunday too', () => {
    vi.setSystemTime(new Date(2026, 6, 26, 10, 0, 0));

    const days = getNextDays({ sundayEnabled: true });

    expect(days).toHaveLength(1); // Just today (Sunday) since sunday is the last day
    expect(days[0].dayName).toBe('DOM');
    expect(days[0].isToday).toBe(true);
  });

  it('parses legacy string config correctly', () => {
    vi.setSystemTime(new Date(2026, 6, 27, 10, 0, 0));

    const config = JSON.stringify({ '6': { close: '16:00' }, '0': { enabled: true } });
    const days = getNextDays(config);

    expect(days).toHaveLength(7);
  });

  it('handles invalid string config gracefully using defaults', () => {
    vi.setSystemTime(new Date(2026, 6, 27, 10, 0, 0));

    const days = getNextDays('invalid json');
    // Should use defaults
    expect(days).toHaveLength(6);
  });

  it('uses defaults when no config provided', () => {
    vi.setSystemTime(new Date(2026, 6, 27, 10, 0, 0));

    const days = getNextDays();
    expect(Array.isArray(days)).toBe(true);
    expect(days.length).toBeGreaterThan(0);
  });
});

describe('isTimeOccupied', () => {
  const bookings = [
    { booking_time: '10:00:00', status: 'confirmed' },
    { booking_time: '11:30:00', status: 'completed' },
    { booking_time: '14:00:00', status: 'cancelled' },
  ];

  it('returns true for occupied time', () => {
    expect(isTimeOccupied('10:00', bookings)).toBe(true);
  });

  it('returns false for free time', () => {
    expect(isTimeOccupied('09:00', bookings)).toBe(false);
  });

  it('ignores cancelled bookings', () => {
    expect(isTimeOccupied('14:00', bookings)).toBe(false);
  });

  it('returns true for completed bookings', () => {
    expect(isTimeOccupied('11:30', bookings)).toBe(true);
  });

  it('returns false when bookings array is empty', () => {
    expect(isTimeOccupied('10:00', [])).toBe(false);
  });

  it('matches time ignoring seconds', () => {
    expect(isTimeOccupied('10:00', [{ booking_time: '10:00:00', status: 'confirmed' }])).toBe(true);
  });

  it('considera a duracao do booking existente (sobreposicao)', () => {
    // Booking de 70min às 09:00 termina 10:10 → 10:00 fica ocupado
    const longBooking = [{ booking_time: '09:00:00', status: 'confirmed', total_duration: 70 }];
    expect(isTimeOccupied('10:00', longBooking)).toBe(true);
    // Mas 11:00 segue livre
    expect(isTimeOccupied('11:00', longBooking)).toBe(false);
  });

  it('considera a duracao do novo agendamento (duration param)', () => {
    // Booking de 30min às 09:30 (termina 10:00): um agendamento de 30min às 09:00
    // não colide (termina 09:30), mas um de 60min colide (terminaria 10:00)
    const shortBooking = [{ booking_time: '09:30:00', status: 'confirmed', total_duration: 30 }];
    expect(isTimeOccupied('09:00', shortBooking, 30)).toBe(false);
    expect(isTimeOccupied('09:00', shortBooking, 60)).toBe(true);
  });

  it('mesmo horario de inicio sempre colide (nao da pra agendar 2 no mesmo horario)', () => {
    const b = [{ booking_time: '10:00:00', status: 'confirmed', total_duration: 30 }];
    expect(isTimeOccupied('10:00', b, 30)).toBe(true);
    expect(isTimeOccupied('10:00', b, 60)).toBe(true);
  });

  it('trata booking sem total_duration como 60min', () => {
    const legacy = [{ booking_time: '09:00:00', status: 'confirmed' }];
    // 60min às 09:00 → termina exatamente 10:00 → 10:00 livre, 09:00 ocupado
    expect(isTimeOccupied('10:00', legacy)).toBe(false);
    expect(isTimeOccupied('09:00', legacy)).toBe(true);
    expect(isTimeOccupied('11:00', legacy)).toBe(false);
  });

  it('nao sobrepoe quando termina exatamente no inicio do proximo slot', () => {
    const exact = [{ booking_time: '09:00:00', status: 'confirmed', total_duration: 60 }];
    expect(isTimeOccupied('10:00', exact)).toBe(false);
    expect(isTimeOccupied('09:00', exact)).toBe(true);
  });
});
