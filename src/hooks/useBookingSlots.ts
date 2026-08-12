import { useState, useEffect, useMemo } from 'react';
import { getNextDays, getTimeSlotsForDate } from '../lib/utils';
import { getAvailableSlots, getBookings } from '../lib/api';
import { getWorkSettings } from '../lib/api/settings';
import { useDateDragScroll } from './useDateDragScroll';
import { logError } from '../lib/logger';

/**
 * Hook para gerenciar seleção de data/horário no fluxo público de agendamento.
 *
 * - Carrega configurações de dias úteis e horários do Supabase (settings).
 * - Filtra os próximos dias disponíveis com base nos dias úteis.
 * - Ao selecionar uma data, busca agendamentos existentes + slots disponíveis.
 * - Usa `useDateDragScroll` para suporte a arraste horizontal no calendário.
 * - Aceita barberId opcional para filtrar slots por barbeiro (multi-barber).
 *
 * @param showError - Função para exibir mensagens de erro.
 * @param barberId - ID do barbeiro (opcional) para filtrar slots.
 * @param duration - Duração em minutos dos serviços selecionados (opcional). Slots que
 *   não comportam essa duração sem sobrepor outro agendamento são ocultados.
 * @returns {{ selectedDate, selectedTime, availableSlots, nextDays, slotDuration, ... }}
 */
export function useBookingSlots(
  showError: (msg: string) => void,
  barberId?: string,
  duration?: number
) {
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
    { booking_time: string; status: string; total_duration?: number }[]
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
        const config = await getWorkSettings();
        if (!mounted) return;
        setWorkingDays(config.workingDays);
        if (config.barberHours) {
          setBarberHoursJson(config.barberHours);
          try {
            const parsed = JSON.parse(config.barberHours);
            setNextDaysConfig({
              saturdayCloseHour: parsed['6']?.close
                ? parseInt(parsed['6'].close.split(':')[0], 10)
                : undefined,
              sundayEnabled: parsed['0'] ? parsed['0'].enabled !== false : undefined,
            });
          } catch (e) {
            logError(e);
          }
        }
      } catch (e) {
        logError(e);
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
            getBookings(selectedDate, { barberId }).catch(() => ({ data: [] })),
            getAvailableSlots(selectedDate, barberId, duration).catch(() =>
              // Fallback: respeita o horário próprio do barbeiro quando houver
              getTimeSlotsForDate(selectedDate, barberId)
            ),
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
  }, [selectedDate, showError, barberId, duration]);

  return {
    selectedDate,
    setSelectedDate,
    selectedTime,
    setSelectedTime,
    existingBookings,
    availableSlots,
    nextDays,
    /** Duração (min) usada para filtrar os slots — repassada à UI de ocupação. */
    slotDuration: duration && duration > 0 ? duration : 60,
    dateContainerRef,
    handleMouseDown,
    handleMouseLeave,
    handleMouseUp,
    handleMouseMove,
  };
}
