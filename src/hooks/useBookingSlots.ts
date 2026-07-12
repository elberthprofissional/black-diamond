import { useState, useEffect, useMemo } from 'react';
import { getNextDays, getTimeSlotsForDate } from '../lib/utils';
import { getAvailableSlots, getBookings } from '../lib/api';
import { useDateDragScroll } from './useDateDragScroll';
import { supabase } from '../lib/supabase';

export function useBookingSlots(showError: (msg: string) => void) {
  const [barberHoursJson, setBarberHoursJson] = useState('');
  const allNextDays = useMemo(() => getNextDays(barberHoursJson || undefined), [barberHoursJson]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
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
    let mounted = true;
    const fetchSettings = async () => {
      try {
        const { data } = await supabase
          .from('settings')
          .select('key, value')
          .in('key', ['working_days', 'barber_hours']);

        if (data && mounted) {
          for (const row of data) {
            if (row.key === 'working_days' && row.value) setWorkingDays(row.value);
            else if (row.key === 'barber_hours' && row.value) setBarberHoursJson(row.value);
          }
        }
      } catch {
        // settings fetch failed, keep defaults
      }
    };
    fetchSettings();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setSelectedTime('');
    if (selectedDate) {
      let active = true;
      const loadData = async () => {
        try {
          const [bookingsResult, slotsData] = await Promise.all([
            getBookings(selectedDate).catch(() => ({ data: [] })),
            getAvailableSlots(selectedDate).catch(() => getTimeSlotsForDate(selectedDate)),
          ]);
          if (!active) return;
          setExistingBookings(bookingsResult.data);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  return {
    selectedDate,
    setSelectedDate,
    selectedTime,
    setSelectedTime,
    existingBookings,
    availableSlots,
    nextDays,
    dateContainerRef,
    handleMouseDown,
    handleMouseLeave,
    handleMouseUp,
    handleMouseMove,
  };
}
