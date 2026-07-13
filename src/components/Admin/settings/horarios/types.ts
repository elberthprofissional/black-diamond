/* ─── Tipos para configuracao de horarios ─── */

export interface DayHours {
  enabled: boolean;
  open: string;
  close: string;
}

export interface LunchBreak {
  enabled: boolean;
  start: string;
  end: string;
  days: number[];
}

export type DayKey = '0' | '1' | '2' | '3' | '4' | '5' | '6';

export interface HoursData {
  '0': DayHours;
  '1': DayHours;
  '2': DayHours;
  '3': DayHours;
  '4': DayHours;
  '5': DayHours;
  '6': DayHours;
  lunch_break?: LunchBreak;
}

/* ─── Constantes ─── */

export const DEFAULT_HOURS: HoursData = {
  '1': { enabled: true, open: '08:00', close: '18:00' },
  '2': { enabled: true, open: '08:00', close: '18:00' },
  '3': { enabled: true, open: '08:00', close: '18:00' },
  '4': { enabled: true, open: '08:00', close: '18:00' },
  '5': { enabled: true, open: '08:00', close: '18:00' },
  '6': { enabled: true, open: '08:00', close: '18:00' },
  '0': { enabled: false, open: '09:00', close: '14:00' },
};

export const DAYS_ORDER: DayKey[] = ['1', '2', '3', '4', '5', '6', '0'];

export const DAY_NAMES: Record<string, string> = {
  '1': 'Segunda',
  '2': 'Terça',
  '3': 'Quarta',
  '4': 'Quinta',
  '5': 'Sexta',
  '6': 'Sábado',
  '0': 'Domingo',
};

// Gera opcoes de horario de 06:00 ate 23:30 (36 opcoes)
export const TIME_OPTIONS = Array.from({ length: 36 }, (_, i) => {
  const h = Math.floor(i / 2) + 6;
  const m = i % 2 === 0 ? '00' : '30';
  if (h > 23) return null;
  return `${String(h).padStart(2, '0')}:${m}`;
}).filter(Boolean) as string[];

export const inputClass =
  'bg-transparent border-b border-white/[0.08] focus:border-[#C5A059]/40 pb-1 text-[13px] text-zinc-300 outline-none transition-all text-center w-9 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';
