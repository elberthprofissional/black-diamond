import { supabase } from '../supabase';
import { logError } from '../logger';

interface DaySchedule {
  enabled: boolean;
  open: string;
  close: string;
}

interface HoursData {
  [key: string]: DaySchedule;
}

const DEFAULT_HOURS: HoursData = {
  '1': { enabled: true, open: '08:00', close: '18:00' },
  '2': { enabled: true, open: '08:00', close: '18:00' },
  '3': { enabled: true, open: '08:00', close: '18:00' },
  '4': { enabled: true, open: '08:00', close: '18:00' },
  '5': { enabled: true, open: '08:00', close: '18:00' },
  '6': { enabled: true, open: '08:00', close: '18:00' },
  '0': { enabled: false, open: '09:00', close: '14:00' },
};

/**
 * Gera slots de hora em hora respeitando os minutos do horário de abertura.
 * Ex: abre 08:30 → 08:30, 09:30, 10:30... fecha 20:00 → último slot 19:30
 */
function generateHourlySlots(open: string, close: string): string[] {
  const [openH = 8, openM = 0] = open.split(':').map(Number);
  const [closeH = 18, closeM = 0] = close.split(':').map(Number);

  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  const slots: string[] = [];
  for (let m = openMinutes; m < closeMinutes; m += 60) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
  }
  return slots;
}

/**
 * Busca os horários configurados (barber_hours) do Supabase.
 * Tenta primeiro o JSON completo (barber_hours).
 * Se não existir, busca os valores individuais (fallback).
 */
export const getBarberHours = async (): Promise<HoursData> => {
  try {
    // 1. Tenta buscar o JSON completo primeiro (mais preciso, suporta horários diferentes por dia)
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'barber_hours')
      .maybeSingle();

    if (data?.value) {
      const parsed = JSON.parse(data.value);
      // Validate parsed data has expected structure (at least one day key with open/close)
      if (typeof parsed === 'object' && parsed !== null) {
        const hasValidDay = Object.keys(parsed).some(
          (k) => /^\d$/.test(k) && parsed[k]?.open && parsed[k]?.close
        );
        if (hasValidDay || parsed.lunch_break) {
          return { ...DEFAULT_HOURS, ...parsed };
        }
      }
    }

    // 2. Se não achou barber_hours, busca valores individuais (fallback)
    const { data: rows } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', [
        'working_days',
        'opening_time',
        'closing_time',
        'saturday_opening',
        'saturday_closing',
      ]);

    if (rows && rows.length > 0) {
      const map: Record<string, string> = {};
      for (const row of rows) map[row.key] = row.value;

      const workingDays = (map.working_days || '1,2,3,4,5,6').split(',').map((d) => d.trim());
      const weekOpen = map.opening_time || '08:00';
      const weekClose = map.closing_time || '18:00';
      const satOpen = map.saturday_opening || '08:00';
      const satClose = map.saturday_closing || '14:00';

      const result: HoursData = { ...DEFAULT_HOURS };
      for (let d = 0; d <= 6; d++) {
        const key = String(d);
        const isEnabled = workingDays.includes(key);
        if (d === 6) {
          result[key] = { enabled: isEnabled, open: satOpen, close: satClose };
        } else if (d === 0) {
          result[key] = { enabled: isEnabled, open: '09:00', close: '14:00' };
        } else {
          result[key] = { enabled: isEnabled, open: weekOpen, close: weekClose };
        }
      }

      return result;
    }
  } catch (e) {
    logError(e);
    // keep default hours
  }

  return DEFAULT_HOURS;
};

// Cache for getTimeSlotsForDate (TTL: 5 minutes, max 100 entries)
const slotsCache = new Map<string, { data: string[]; ts: number }>();
const SLOTS_CACHE_TTL = 5 * 60 * 1000;
const SLOTS_CACHE_MAX = 100;

export const getTimeSlotsForDate = async (dateStr: string): Promise<string[]> => {
  const cached = slotsCache.get(dateStr);
  if (cached && Date.now() - cached.ts < SLOTS_CACHE_TTL) {
    return cached.data;
  }

  const date = new Date(dateStr + 'T12:00:00');
  const dow = String(date.getDay());

  // Tenta buscar o JSON completo primeiro (inclui lunch_break)
  try {
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'barber_hours')
      .maybeSingle();

    if (data?.value) {
      const parsed = JSON.parse(data.value);
      const daySchedule = parsed[dow] as DaySchedule | undefined;

      if (!daySchedule?.enabled) {
        if (slotsCache.size >= SLOTS_CACHE_MAX) {
          const oldest = slotsCache.keys().next().value;
          if (oldest) slotsCache.delete(oldest);
        }
        slotsCache.set(dateStr, { data: [], ts: Date.now() });
        return [];
      }

      let slots = generateHourlySlots(daySchedule.open, daySchedule.close);

      // Filtra horário de almoço
      const lunchBreak = parsed.lunch_break as
        { enabled: boolean; start: string; end: string; days: number[] } | undefined;

      if (lunchBreak?.enabled && lunchBreak.days?.includes(Number(dow))) {
        slots = slots.filter((slot) => slot < lunchBreak.start || slot >= lunchBreak.end);
      }

      if (slotsCache.size >= SLOTS_CACHE_MAX) {
        const oldest = slotsCache.keys().next().value;
        if (oldest) slotsCache.delete(oldest);
      }
      slotsCache.set(dateStr, { data: slots, ts: Date.now() });
      return slots;
    }
  } catch (e) {
    logError(e);
    // fallback abaixo
  }

  // Fallback: configurações individuais (legado) — sem lunch_break
  const hours = await getBarberHours();
  const daySchedule = hours[dow];
  if (!daySchedule?.enabled) {
    if (slotsCache.size >= SLOTS_CACHE_MAX) {
      const oldest = slotsCache.keys().next().value;
      if (oldest) slotsCache.delete(oldest);
    }
    slotsCache.set(dateStr, { data: [], ts: Date.now() });
    return [];
  }
  const slots = generateHourlySlots(daySchedule.open, daySchedule.close);
  if (slotsCache.size >= SLOTS_CACHE_MAX) {
    const oldest = slotsCache.keys().next().value;
    if (oldest) slotsCache.delete(oldest);
  }
  slotsCache.set(dateStr, { data: slots, ts: Date.now() });
  return slots;
};
