import { supabase } from './supabase';

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
      // Validate parsed data has expected structure
      if (typeof parsed === 'object' && parsed !== null) {
        return { ...DEFAULT_HOURS, ...parsed };
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

export const getTimeSlotsForDate = async (dateStr: string): Promise<string[]> => {
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

      if (!daySchedule?.enabled) return [];

      let slots = generateHourlySlots(daySchedule.open, daySchedule.close);

      // Filtra horário de almoço
      const lunchBreak = parsed.lunch_break as
        { enabled: boolean; start: string; end: string; days: number[] } | undefined;

      if (lunchBreak?.enabled && lunchBreak.days?.includes(Number(dow))) {
        slots = slots.filter((slot) => slot < lunchBreak.start || slot >= lunchBreak.end);
      }

      return slots;
    }
  } catch {
    // fallback abaixo
  }

  // Fallback: configurações individuais (legado) — sem lunch_break
  const hours = await getBarberHours();
  const daySchedule = hours[dow];
  if (!daySchedule?.enabled) return [];
  return generateHourlySlots(daySchedule.open, daySchedule.close);
};

/** Fetch slots directly from Supabase settings (for use when RPC fails) */
/**
 * Fetch slots diretamente das configurações individuais do Supabase (fallback quando RPC falha).
 * Agora delega para getTimeSlotsForDate que tem fallback próprio.
 */
export const fetchTimeSlotsForDate = async (dateStr: string): Promise<string[]> => {
  return getTimeSlotsForDate(dateStr);
};

export const formatPhone = (value: string | undefined | null) => {
  if (!value) return '';
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

export const getNextDays = () => {
  const days = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentDay = today.getDay();
  const currentHour = new Date().getHours();

  // Read closing hours from localStorage (set by admin panel)
  let saturdayCloseHour = 18;
  let sundayCloseHour = 14;
  try {
    const saved = localStorage.getItem('barber_hours');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed['6']?.close) {
        saturdayCloseHour = parseInt(parsed['6'].close.split(':')[0], 10);
      }
      if (parsed['0']?.close) {
        sundayCloseHour = parseInt(parsed['0'].close.split(':')[0], 10);
      }
    }
  } catch {
    /* use default */
  }

  // If Saturday after closing or Sunday after closing, start from next week's Monday
  if (
    (currentDay === 6 && currentHour >= saturdayCloseHour) ||
    (currentDay === 0 && currentHour >= sundayCloseHour)
  ) {
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + ((1 - currentDay + 7) % 7 || 7));
    for (let i = 0; i < 7; i++) {
      const date = new Date(nextMonday);
      date.setDate(nextMonday.getDate() + i);
      date.setHours(0, 0, 0, 0);
      const isPast = date.getTime() < today.getTime();
      if (isPast) continue;
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

  // Otherwise start from today (or next valid day)
  const startDate = new Date(today);

  for (let i = 0; i < 14; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    date.setHours(0, 0, 0, 0);

    const isToday = date.getTime() === today.getTime();
    const isPast = date.getTime() < today.getTime();

    // Pula dias que ja passaram
    if (isPast) continue;

    days.push({
      fullDate: getLocalDateString(date),
      dayName: date
        .toLocaleDateString('pt-BR', { weekday: 'short' })
        .replace('.', '')
        .toUpperCase(),
      dayNumber: date.getDate(),
      isToday,
      isPast: false,
    });

    // Stop after 7 available days
    if (days.length >= 7) break;
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
