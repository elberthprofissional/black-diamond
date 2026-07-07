import { useState, useCallback, useEffect, useRef } from 'react';
import { cancelBooking } from '../lib/api';

const STORAGE_KEY = 'client_booking';

export interface ClientBookingData {
  id: string;
  clientName: string;
  clientPhone: string;
  serviceName: string;
  date: string;
  time: string;
  totalPrice: number;
  notificationEnabled: boolean;
  notificationSent: boolean;
  createdAt: string;
}

function loadFromStorage(): ClientBookingData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveToStorage(data: ClientBookingData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage might be full or unavailable
  }
}

function removeFromStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Calculates the end time = booking_time + 1 hour.
 * The card auto-disappears after this time.
 */
function getEndTime(date: string, time: string): Date {
  const [h, m] = time.split(':').map(Number);
  const end = new Date(date + 'T12:00:00');
  end.setHours(h + 1, m, 0, 0); // +1 hour after appointment
  return end;
}

function getTimeUntil(target: Date): { hours: number; minutes: number; total: number } {
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return { hours: 0, minutes: 0, total: 0 };
  const total = Math.ceil(diff / 60000);
  return {
    hours: Math.floor(total / 60),
    minutes: total % 60,
    total,
  };
}

export function useClientBooking() {
  const [booking, setBooking] = useState<ClientBookingData | null>(loadFromStorage);
  const [isExpired, setIsExpired] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, total: 0 });
  const [cancelling, setCancelling] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const notificationFiredRef = useRef(false);

  // Check expiry and update countdown every 30s
  useEffect(() => {
    if (!booking) {
      setIsExpired(true);
      return;
    }

    const endTime = getEndTime(booking.date, booking.time);
    const check = () => {
      const now = Date.now();
      if (now >= endTime.getTime()) {
        setIsExpired(true);
        removeFromStorage();
        setBooking(null);
        if (intervalRef.current) clearInterval(intervalRef.current);
        return;
      }
      setIsExpired(false);
      setTimeLeft(getTimeUntil(endTime));
    };

    check();
    intervalRef.current = setInterval(check, 30000); // check every 30s
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [booking]);

  // Auto-fire notification 30 min before
  useEffect(() => {
    if (!booking || !booking.notificationEnabled || booking.notificationSent || notificationFiredRef.current) return;

    const checkNotif = () => {
      if (notificationFiredRef.current) return;

      const [h, m] = booking.time.split(':').map(Number);
      const notifTime = new Date(booking.date + 'T12:00:00');
      notifTime.setHours(h, m - 30, 0, 0); // 30 min before

      const now = Date.now();
      if (now >= notifTime.getTime() && Notification.permission === 'granted') {
        new Notification('Black Diamond 💈', {
          body: `Seu horário é em 30 minutos! ${booking.serviceName} às ${booking.time}`,
          icon: '/assets/logo.webp',
          badge: '/assets/logo.webp',
          tag: 'booking-reminder',
        });

        notificationFiredRef.current = true;
        const updated = { ...booking, notificationSent: true };
        saveToStorage(updated);
        setBooking(updated);
      }
    };

    // Check immediately and every 30s
    checkNotif();
    const notifInterval = setInterval(checkNotif, 30000);
    return () => clearInterval(notifInterval);
  }, [booking]);

  const saveBooking = useCallback((data: ClientBookingData) => {
    saveToStorage(data);
    setBooking(data);
    setIsExpired(false);
    notificationFiredRef.current = false;
  }, []);

  const clearBooking = useCallback(() => {
    removeFromStorage();
    setBooking(null);
    setIsExpired(true);
  }, []);

  const dismissCard = useCallback(() => {
    removeFromStorage();
    setBooking(null);
    setIsExpired(true);
  }, []);

  const requestNotification = useCallback(async (): Promise<boolean> => {
    if (!booking) return false;

    if (!('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    if (Notification.permission === 'granted') {
      const updated = { ...booking, notificationEnabled: true };
      saveToStorage(updated);
      setBooking(updated);
      return true;
    }

    // Request permission
    try {
      const result = await Notification.requestPermission();
      if (result === 'granted') {
        const updated = { ...booking, notificationEnabled: true };
        saveToStorage(updated);
        setBooking(updated);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [booking]);

  const handleCancel = useCallback(async (): Promise<boolean> => {
    if (!booking) return false;
    setCancelling(true);
    try {
      await cancelBooking(booking.id);
      removeFromStorage();
      setBooking(null);
      setIsExpired(true);
      return true;
    } catch {
      return false;
    } finally {
      setCancelling(false);
    }
  }, [booking]);

  const notificationAvailable = 'Notification' in window;

  return {
    booking,
    isExpired,
    timeLeft,
    cancelling,
    notificationAvailable,
    saveBooking,
    clearBooking,
    dismissCard,
    requestNotification,
    handleCancel,
  };
}
