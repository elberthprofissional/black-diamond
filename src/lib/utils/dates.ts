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

export interface NextDaysConfig {
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

export const isTimeOccupied = (
  time: string,
  bookings: { booking_time: string; status: string }[]
) => {
  return bookings.some((b) => {
    const bookingTime = b.booking_time.slice(0, 5);
    return bookingTime === time && b.status !== 'cancelled';
  });
};
