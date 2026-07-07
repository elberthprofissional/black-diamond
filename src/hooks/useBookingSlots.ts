import { useState, useEffect, useMemo } from 'react';
import { getNextDays, fetchTimeSlotsForDate } from '../lib/utils';
import { getAvailableSlots, getBookings } from '../lib/api';
import { useDateDragScroll } from './useDateDragScroll';
import { supabase } from '../lib/supabase';

export function useBookingSlots(showError: (msg: string) => void) {
  const allNextDays = useMemo(() => getNextDays(), []);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [barberPhone, setBarberPhone] = useState('');
  const [workingDays, setWorkingDays] = useState('1,2,3,4,5,6');
  const [existingBookings, setExistingBookings] = useState<
    { booking_time: string; status: string }[]
  >([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);

  const { dateContainerRef, handleMouseDown, handleMouseLeave, handleMouseUp, handleMouseMove } =
    useDateDragScroll();

  const nextDays = useMemo(() => {
    const enabled = workingDays.split(',').map(Number);
    return allNextDays.filter((d) => {
      const dow = new Date(d.fullDate + 'T12:00:00').getDay();
      return enabled.includes(dow);
    });
  }, [allNextDays, workingDays]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await supabase
          .from('settings')
          .select('key, value')
          .in('key', ['barber_phone', 'working_days']);

        if (data) {
          for (const row of data) {
            if (row.key === 'barber_phone' && row.value) setBarberPhone(row.value);
            else if (row.key === 'working_days' && row.value) setWorkingDays(row.value);
          }
        }
        if (!data?.find((r) => r.key === 'barber_phone')) {
          setBarberPhone(import.meta.env.VITE_BARBER_WHATSAPP || '');
        }
      } catch {
        setBarberPhone(import.meta.env.VITE_BARBER_WHATSAPP || '');
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    setSelectedTime('');
    if (selectedDate) {
      let active = true;
      const loadData = async () => {
        try {
          const [bookingsData, slotsData] = await Promise.all([
            getBookings(selectedDate).catch(() => []),
            getAvailableSlots(selectedDate).catch(() => fetchTimeSlotsForDate(selectedDate)),
          ]);
          if (!active) return;
          setExistingBookings(bookingsData);
          setAvailableSlots(slotsData);
        } catch {
          if (active) showError('Erro ao carregar dados.');
        }
      };
      loadData();
      return () => {
        active = false;
      };
    }
  }, [selectedDate, showError]);

  return {
    selectedDate,
    setSelectedDate,
    selectedTime,
    setSelectedTime,
    existingBookings,
    availableSlots,
    nextDays,
    barberPhone,
    dateContainerRef,
    handleMouseDown,
    handleMouseLeave,
    handleMouseUp,
    handleMouseMove,
  };
}
