import { supabase } from './supabase';
import { MASK_SENSITIVE_DATA } from './constants';

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
const getBarberHours = async (): Promise<HoursData> => {
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
  } catch {
    // keep default hours
  }

  return DEFAULT_HOURS;
};

// Cache for getTimeSlotsForDate (TTL: 5 minutes)
const slotsCache = new Map<string, { data: string[]; ts: number }>();
const SLOTS_CACHE_TTL = 5 * 60 * 1000;

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

      slotsCache.set(dateStr, { data: slots, ts: Date.now() });
      return slots;
    }
  } catch {
    // fallback abaixo
  }

  // Fallback: configurações individuais (legado) — sem lunch_break
  const hours = await getBarberHours();
  const daySchedule = hours[dow];
  if (!daySchedule?.enabled) {
    slotsCache.set(dateStr, { data: [], ts: Date.now() });
    return [];
  }
  const slots = generateHourlySlots(daySchedule.open, daySchedule.close);
  slotsCache.set(dateStr, { data: slots, ts: Date.now() });
  return slots;
};

export const maskPhone = (phone: string | null | undefined): string => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 0) return '';
  const sliceStart = cleaned.length >= 11 ? cleaned.length - 11 : 0;
  const local = cleaned.slice(sliceStart);
  if (local.length >= 2) {
    return `(${local.slice(0, 2)}) 9****-****`;
  }
  return '(**) *****-****';
};

export const formatPhone = (value: string | undefined | null) => {
  if (!value) return '';
  if (MASK_SENSITIVE_DATA) {
    return maskPhone(value);
  }
  const digits = value.replace(/\D/g, '');
  let d = digits;
  if (d.length > 11) d = d.slice(0, 11);

  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

export const getLocalDateString = (d: Date = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export interface NextDaysConfig {
  saturdayCloseHour?: number;
  sundayEnabled?: boolean;
}

export const getNextDays = (config?: NextDaysConfig | string) => {
  const days = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentDay = today.getDay();
  const currentHour = new Date().getHours();

  // Aceita string JSON (legado) ou objeto config
  let saturdayCloseHour = 18;
  let sundayEnabled = false;
  if (typeof config === 'string') {
    try {
      const parsed = JSON.parse(config);
      if (parsed['6']?.close) {
        saturdayCloseHour = parseInt(parsed['6'].close.split(':')[0], 10);
      }
      if (parsed['0']) {
        sundayEnabled = parsed['0'].enabled !== false;
      }
    } catch {
      /* use defaults */
    }
  } else if (config) {
    saturdayCloseHour = config.saturdayCloseHour ?? 18;
    sundayEnabled = config.sundayEnabled ?? false;
  }

  // Sábado após fechar: mostra a próxima semana (começa segunda)
  if (currentDay === 6 && currentHour >= saturdayCloseHour) {
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + ((8 - currentDay) % 7 || 7)); // sempre +2 dias (dom -> seg)
    const totalDays = sundayEnabled ? 7 : 6;
    for (let i = 0; i < totalDays; i++) {
      const date = new Date(nextMonday);
      date.setDate(nextMonday.getDate() + i);
      date.setHours(0, 0, 0, 0);
      days.push({
        fullDate: getLocalDateString(date),
        dayName: date
          .toLocaleDateString('pt-BR', { weekday: 'short' })
          .replace('.', '')
          .toUpperCase(),
        dayNumber: date.getDate(),
        isToday: false,
        isPast: false,
      });
    }
    return days;
  }

  // Domingo: se NÃO estiver habilitado, pula para a próxima semana
  if (currentDay === 0 && !sundayEnabled) {
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + ((1 - currentDay + 7) % 7));
    for (let i = 0; i < 6; i++) {
      const date = new Date(nextMonday);
      date.setDate(nextMonday.getDate() + i);
      date.setHours(0, 0, 0, 0);
      days.push({
        fullDate: getLocalDateString(date),
        dayName: date
          .toLocaleDateString('pt-BR', { weekday: 'short' })
          .replace('.', '')
          .toUpperCase(),
        dayNumber: date.getDate(),
        isToday: false,
        isPast: false,
      });
    }
    return days;
  }

  // De segunda a domingo (ou só até sábado se domingo desabilitado): mostra de HOJE até o ÚLTIMO DIA HABILITADO
  const lastDay = sundayEnabled ? 0 : 6;
  const daysUntilLast = (lastDay - currentDay + 7) % 7;
  for (let i = 0; i <= daysUntilLast; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    date.setHours(0, 0, 0, 0);

    days.push({
      fullDate: getLocalDateString(date),
      dayName: date
        .toLocaleDateString('pt-BR', { weekday: 'short' })
        .replace('.', '')
        .toUpperCase(),
      dayNumber: date.getDate(),
      isToday: i === 0,
      isPast: false,
    });
  }
  return days;
};

