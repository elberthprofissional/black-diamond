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
  <div className="flex gap-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory -mx-4 px-4 lg:mx-0 lg:px-0">
    {days.map((day, idx) => (
      <button
        key={idx}
        onClick={() => !day.isPast && onSelect(idx)}
        disabled={day.isPast}
        title={day.isPast ? 'Dia ja encerrado' : ''}
        className={`snap-start shrink-0 min-w-[72px] flex-1 lg:flex-1 py-4 rounded-xl transition-all duration-200 flex flex-col items-center gap-1 relative ${
          day.isPast
            ? 'bg-white/[0.01] text-zinc-800 cursor-not-allowed opacity-30'
            : day.isSelected
              ? 'bg-[#D4AF37] text-black'
              : day.isToday
                ? 'bg-white/[0.05] text-[#D4AF37] border border-[#D4AF37]/20'
                : 'bg-white/[0.02] text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200'
        }`}
      >
        {day.isPast && (
          <span className="absolute top-1.5 right-2 text-[9px] sm:text-[8px] text-zinc-800 font-black uppercase tracking-widest">
            FIM
          </span>
        )}
        <span
          className={`text-[10px] sm:text-[9px] font-black uppercase tracking-[0.12em] ${day.isSelected ? 'text-black/50' : day.isPast ? 'text-zinc-800' : 'opacity-40'}`}
        >
          {day.date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace(/\./g, '')}
        </span>
        <span className="text-xl font-black">{day.date.getDate()}</span>
      </button>
    ))}
  </div>
);

export default WeekDayBar;
