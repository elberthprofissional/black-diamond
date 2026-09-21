import { useState } from "react";
import { WEEKDAYS_SHORT, pad, todayISO } from "../../utils/date";
import { Icon } from "./Icon";

interface CalendarProps {
  value: string; // yyyy-mm-dd
  onChange: (date: string) => void;
  min?: string; // yyyy-mm-dd
  max?: string; // yyyy-mm-dd
  enabledWeekdays?: number[]; // getDay (0=dom ... 6=sáb) selecionáveis
}

export function Calendar({ value, onChange, min, max, enabledWeekdays }: CalendarProps) {
  const minimum = min ?? todayISO();
  const [view, setView] = useState(() => {
    const [y, m] = value.split("-").map(Number);
    return new Date(y, m - 1, 1);
  });

  const year = view.getFullYear();
  const month = view.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const minDate = new Date(`${minimum}T00:00:00`);
  const maxDate = max ? new Date(`${max}T00:00:00`) : null;

  const canGoPrev = (() => {
    if (!min) return true;
    return year > minDate.getFullYear() || (year === minDate.getFullYear() && month > minDate.getMonth());
  })();

  const canGoNext = (() => {
    if (!maxDate) return true;
    return year < maxDate.getFullYear() || (year === maxDate.getFullYear() && month < maxDate.getMonth());
  })();

  const cells: (string | null)[] = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      return `${year}-${pad(month + 1)}-${pad(i + 1)}`;
    }),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const selected = value;

  return (
    <div className="calendar">
      <div className="calendar__head">
        <button
          type="button"
          className="icon-btn"
          onClick={() => setView(new Date(year, month - 1, 1))}
          disabled={!canGoPrev}
          aria-label="Mês anterior"
        >
          <Icon name="chevronLeft" size={16} />
        </button>
        <strong className="calendar__month">
          {new Date(year, month, 1).toLocaleDateString("pt-BR", {
            month: "long",
            year: "numeric",
          })}
        </strong>
        <button
          type="button"
          className="icon-btn"
          onClick={() => setView(new Date(year, month + 1, 1))}
          disabled={!canGoNext}
          aria-label="Próximo mês"
        >
          <Icon name="chevronRight" size={16} />
        </button>
      </div>

      <div className="calendar__grid">
        {WEEKDAYS_SHORT.map((w) => (
          <span key={w} className="calendar__dow">
            {w}
          </span>
        ))}
        {cells.map((cell, i) => {
          if (!cell) return <span key={`b${i}`} />;
          const dt = new Date(`${cell}T00:00:00`);
          const closedWeekday = enabledWeekdays && !enabledWeekdays.includes(dt.getDay());
          const disabled = dt < minDate || (maxDate !== null && dt > maxDate) || closedWeekday;
          const isSel = cell === selected;
          const isToday = cell === todayISO();
          return (
            <button
              key={cell}
              type="button"
              className={`calendar__day ${isSel ? "is-selected" : ""} ${
                isToday && !isSel ? "is-today" : ""
              }`}
              disabled={disabled}
              onClick={() => onChange(cell)}
              aria-pressed={isSel}
              aria-label={new Date(`${cell}T00:00:00`).toLocaleDateString("pt-BR")}
            >
              {Number(cell.slice(8))}
            </button>
          );
        })}
      </div>
    </div>
  );
}