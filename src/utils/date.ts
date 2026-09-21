// Utilitários de data — trabalham com strings ISO (yyyy-mm-dd) para
// evitar os deslocamentos silenciosos de Date ao construir datas locais.

export const WEEKDAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const WEEKDAYS_FULL = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

export function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

/** Data de hoje no fuso local, como yyyy-mm-dd. */
export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Soma N dias a uma data yyyy-mm-dd (string). */
export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d + days);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function weekdayOf(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}

/** Segunda-feira da semana da data (getDay: 0=dom, 1=seg ... 6=sáb). */
export function mondayOfWeek(iso: string): string {
  return addDaysISO(iso, -((weekdayOf(iso) + 6) % 7));
}

/**
 * Início (segunda) da semana ativa: a semana em curso, ou a próxima quando
 * "hoje" cai em dia fechado após o último dia útil da semana.
 * `openWeekdays` = dias em que a barbearia funciona (getDay: 0=dom ... 6=sáb).
 * Sem horários definido, a semana ativa é sempre a atual.
 */
export function activeWeekStartISO(iso: string, openWeekdays: number[]): string {
  const monday = mondayOfWeek(iso);
  if (!openWeekdays.length) return monday;
  const pos = (dow: number) => (dow === 0 ? 7 : dow);
  const lastOpen = Math.max(...openWeekdays.map(pos));
  const todayPos = pos(weekdayOf(iso));
  return todayPos > lastOpen ? addDaysISO(monday, 7) : monday;
}

/** Último dia (domingo) da semana iniciada em `monday` (yyyy-mm-dd). */
export function sundayOfWeek(monday: string): string {
  return addDaysISO(monday, 6);
}

/**
 * Último dia útil da semana iniciada em `monday`, dado os dias abertos
 * (`openWeekdays` = getDay: 0=dom ... 6=sáb). Sem horários, o domingo.
 */
export function lastOpenOfWeek(monday: string, openWeekdays: number[]): string {
  if (!openWeekdays.length) return sundayOfWeek(monday);
  const pos = (dow: number) => (dow === 0 ? 7 : dow);
  const lastPos = Math.max(...openWeekdays.map(pos));
  const offset = lastPos === 7 ? 6 : lastPos - 1;
  return addDaysISO(monday, offset);
}

export function formatDatePt(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${pad(d)}/${pad(m)}/${y}`;
}

export function formatISOForInput(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "HH:MM" local a partir de um timestamp ISO (timestamptz ou ISO). */
export function timeFromISO(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Início de um dia (timestamp local) como ISO para comparar no banco. */
export function startOfDayISO(iso: string): string {
  return `${iso}T00:00:00`;
}

/** Fim do dia (timestamp local). */
export function endOfDayISO(iso: string): string {
  return `${iso}T23:59:59.999`;
}

/** Converte hora "HH:MM" do input datetime-local para timestamp local ISO. */
export function datetimeLocalToISO(value: string): string {
  const d = new Date(value.replace("T", " "));
  return d.toISOString();
}

/** Cria um valor para input datetime-local a partir de um timestamp. */
export function toDateTimeLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 16);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}