export const isTimeOccupied = (
  time: string,
  bookings: { booking_time: string; status: string }[]
) => {
  return bookings.some((b) => {
    const bookingTime = b.booking_time.slice(0, 5);
    return bookingTime === time && b.status !== 'cancelled';
  });
};

const ERROR_MESSAGES: Record<string, string> = {
  'Failed to fetch': 'Sem conexão com o servidor. Verifique sua internet.',
  NetworkError: 'Erro de rede. Tente novamente.',
  'invalid input': 'Dados inválidos. Verifique os campos.',
  'permission denied': 'Sem permissão para esta ação.',
  'JWT expired': 'Sessão expirada. Faça login novamente.',
  'new row violates row-level security': 'Sem permissão para esta ação.',
  'row-level security': 'Sem permissão para esta ação.',
  'violates foreign key': 'Erro de integridade dos dados.',
  'duplicate key': 'Este telefone já está cadastrado para outro cliente.',
  unique_violation: 'Este telefone já está cadastrado para outro cliente.',
};

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    const msg = error.message;
    if (msg.includes('horário acabou de ser preenchido')) {
      return 'Este horário acabou de ser preenchido. Escolha outro.';
    }
    if (msg.includes('Limite de 3 agendamentos')) {
      return 'Limite de 3 agendamentos por dia atingido.';
    }
    if (msg.includes('Informe')) return msg; // client-side validation messages
    for (const [key, value] of Object.entries(ERROR_MESSAGES)) {
      if (msg.toLowerCase().includes(key.toLowerCase())) return value;
    }
    return msg || 'Erro inesperado. Tente novamente.';
  }
  return 'Erro inesperado. Tente novamente.';
};

/** Converts "YYYY-MM-DD" to "DD/MM/YYYY" */
export const formatDateBR = (dateStr: string): string => {
  return dateStr.split('-').reverse().join('/');
};

export const maskName = (name: string | null | undefined): string => {
  if (!name) return '';
  if (name === 'BLOQUEADO') return name;
  const parts = name.trim().split(/\s+/);
  return parts
    .map((part) => {
      if (part.length <= 1) return part;
      if (part.length === 2) return part[0] + '*';
      return part.slice(0, 1) + '*'.repeat(part.length - 1);
    })
    .join(' ');
};

export const maskEmail = (email: string | null | undefined): string => {
  if (!email) return '';
  const [user, domain] = email.split('@');
  if (!user || !domain) return '***@***.com';
  if (user.length <= 2) return `${user[0]}*@${domain}`;
  return `${user.slice(0, 2)}***@${domain}`;
};

/**
 * Returns first name + last name only (e.g. "Felipe Silva Figueiredo" → "Felipe Figueiredo").
 * If name has 1 or 2 words, returns as-is.
 */
export const formatDisplayName = (name: string | null | undefined): string => {
  if (!name) return '';
  if (MASK_SENSITIVE_DATA) {
    return maskName(name);
  }
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 2) return name.trim();
  return `${parts[0]} ${parts[parts.length - 1]}`;
};
