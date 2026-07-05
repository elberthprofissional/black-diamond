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
 * Gera slots de hora em hora a partir de um horário de abertura e fechamento.
 * Suporta horários quebrados (ex: 08:30 → slots a partir de 09:00).
 */
function generateHourlySlots(open: string, close: string): string[] {
  const [openH = 8, openM = 0] = open.split(':').map(Number);
  const [closeH = 18, closeM = 0] = close.split(':').map(Number);

  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  // Arredonda PRA CIMA: se abre 08:30, o primeiro slot é 09:00 (próxima hora cheia)
  const firstSlotMinutes = openMinutes % 60 === 0
    ? openMinutes
    : openMinutes + (60 - (openMinutes % 60));

  const slots: string[] = [];
  for (let m = firstSlotMinutes; m < closeMinutes; m += 60) {
    const h = Math.floor(m / 60);
    slots.push(`${String(h).padStart(2, '0')}:00`);
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
      .in('key', ['working_days', 'opening_time', 'closing_time', 'saturday_opening', 'saturday_closing']);

    if (rows && rows.length > 0) {
      const map: Record<string, string> = {};
      for (const row of rows) map[row.key] = row.value;

      const workingDays = (map.working_days || '1,2,3,4,5,6').split(',').map(d => d.trim());
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
  } catch (err) {
    console.error('[getBarberHours] Erro ao buscar horários:', err);
  }

  return DEFAULT_HOURS;
};

export const getTimeSlotsForDate = async (dateStr: string): Promise<string[]> => {
  const date = new Date(dateStr + 'T12:00:00');
  const dow = String(date.getDay());
  const hours = await getBarberHours();
  const daySchedule = hours[dow];

  if (!daySchedule || !daySchedule.enabled) return [];

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

export const getPeriod = (time: string) => {
  const hour = parseInt(time.split(':')[0], 10);
  if (isNaN(hour)) return 'Manhã';
  if (hour < 12) return 'Manhã';
  if (hour < 18) return 'Tarde';
  return 'Noite';
};

export const formatPhone = (value: string | undefined | null) => {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  let d = digits;
  if (d.length > 11) d = d.slice(0, 11);

  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
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
  
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);

  // Se for sábado após as 18:00 (fechamento) ou se for domingo, a agenda abre para a próxima semana
  if (currentDay === 0 || (currentDay === 6 && currentHour >= 18)) {
    monday.setDate(monday.getDate() + 7);
  }

  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    date.setHours(0, 0, 0, 0);
    
    const isToday = date.getTime() === today.getTime();
    const isPast = date.getTime() < today.getTime();

    // Pula dias que já passaram
    if (isPast) continue;

    days.push({
      fullDate: getLocalDateString(date),
      dayName: date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase(),
      dayNumber: date.getDate(),
      isToday,
      isPast: false,
    });
  }
  return days;
};

export const isTimeOccupied = (time: string, bookings: { booking_time: string; status: string }[]) => {
  return bookings.some(b => {
    const bookingTime = b.booking_time.slice(0, 5);
    return bookingTime === time && b.status !== 'cancelled';
  });
};

const ERROR_MESSAGES: Record<string, string> = {
  'Failed to fetch': 'Sem conexão com o servidor. Verifique sua internet.',
  'NetworkError': 'Erro de rede. Tente novamente.',
  'invalid input': 'Dados inválidos. Verifique os campos.',
  'permission denied': 'Sem permissão para esta ação.',
  'JWT expired': 'Sessão expirada. Faça login novamente.',
  'new row violates row-level security': 'Sem permissão para esta ação.',
  'row-level security': 'Sem permissão para esta ação.',
  'violates foreign key': 'Erro de integridade dos dados.',
  'duplicate key': 'Este telefone já está cadastrado para outro cliente.',
  'unique_violation': 'Este telefone já está cadastrado para outro cliente.',
};

export const generateGoogleCalendarUrl = (
  serviceName: string,
  date: string,
  time: string,
  duration: number
): string => {
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);

  const startDate = new Date(year, month - 1, day, hours, minutes);
  const endDate = new Date(startDate.getTime() + duration * 60000);

  const formatGCalDate = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
  };

  const title = `${serviceName} - Black Diamond`;
  const details = `Seu agendamento na Black Diamond Barbearia.\n\nServiço: ${serviceName}\nHorário: ${time}\nDuração: ${duration} minutos`;
  const start = formatGCalDate(startDate);
  const end = formatGCalDate(endDate);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${start}/${end}&details=${encodeURIComponent(details)}`;
};

export const generateIcsFile = (
  serviceName: string,
  date: string,
  time: string,
  duration: number
) => {
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);

  const startDate = new Date(year, month - 1, day, hours, minutes);
  const endDate = new Date(startDate.getTime() + duration * 60000);

  const formatIcsDate = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
  };

  const now = new Date();
  const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@blackdiamond`;

  const escapeIcsText = (text: string) =>
    text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Black Diamond//Barbearia//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatIcsDate(now)}`,
    `DTSTART;TZID=America/Sao_Paulo:${formatIcsDate(startDate)}`,
    `DTEND;TZID=America/Sao_Paulo:${formatIcsDate(endDate)}`,
    `SUMMARY:${escapeIcsText(`${serviceName} - Black Diamond`)}`,
    `DESCRIPTION:${escapeIcsText('Seu agendamento na Black Diamond Barbearia.')}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT30M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Lembrete do seu agendamento',
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    'DESCRIPTION:Seu agendamento é amanhã',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `BlackDiamond-${serviceName.replace(/\s+/g, '-')}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    const msg = error.message;
    if (msg.includes('horário acabou de ser preenchido')) return 'Este horário acabou de ser preenchido. Escolha outro.';
    if (msg.includes('Limite de 3 agendamentos')) return 'Limite de 3 agendamentos por dia atingido.';
    if (msg.includes('Informe')) return msg; // client-side validation messages
    for (const [key, value] of Object.entries(ERROR_MESSAGES)) {
      if (msg.toLowerCase().includes(key.toLowerCase())) return value;
    }
    return msg || 'Erro inesperado. Tente novamente.';
  }
  return 'Erro inesperado. Tente novamente.';
};
