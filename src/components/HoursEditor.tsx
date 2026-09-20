import { useState } from "react";
import type { BarberHour, BusinessHour } from "../types";
import { WEEKDAYS_SHORT } from "../utils/date";

export type HourRow = {
  weekday: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
};

interface HoursEditorProps {
  rows?: HourRow[];
  onChange: (rows: HourRow[]) => void;
}

export function defaultWeekRows(): HourRow[] {
  return Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    open_time: "09:00",
    close_time: "19:00",
    is_closed: weekday === 0,
  }));
}

export function normalizeHours<T extends BusinessHour | BarberHour>(rows: T[]): HourRow[] {
  return rows.map((r) => ({
    weekday: r.weekday,
    open_time: r.open_time.slice(0, 5),
    close_time: r.close_time.slice(0, 5),
    is_closed: r.is_closed,
  }));
}

export function HoursEditor({ rows, onChange }: HoursEditorProps) {
  const [items] = useState<HourRow[]>(() => {
    if (!rows || rows.length === 0) return defaultWeekRows();
    return WEEKDAYS_SHORT.map((_, weekday) => {
      const found = rows.find((r) => r.weekday === weekday);
      return {
        weekday,
        open_time: found?.open_time ?? "09:00",
        close_time: found?.close_time ?? "19:00",
        is_closed: found?.is_closed ?? weekday === 0,
      };
    });
  });

  const update = (weekday: number, patch: Partial<HourRow>) => {
    const next = items.map((r) => (r.weekday === weekday ? { ...r, ...patch } : r));
    onChange(next);
  };

  return (
    <div className="hours-editor">
      <div className="hours-editor__grid hours-editor__grid--head">
        <span>Dia</span>
        <span>Abertura</span>
        <span>Fechamento</span>
        <span>Fechado</span>
      </div>
      {items.map((row) => (
        <div key={row.weekday} className="hours-editor__grid">
          <strong>{WEEKDAYS_SHORT[row.weekday]}</strong>
          <input
            type="time"
            className="input"
            value={row.open_time}
            disabled={row.is_closed}
            aria-label={`Abertura ${WEEKDAYS_SHORT[row.weekday]}`}
            onChange={(e) => update(row.weekday, { open_time: e.target.value })}
          />
          <input
            type="time"
            className="input"
            value={row.close_time}
            disabled={row.is_closed}
            aria-label={`Fechamento ${WEEKDAYS_SHORT[row.weekday]}`}
            onChange={(e) => update(row.weekday, { close_time: e.target.value })}
          />
          <button
            type="button"
            className={`toggle ${row.is_closed ? "is-on" : ""}`}
            role="switch"
            aria-checked={row.is_closed}
            aria-label={`Fechar ${WEEKDAYS_SHORT[row.weekday]}`}
            onClick={() => update(row.weekday, { is_closed: !row.is_closed })}
          >
            <span />
          </button>
        </div>
      ))}
    </div>
  );
}