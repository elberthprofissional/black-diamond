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

/**
 * Slots cache: TTL de 5 min, max 100 entries.
 * Entries expiradas são removidas sob demanda a cada acesso, evitando
 * que o cache acumule dados obsoletos entre TTLs.
 */
const slotsCache = new Map<string, { data: string[]; ts: number }>();
const SLOTS_CACHE_TTL = 5 * 60 * 1000;
const SLOTS_CACHE_MAX = 100;

/** Remove todas as entries expiradas do cache. Chamado em cada acesso. */
function evictExpiredSlots(): void {
  const now = Date.now();
  for (const [key, entry] of slotsCache) {
    if (now - entry.ts >= SLOTS_CACHE_TTL) {
      slotsCache.delete(key);
    }
  }
}

/** Remove a entry mais antiga se o cache estiver cheio. */
function evictIfFull(): void {
  if (slotsCache.size >= SLOTS_CACHE_MAX) {
    const oldest = slotsCache.keys().next().value;
    if (oldest) slotsCache.delete(oldest);
  }
}

/** Atalho: atualiza o cache chamando evictExpired + evictIfFull + set */
function cacheSet(key: string, data: string[]): void {
  evictExpiredSlots();
  evictIfFull();
  slotsCache.set(key, { data, ts: Date.now() });
}

interface LunchBreakCfg {
  enabled: boolean;
  start: string;
  end: string;
  days: number[];
}

type ParsedHours = Record<string, unknown>;

/** Normaliza um valor jsonb/text para objeto de horários (ou null). */
function normalizeHoursJson(v: unknown): ParsedHours | null {
  if (!v) return null;
  if (typeof v === 'string') {
    try {
      const parsed = JSON.parse(v);
      return parsed && typeof parsed === 'object' ? (parsed as ParsedHours) : null;
    } catch {
      return null;
    }
  }
  if (typeof v === 'object') return v as ParsedHours;
  return null;
}

/**
 * Gera os slots do dia para uma data.
 * @param dateStr - Data no formato YYYY-MM-DD
 * @param barberId - ID do barbeiro (opcional). Se o barbeiro tiver horário
 *   próprio (barbers.barber_hours), usa o dele; caso contrário usa o horário
 *   padrão da barbearia (settings.barber_hours).
 */
export const getTimeSlotsForDate = async (
  dateStr: string,
  barberId?: string
): Promise<string[]> => {
  // Evita acessar dados expirados
  evictExpiredSlots();

  const cacheKey = `${dateStr}|${barberId || '*'}`;
  const cached = slotsCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < SLOTS_CACHE_TTL) {
    return cached.data;
  }

  const date = new Date(dateStr + 'T12:00:00');
  const dow = String(date.getDay());

  // 1. Horário do barbeiro (override) ou padrão global — JSON completo (inclui lunch_break)
  let parsed: ParsedHours | null = null;
  try {
    if (barberId) {
      const { data } = await supabase
        .from('barbers')
        .select('barber_hours')
        .eq('id', barberId)
        .maybeSingle();
      parsed = normalizeHoursJson(data?.barber_hours);
    }
    if (!parsed) {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'barber_hours')
        .maybeSingle();
      parsed = normalizeHoursJson(data?.value);
    }
  } catch (e) {
    logError(e);
    // fallback abaixo
  }

  if (parsed) {
    const daySchedule = parsed[dow] as DaySchedule | undefined;

    if (!daySchedule?.enabled) {
      cacheSet(cacheKey, []);
      return [];
    }

    let slots = generateHourlySlots(daySchedule.open, daySchedule.close);

    // Filtra horário de almoço (do barbeiro ou global, conforme a fonte)
    const lunchBreak = parsed.lunch_break as LunchBreakCfg | undefined;

    if (lunchBreak?.enabled && lunchBreak.days?.includes(Number(dow))) {
      slots = slots.filter((slot) => slot < lunchBreak.start || slot >= lunchBreak.end);
    }

    cacheSet(cacheKey, slots);
    return slots;
  }

  // 2. Fallback: configurações individuais (legado) — sem lunch_break
  const hours = await getBarberHours();
  const daySchedule = hours[dow];
  if (!daySchedule?.enabled) {
    cacheSet(cacheKey, []);
    return [];
  }
  const slots = generateHourlySlots(daySchedule.open, daySchedule.close);
  cacheSet(cacheKey, slots);
  return slots;
};
