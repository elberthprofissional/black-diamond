import { getTimeSlotsForDate, isTimeOccupied } from '../../../lib/utils';
import type { Booking } from '../../../types';

interface Day {
  fullDate: string;
  dayName: string;
  dayNumber: number;
}

interface DesktopDateTimeStepProps {
  nextDays: Day[];
  selectedDate: string;
  selectedTime: string;
  existingBookings: Booking[];
  rescheduleBookingId?: string;
  onSelectDate: (date: string) => void;
  onSelectTime: (time: string) => void;
  onFinish: () => void;
  isSubmitting: boolean;
  isStepValid: (step: number) => boolean;
}

export default function DesktopDateTimeStep({
  nextDays,
  selectedDate,
  selectedTime,
  existingBookings,
  rescheduleBookingId,
  onSelectDate,
  onSelectTime,
  onFinish,
  isSubmitting,
  isStepValid,
}: DesktopDateTimeStepProps) {
  const isOccupied = (time: string) => {
    const toCheck = rescheduleBookingId
      ? existingBookings.filter(b => b.id !== rescheduleBookingId)
      : existingBookings;
    return isTimeOccupied(time, toCheck);
  };

  return (
    <div className="space-y-6 lg:space-y-10 h-full flex flex-col overflow-visible">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold uppercase tracking-tight">ESCOLHA DATA E HORÁRIO</h2>
        <p className="text-zinc-500 text-sm">Defina o dia e horário do agendamento.</p>
      </div>

      <div className="space-y-3">
        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.3em] block pl-0.5">Selecione o Dia</span>
        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-2 px-2">
          {nextDays.map(day => {
            const isSelected = selectedDate === day.fullDate;
            return (
              <button
                key={day.fullDate}
                type="button"
                onClick={() => onSelectDate(day.fullDate)}
                className={`flex flex-col items-center gap-1 select-none cursor-pointer group shrink-0 p-4 min-w-[75px] transition-all duration-300 border ${
                  isSelected
                    ? 'border-[#C5A059] bg-[#C5A059]/[0.04] text-[#C5A059]'
                    : 'border-white/[0.06] bg-[#111111] text-zinc-500 hover:border-white/[0.12] hover:text-white'
                }`}
              >
                <span className="text-[9px] font-bold tracking-widest uppercase">{day.dayName}</span>
                <span className="text-2xl font-light">{day.dayNumber}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-4 pr-1 pb-0">
        {selectedDate ? (
          <div className="flex flex-col gap-3">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.3em] pl-0.5">
              Horários Disponíveis
            </span>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {getTimeSlotsForDate(selectedDate).map(time => {
                const occupied = isOccupied(time);
                const isSelected = selectedTime === time;
                return (
                  <button
                    key={time}
                    type="button"
                    disabled={occupied}
                    onClick={() => onSelectTime(time)}
                    className={`py-4 border text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                      occupied
                        ? 'text-zinc-800/10 border-transparent cursor-not-allowed line-through opacity-20 bg-transparent'
                        : isSelected
                          ? 'text-[#C5A059] border-[#C5A059] bg-[#C5A059]/[0.04] font-black'
                          : 'text-zinc-400 border-white/[0.06] bg-[#111111] hover:border-white/[0.12] hover:text-white'
                    }`}
                  >
                    {time}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-zinc-500 text-xs py-4 text-center">Selecione um dia da semana acima para ver os horários disponíveis.</p>
        )}
      </div>

      <div className="pt-6 border-t border-white/[0.04]">
        <button
          type="button"
          onClick={onFinish}
          disabled={isSubmitting || !selectedTime || !isStepValid(1) || !isStepValid(2) || !isStepValid(3)}
          className={`px-10 py-4 text-xs font-bold uppercase tracking-[0.3em] transition-all duration-300 cursor-pointer ${
            isSubmitting || !selectedTime || !isStepValid(1) || !isStepValid(2) || !isStepValid(3)
              ? 'bg-[#111111] text-zinc-600 border border-white/[0.04] opacity-30 cursor-not-allowed'
              : 'bg-white text-black hover:bg-[#C5A059] hover:text-black active:scale-[0.98]'
          }`}
        >
          {isSubmitting ? 'CONFIRMANDO...' : 'FINALIZAR RESERVA'}
        </button>
      </div>
    </div>
  );
}
