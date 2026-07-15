import { describe, it, expect, vi } from 'vitest';
import {
  getTimeSlotsForDate,
  formatPhone,
  getLocalDateString,
  getNextDays,
  isTimeOccupied,
  getErrorMessage,
} from './utils';

vi.mock('./supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() =>
            Promise.resolve({
              data: {
                value: JSON.stringify({
                  '1': { enabled: true, open: '08:00', close: '19:00' },
                  '2': { enabled: true, open: '08:00', close: '19:00' },
                  '3': { enabled: true, open: '08:00', close: '19:00' },
                  '4': { enabled: true, open: '08:00', close: '19:00' },
                  '5': { enabled: true, open: '08:00', close: '19:00' },
                  '6': { enabled: true, open: '08:00', close: '18:00' },
                  '0': { enabled: false, open: '09:00', close: '14:00' },
                }),
              },
            })
          ),
        })),
      })),
    })),
  },
}));

describe('getTimeSlotsForDate', () => {
  it('retorna slots de 8h as 19h para dias de semana', async () => {
    const slots = await getTimeSlotsForDate('2026-06-29'); // segunda-feira
    expect(slots[0]).toBe('08:00');
    expect(slots[slots.length - 1]).toBe('18:00');
    expect(slots).toHaveLength(11);
  });

  it('retorna slots de 8h as 18h para sabado', async () => {
    const slots = await getTimeSlotsForDate('2026-06-27'); // sabado
    expect(slots[0]).toBe('08:00');
    expect(slots[slots.length - 1]).toBe('17:00');
    expect(slots).toHaveLength(10);
  });
});

describe('formatPhone', () => {
  it('formata numero de 11 digitos', () => {
    expect(formatPhone('31999999999')).toBe('(31) 99999-9999');
  });

  it('formata numero incompleto', () => {
    expect(formatPhone('3199999')).toBe('(31) 9999-9');
  });

  it('retorna vazio para null/undefined', () => {
    expect(formatPhone(null)).toBe('');
    expect(formatPhone(undefined)).toBe('');
  });

  it('limita a 11 digitos', () => {
    expect(formatPhone('319999999999999')).toBe('(31) 99999-9999');
  });
});

describe('getLocalDateString', () => {
  it('retorna data no formato YYYY-MM-DD', () => {
    const result = getLocalDateString(new Date(2026, 5, 15));
    expect(result).toBe('2026-06-15');
  });

  it('formata meses e dias com zero a esquerda', () => {
    const result = getLocalDateString(new Date(2026, 0, 5));
    expect(result).toBe('2026-01-05');
  });
});

describe('getNextDays', () => {
  it('retorna pelo menos 1 dia', () => {
    const days = getNextDays();
    expect(days.length).toBeGreaterThanOrEqual(1);
  });

  it('cada dia tem as propriedades obrigatorias', () => {
    const days = getNextDays();
    for (const day of days) {
      expect(day).toHaveProperty('fullDate');
      expect(day).toHaveProperty('dayName');
      expect(day).toHaveProperty('dayNumber');
      expect(day).toHaveProperty('isToday');
      expect(day).toHaveProperty('isPast');
      expect(typeof day.fullDate).toBe('string');
      expect(typeof day.dayName).toBe('string');
      expect(typeof day.dayNumber).toBe('number');
    }
  });

  it('nao retorna datas passadas', () => {
    const days = getNextDays();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const day of days) {
      const [year, month, dayNum] = day.fullDate.split('-').map(Number);
      const date = new Date(year, month - 1, dayNum);
      date.setHours(0, 0, 0, 0);
      expect(date.getTime()).toBeGreaterThanOrEqual(today.getTime());
    }
  });

  it('todas as datas retornadas sao >= hoje', () => {
    const days = getNextDays();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();

    for (const day of days) {
      const [year, month, dayNum] = day.fullDate.split('-').map(Number);
      const dateMs = new Date(year, month - 1, dayNum).getTime();
      expect(dateMs).toBeGreaterThanOrEqual(todayMs);
    }
  });

  it('aceita config object com sundayEnabled', () => {
    const daysWithSunday = getNextDays({ sundayEnabled: true });
    // Com domingo habilitado, pode ter domingo nos dias
    expect(daysWithSunday.length).toBeGreaterThanOrEqual(1);
  });

  it('aceita config object com saturdayCloseHour', () => {
    const days = getNextDays({ saturdayCloseHour: 16 });
    expect(days.length).toBeGreaterThanOrEqual(1);
  });

  it('aceita JSON string (legado)', () => {
    const json = JSON.stringify({ '6': { close: '14:00' }, '0': { enabled: true } });
    const days = getNextDays(json);
    expect(days.length).toBeGreaterThanOrEqual(1);
  });
});

describe('isTimeOccupied', () => {
  const bookings = [
    { booking_time: '10:00:00', status: 'confirmed' },
    { booking_time: '11:00:00', status: 'cancelled' },
    { booking_time: '14:00:00', status: 'pending' },
  ];

  it('retorna true para horario ocupado', () => {
    expect(isTimeOccupied('10:00', bookings)).toBe(true);
    expect(isTimeOccupied('14:00', bookings)).toBe(true);
  });

  it('retorna false para horario livre', () => {
    expect(isTimeOccupied('12:00', bookings)).toBe(false);
  });

  it('retorna false para horario cancelado', () => {
    expect(isTimeOccupied('11:00', bookings)).toBe(false);
  });
});

describe('getErrorMessage', () => {
  it('retorna mensagem para erro de rede', () => {
    expect(getErrorMessage(new Error('Failed to fetch'))).toBe(
      'Sem conexão com o servidor. Verifique sua internet.'
    );
  });

  it('retorna mensagem para JWT expired', () => {
    expect(getErrorMessage(new Error('JWT expired'))).toBe(
      'Sessão expirada. Faça login novamente.'
    );
  });

  it('retorna mensagem para RLS error', () => {
    expect(getErrorMessage(new Error('new row violates row-level security'))).toBe(
      'Sem permissão para esta ação.'
    );
  });

  it('retorna mensagem para unique violation', () => {
    expect(getErrorMessage(new Error('unique_violation'))).toBe(
      'Este telefone já está cadastrado para outro cliente.'
    );
  });

  it('retorna mensagem para erro generico', () => {
    expect(getErrorMessage(new Error('Something else'))).toBe('Something else');
  });

  it('retorna mensagem padrao para tipo desconhecido', () => {
    expect(getErrorMessage('not an error')).toBe('Erro inesperado. Tente novamente.');
  });
});
