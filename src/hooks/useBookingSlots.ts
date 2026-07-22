import { useState, useEffect, useMemo } from 'react';
import { getNextDays, getTimeSlotsForDate } from '../lib/utils';
import { getAvailableSlots, getBookings } from '../lib/api';
import { useDateDragScroll } from './useDateDragScroll';
import { supabase } from '../lib/supabase';
import { logError } from '../lib/logger';

export function useBookingSlots(showError: (msg: string) => void) {
  const [barberHoursJson, setBarberHoursJson] = useState('');
  const [nextDaysConfig, setNextDaysConfig] = useState<{
    saturdayCloseHour?: number;
    sundayEnabled?: boolean;
  }>({});
  const allNextDays = useMemo(
    () =>
      getNextDays(
        Object.keys(nextDaysConfig).length ? nextDaysConfig : barberHoursJson || undefined
      ),
    [barberHoursJson, nextDaysConfig]
  );
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
            else if (row.key === 'barber_hours' && row.value) {
              setBarberHoursJson(row.value);
              // Parse do JSON pra passar config limpa pro getNextDays
              try {
                const parsed = JSON.parse(row.value);
                setNextDaysConfig({
                  saturdayCloseHour: parsed['6']?.close
                    ? parseInt(parsed['6'].close.split(':')[0], 10)
                    : undefined,
                  sundayEnabled: parsed['0'] ? parsed['0'].enabled !== false : undefined,
                });
              } catch (e) {
                logError(e);
                /* keep defaults */
              }
            }
          }
        }
      } catch (e) {
        logError(e);
        // settings fetch failed, keep defaults
      }
    };
    fetchSettings();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
          setExistingBookings(bookingsResult.data || []);
          setAvailableSlots(slotsData);
        } catch (e) {
          logError(e);
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
    dateContainerRef,
    handleMouseDown,
    handleMouseLeave,
    handleMouseUp,
    handleMouseMove,
  };
}
