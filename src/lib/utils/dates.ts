import { logError } from '../logger';

export const getLocalDateString = (d: Date = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/** Converts "YYYY-MM-DD" to "DD/MM/YYYY" */
export const formatDateBR = (dateStr: string): string => {
  return dateStr.split('-').reverse().join('/');
};

interface NextDaysConfig {
  saturdayCloseHour?: number;
  sundayEnabled?: boolean;
}

export const getNextDays = (config?: NextDaysConfig | string) => {
  const days = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentDay = today.getDay();
  const currentHour = new Date().getHours();

  // Aceita string JSON (legado) ou objeto config
  let saturdayCloseHour = 18;
  let sundayEnabled = false;
  if (typeof config === 'string') {
    try {
      const parsed = JSON.parse(config);
      if (parsed['6']?.close) {
        saturdayCloseHour = parseInt(parsed['6'].close.split(':')[0], 10);
      }
      if (parsed['0']) {
        sundayEnabled = parsed['0'].enabled !== false;
      }
    } catch (e) {
      logError(e);
      /* use defaults */
    }
  } else if (config) {
    saturdayCloseHour = config.saturdayCloseHour ?? 18;
    sundayEnabled = config.sundayEnabled ?? false;
  }

  // Sábado após fechar: mostra a próxima semana (começa segunda)
  if (currentDay === 6 && currentHour >= saturdayCloseHour) {
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + ((8 - currentDay) % 7 || 7)); // sempre +2 dias (dom -> seg)
    const totalDays = sundayEnabled ? 7 : 6;
    for (let i = 0; i < totalDays; i++) {
      const date = new Date(nextMonday);
      date.setDate(nextMonday.getDate() + i);
      date.setHours(0, 0, 0, 0);
      days.push({
        fullDate: getLocalDateString(date),
        dayName: date
          .toLocaleDateString('pt-BR', { weekday: 'short' })
          .replace('.', '')
          .toUpperCase(),
        dayNumber: date.getDate(),
        isToday: false,
        isPast: false,
      });
    }
    return days;
  }

  // Domingo: se NÃO estiver habilitado, pula para a próxima semana
  if (currentDay === 0 && !sundayEnabled) {
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + ((1 - currentDay + 7) % 7));
    for (let i = 0; i < 6; i++) {
      const date = new Date(nextMonday);
      date.setDate(nextMonday.getDate() + i);
      date.setHours(0, 0, 0, 0);
      days.push({
        fullDate: getLocalDateString(date),
        dayName: date
          .toLocaleDateString('pt-BR', { weekday: 'short' })
          .replace('.', '')
          .toUpperCase(),
        dayNumber: date.getDate(),
        isToday: false,
        isPast: false,
      });
    }
    return days;
  }

  // De segunda a domingo (ou só até sábado se domingo desabilitado): mostra de HOJE até o ÚLTIMO DIA HABILITADO
  const lastDay = sundayEnabled ? 0 : 6;
  const daysUntilLast = (lastDay - currentDay + 7) % 7;
  for (let i = 0; i <= daysUntilLast; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    date.setHours(0, 0, 0, 0);

    days.push({
      fullDate: getLocalDateString(date),
      dayName: date
        .toLocaleDateString('pt-BR', { weekday: 'short' })
        .replace('.', '')
        .toUpperCase(),
      dayNumber: date.getDate(),
      isToday: i === 0,
      isPast: false,
    });
  }
  return days;
};

/** Converte 'HH:MM(:SS)' em minutos desde 00:00. */
const timeToMinutes = (t: string): number => {
  const [h = 0, m = 0] = t.split(':').map(Number);
  return h * 60 + (m || 0);
};

/**
 * Verifica se um horário está ocupado por algum agendamento, considerando a
 * DURAÇÃO: o slot pretendido [time, time + duration) colide com um booking
 * existente [b.booking_time, b.booking_time + duração).
 *
 * - `duration` (opcional, default 60): duração em minutos do novo agendamento.
 * - Booking legado/bloqueio sem total_duration é tratado como 60min.
 * - Bookings cancelados nunca ocupam.
 */
export const isTimeOccupied = (
  time: string,
  bookings: { booking_time: string; status: string; total_duration?: number }[],
  duration = 60
) => {
  const slotStart = timeToMinutes(time);
  const slotEnd = slotStart + Math.max(duration, 1);
  return bookings.some((b) => {
    if (b.status === 'cancelled') return false;
    const bStart = timeToMinutes(b.booking_time);
    const bDuration = Number(b.total_duration) > 0 ? Number(b.total_duration) : 60;
    const bEnd = bStart + bDuration;
    // Sobreposição de intervalos: slotStart < bEnd AND bStart < slotEnd
    return slotStart < bEnd && bStart < slotEnd;
  });
};
