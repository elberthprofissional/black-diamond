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