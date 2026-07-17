import { type FC } from 'react';

interface WeekDay {
  date: Date;
  isToday: boolean;
  isPast: boolean;
  isSelected: boolean;
}

interface WeekDayBarProps {
  days: WeekDay[];
  onSelect: (index: number) => void;
}

const WeekDayBar: FC<WeekDayBarProps> = ({ days, onSelect }) => (
  <div className="flex gap-1.5">
    {days.map((day, idx) => (
      <button
        key={idx}
        onClick={() => !day.isPast && onSelect(idx)}
        disabled={day.isPast}
        title={day.isPast ? 'Dia já encerrado' : ''}
        className={`flex-1 py-4 rounded-lg transition-all duration-200 flex flex-col items-center gap-0.5 relative ${
          day.isPast
            ? 'bg-white/[0.01] text-zinc-700 cursor-not-allowed opacity-30 line-through decoration-1 decoration-zinc-800'
            : day.isSelected
              ? 'bg-[#D4AF37] text-black'
              : day.isToday
                ? 'bg-white/[0.04] text-[#D4AF37]'
                : 'bg-white/[0.02] text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200'
        }`}
      >
        {day.isPast && (
          <span className="absolute top-1 right-1.5 text-[6px] text-zinc-700 font-bold uppercase tracking-widest">
            FIM
          </span>
        )}
        <span
          className={`text-[8px] font-bold uppercase tracking-widest ${day.isSelected ? 'text-black/60' : day.isPast ? 'text-zinc-700' : 'opacity-50'}`}
        >
          {day.date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace(/\./g, '')}
        </span>
        <span className="text-lg font-black">{day.date.getDate()}</span>
      </button>
    ))}
  </div>
);

export default WeekDayBar;
