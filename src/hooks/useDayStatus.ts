import { useMemo } from 'react';
import { logError } from '../lib/logger';

interface DayStatus {
  isClosed: boolean;
  isPastClosing: boolean;
  isBeforeOpening: boolean;
}

export function useDayStatus(barberHours: string): DayStatus {
  return useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();

    if (!barberHours) {
      return { isClosed: false, isPastClosing: false, isBeforeOpening: false };
    }

    try {
      const parsed = JSON.parse(barberHours);
      const config = parsed[String(dayOfWeek)];
      const isOpen = config?.enabled !== false;

      if (!isOpen) {
        return { isClosed: true, isPastClosing: false, isBeforeOpening: false };
      }

      const openStr = config?.open || '08:00';
      const closeStr = config?.close || '18:00';
      const [openH, openM] = openStr.split(':').map(Number);
      const [closeH, closeM] = closeStr.split(':').map(Number);

      const isBeforeOpening =
        currentHour < openH || (currentHour === openH && currentMinutes < openM);
      const isPastClosing =
        currentHour > closeH || (currentHour === closeH && currentMinutes > closeM);

      return { isClosed: false, isPastClosing, isBeforeOpening };
    } catch (e) {
      logError(e);
      return { isClosed: false, isPastClosing: false, isBeforeOpening: false };
    }
  }, [barberHours]);
}
