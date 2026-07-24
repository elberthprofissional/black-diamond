import { useMemo } from 'react';
import { logError } from '../lib/logger';

interface DayStatus {
  isClosed: boolean;
  isPastClosing: boolean;
}

export function useDayStatus(barberHours: string): DayStatus {
  return useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();

    if (!barberHours) {
      return { isClosed: false, isPastClosing: false };
    }

    try {
      const parsed = JSON.parse(barberHours);
      const config = parsed[String(dayOfWeek)];
      const isOpen = config?.enabled !== false;

      if (!isOpen) return { isClosed: true, isPastClosing: false };

      const closeStr = config?.close || '18:00';
      const [closeH, closeM] = closeStr.split(':').map(Number);
      const isPastClosing =
        currentHour > closeH || (currentHour === closeH && currentMinutes > closeM);

      return { isClosed: false, isPastClosing };
    } catch (e) {
      logError(e);
      return { isClosed: false, isPastClosing: false };
    }
  }, [barberHours]);
}
