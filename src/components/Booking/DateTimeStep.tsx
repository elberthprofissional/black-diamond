import React from 'react';
import { isTimeOccupied } from '../../lib/utils';

interface DayInfo {
  fullDate: string;
  dayName: string;
  dayNumber: number;
  isToday: boolean;
  isPast: boolean;
}

interface DateTimeStepProps {
  nextDays: DayInfo[];
  selectedDate: string;
  selectedTime: string;
  onSelectDate: (date: string) => void;
  onSelectTime: (time: string) => void;
  availableSlots: string[];
  existingBookings: { booking_time: string; status: string }[];
  layout: 'desktop' | 'mobile';
  dateContainerRef?: React.RefObject<HTMLDivElement | null>;
  onMouseDown?: (e: React.MouseEvent) => void;
  onMouseLeave?: () => void;
  onMouseUp?: () => void;
  onMouseMove?: (e: React.MouseEvent) => void;
}

const MONTH_NAMES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

const DateTimeStep: React.FC<DateTimeStepProps> = ({
  nextDays,
  selectedDate,
  selectedTime,
  onSelectDate,
  onSelectTime,
  availableSlots,
  existingBookings,
  layout,
  dateContainerRef,
  onMouseDown,
  onMouseLeave,
  onMouseUp,
  onMouseMove,
}) => {
  if (layout === 'desktop') {
    return (
      <>
        <div className="flex gap-1.5 mb-12" role="radiogroup" aria-label="Selecione uma data">
          {nextDays.map((day) => {
            const isSelected = selectedDate === day.fullDate;
            return (
              <button
                key={day.fullDate}
                onClick={() => onSelectDate(day.fullDate)}
                disabled={day.isPast}
                role="radio"
                aria-checked={isSelected}
                aria-label={`${day.dayName} ${day.dayNumber}${day.isToday ? ' (hoje)' : ''}${day.isPast ? ' (indisponível)' : ''}`}
                className={`flex-1 py-4 rounded-lg transition-all duration-200 flex flex-col items-center gap-0.5 ${
                  day.isPast
                    ? 'text-zinc-700 opacity-40 cursor-not-allowed'
                    : isSelected
                      ? 'bg-[#C5A059] text-black'
                      : day.isToday
                        ? 'bg-white/[0.04] text-[#C5A059]'
                        : 'bg-white/[0.02] text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200'
                }`}
              >
                <span className={`text-[8px] font-bold uppercase tracking-widest ${isSelected ? 'text-black/60' : 'opacity-50'}`}>{day.dayName}</span>
                <span className="text-lg font-black">{day.dayNumber}</span>
              </button>
            );
          })}
        </div>

        <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-[0.25em] mb-4">Horários</p>
        {selectedDate ? (
          <div className="grid grid-cols-7 gap-2" role="radiogroup" aria-label="Horários disponíveis">
            {availableSlots.map((time) => {
              const occupied = isTimeOccupied(time, existingBookings);
              const isSelected = selectedTime === time;
              return (
                <button
                  key={time}
                  disabled={occupied}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => onSelectTime(time)}
                  aria-label={`${time}${occupied ? ' (indisponível)' : ''}${isSelected ? ' (selecionado)' : ''}`}
                  className={`py-3 rounded-lg text-[12px] font-medium transition-all duration-200 border border-white/[0.08] ${
                    occupied 
                      ? 'text-zinc-800 cursor-not-allowed line-through' 
                      : isSelected 
                        ? 'text-black bg-[#C5A059]' 
                        : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  {time}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-zinc-500 text-xs py-4 text-center">Selecione um dia da semana acima para ver os horários disponíveis.</p>
        )}
      </>
    );
  }

  return (
    <div className="space-y-6 w-full">
      <div 
        ref={dateContainerRef}
        onMouseDown={onMouseDown}
        onMouseLeave={onMouseLeave}
        onMouseUp={onMouseUp}
        onMouseMove={onMouseMove}
        role="radiogroup"
        aria-label="Selecione uma data"
        className="flex overflow-x-auto gap-2.5 pb-2 scrollbar-hide -mx-5 px-5 snap-x shrink-0 cursor-grab active:cursor-grabbing select-none"
      >
        {nextDays.map(day => {
          const isSelected = selectedDate === day.fullDate;
          const monthIndex = parseInt(day.fullDate.split('-')[1]) - 1;
          return (
            <button 
              key={day.fullDate} 
              onClick={() => onSelectDate(day.fullDate)}
              disabled={day.isPast}
              role="radio"
              aria-checked={isSelected}
              aria-label={`${day.dayName} ${day.dayNumber}${day.isToday ? ' (hoje)' : ''}${day.isPast ? ' (indisponível)' : ''}`}
              className={`w-[72px] h-[88px] shrink-0 snap-center flex flex-col items-center justify-center gap-1 rounded-xl transition-all duration-300 border ${
                day.isPast
                  ? 'opacity-30 cursor-not-allowed border-transparent bg-transparent'
                  : isSelected 
                    ? 'bg-[#C5A059] border-[#C5A059] text-black' 
                    : day.isToday
                      ? 'bg-[#C5A059]/10 border border-[#C5A059]/30 text-[#C5A059]'
                      : 'bg-[#0d0d0d] border border-white/[0.04] text-zinc-400 hover:bg-[#121212]'
              }`}
            >
              <span className={`text-[9px] font-bold uppercase tracking-widest ${
                isSelected ? 'text-black/60' : day.isToday ? 'text-[#C5A059]' : 'text-zinc-500'
              }`}>{day.dayName}</span>
              
              <span className={`text-[19px] font-black leading-none ${
                isSelected ? 'text-black' : day.isToday ? 'text-[#C5A059]' : 'text-white'
              }`}>{day.dayNumber}</span>
              
              <span className={`text-[8px] font-bold uppercase tracking-wider ${
                isSelected ? 'text-black/50' : 'text-zinc-600'
              }`}>{MONTH_NAMES[monthIndex]}</span>
            </button>
          );
        })}
      </div>

      <div>
        <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Horários</p>
        {selectedDate ? (
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Horários disponíveis">
            {availableSlots.map(time => {
              const occupied = isTimeOccupied(time, existingBookings);
              const isSelected = selectedTime === time;
              return (
                <button
                  key={time}
                  type="button"
                  disabled={occupied}
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => onSelectTime(time)}
                  aria-label={`${time}${occupied ? ' (indisponível)' : ''}${isSelected ? ' (selecionado)' : ''}`}
                  className={`py-3 rounded-xl text-[12px] font-bold transition-all duration-200 border ${
                    occupied 
                      ? 'text-zinc-800 bg-transparent cursor-not-allowed line-through opacity-20 border-transparent' 
                      : isSelected 
                        ? 'bg-[#C5A059] border-[#C5A059] text-black' 
                        : 'bg-[#0d0d0d] border-white/[0.04] text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {time}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-zinc-600 text-[11px] py-8 text-center">Selecione uma data acima</p>
        )}
      </div>
    </div>
  );
};

export default DateTimeStep;
