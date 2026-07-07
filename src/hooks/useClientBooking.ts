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
    if (!raw) return null;
    const data = JSON.parse(raw);
    // Validate required fields
    if (!data.id || !data.date || !data.time) return null;
    return data;
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
 * Calculates end time = booking_time + 1 hour.
 * Card auto-disappears after this.
 */
function getEndTime(date: string, time: string): Date {
  const [h, m] = time.split(':').map(Number);
  const end = new Date(date + 'T12:00:00');
  end.setHours(h + 1, m, 0, 0);
  return end;
}

/**
 * Checks if booking date is today or in the future.
 * Past bookings should not show the card.
 */
function isBookingRelevant(date: string, time: string): boolean {
  const endTime = getEndTime(date, time);
  return Date.now() < endTime.getTime();
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
  const [booking, setBooking] = useState<ClientBookingData | null>(() => {
    const data = loadFromStorage();
    // Check if still relevant on load
    if (data && !isBookingRelevant(data.date, data.time)) {
      removeFromStorage();
      return null;
    }
    return data;
  });
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
    intervalRef.current = setInterval(check, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [booking]);

  // Auto-fire notification 30 min before
  useEffect(() => {
    if (
      !booking ||
      !booking.notificationEnabled ||
      booking.notificationSent ||
      notificationFiredRef.current
    )
      return;

    const [h, m] = booking.time.split(':').map(Number);
    const notifTime = new Date(booking.date + 'T12:00:00');
    notifTime.setHours(h, m - 30, 0, 0);

    const checkNotif = () => {
      if (notificationFiredRef.current) return;

      const now = Date.now();
      if (now >= notifTime.getTime() && Notification.permission === 'granted') {
        try {
          new Notification('Black Diamond 💈', {
            body: `Seu horário é em 30 minutos! ${booking.serviceName} às ${booking.time}`,
            icon: '/assets/logo.webp',
            badge: '/assets/logo.webp',
            tag: 'booking-reminder',
          });
        } catch {
          // Notification failed silently
        }

        notificationFiredRef.current = true;
        const updated = { ...booking, notificationSent: true };
        saveToStorage(updated);
        setBooking(updated);
      }
    };

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
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'denied') return false;

    if (Notification.permission === 'granted') {
      const updated = { ...booking, notificationEnabled: true };
      saveToStorage(updated);
      setBooking(updated);
      return true;
    }

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

  /**
   * Cancel booking in database AND remove from localStorage.
   * Returns true if successful.
   */
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

  const notificationAvailable = typeof window !== 'undefined' && 'Notification' in window;

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
