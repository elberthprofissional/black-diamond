import { getTimeSlotsForDate, isTimeOccupied } from '../../../lib/utils';
import type { Booking, BookingWithClient, Service } from '../../../types';

interface Day {
  fullDate: string;
  dayName: string;
  dayNumber: number;
}

interface MobileDateTimeStepProps {
  nextDays: Day[];
  selectedDate: string;
  selectedTime: string;
  existingBookings: Booking[];
  rescheduleBooking?: BookingWithClient;
  onSelectDate: (date: string) => void;
  onSelectTime: (time: string) => void;
  isPreFilled?: boolean;
  selectedServices?: Service[];
  totalPrice?: number;
  clientName?: string;
}

export default function MobileDateTimeStep({
  nextDays,
  selectedDate,
  selectedTime,
  existingBookings,
  rescheduleBooking,
  onSelectDate,
  onSelectTime,
  isPreFilled = false,
  selectedServices = [],
  totalPrice = 0,
  clientName = '',
}: MobileDateTimeStepProps) {
  const isOccupied = (time: string) => {
    const toCheck = rescheduleBooking
      ? existingBookings.filter(b => b.id !== rescheduleBooking.id)
      : existingBookings;
    return isTimeOccupied(time, toCheck);
  };

  const formattedDate = selectedDate.split('-').reverse().join('/');

  // Summary view when date/time are pre-filled from weekly schedule
  if (isPreFilled && selectedDate && selectedTime) {
    return (
      <div className="space-y-5 flex flex-col">
        <div className="space-y-1 shrink-0">
          <h2 className="text-lg font-bold text-white uppercase tracking-tight">Confirmar</h2>
          <p className="text-xs text-zinc-500">Revise os dados antes de confirmar</p>
        </div>

        <div className="space-y-3">
          {clientName && (
            <div className="flex justify-between items-center py-3 border-b border-white/[0.04]">
              <span className="text-[11px] text-zinc-500 uppercase tracking-wider">Cliente</span>
              <span className="text-[13px] font-semibold text-white">{clientName}</span>
            </div>
          )}
          <div className="flex justify-between items-center py-3 border-b border-white/[0.04]">
            <span className="text-[11px] text-zinc-500 uppercase tracking-wider">Data</span>
            <span className="text-[13px] font-semibold text-white">{formattedDate}</span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-white/[0.04]">
            <span className="text-[11px] text-zinc-500 uppercase tracking-wider">Horário</span>
            <span className="text-[13px] font-semibold text-[#C5A059]">{selectedTime}</span>
          </div>
          <div className="pt-2 space-y-2">
            <span className="text-[11px] text-zinc-500 uppercase tracking-wider">Serviços</span>
            {selectedServices.map(s => (
              <div key={s.id} className="flex justify-between items-center">
                <span className="text-[12px] text-zinc-400">{s.name}</span>
                <span className="text-[12px] font-medium text-white">R$ {Number(s.price).toFixed(0)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center pt-3 border-t border-white/[0.04]">
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Total</span>
            <span className="text-lg font-bold text-[#C5A059]">R$ {totalPrice.toFixed(0)}</span>
          </div>
        </div>
      </div>
    );
  }

  // Normal date/time picker view
  return (
    <div className="space-y-5 h-full flex flex-col">
      {rescheduleBooking ? (
        <div className="p-4 bg-[#111111] border border-[#C5A059]/20 rounded-2xl flex flex-col gap-1.5 shrink-0">
          <span className="text-[8px] font-bold text-[#C5A059] uppercase tracking-[0.25em]">REAGENDANDO ATENDIMENTO</span>
          <h3 className="text-sm font-bold text-white uppercase tracking-wide leading-none">{rescheduleBooking.clients?.name}</h3>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider truncate">{rescheduleBooking.service_ids?.length ? 'Agendamento' : ''}</p>
          <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">
            Original: {new Date(rescheduleBooking.booking_date.replace(/-/g, '/')).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} às {rescheduleBooking.booking_time.slice(0, 5)}
          </p>
        </div>
      ) : (
        <div className="space-y-1 shrink-0">
          <h2 className="text-lg font-bold text-white uppercase tracking-tight">Data e horário</h2>
          <p className="text-xs text-zinc-500">Selecione o melhor dia e horário</p>
        </div>
      )}

      <div className="space-y-2 shrink-0">
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">SELECIONE O DIA</span>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {nextDays.map(day => {
            const isSelected = selectedDate === day.fullDate;
            return (
              <button
                key={day.fullDate}
                onClick={() => onSelectDate(day.fullDate)}
                className={`min-w-[64px] py-3 transition-all duration-300 flex flex-col items-center gap-0.5 rounded-xl border ${
                  isSelected
                    ? 'bg-[#C5A059]/10 border-[#C5A059]/50 text-[#C5A059]'
                    : 'bg-transparent border-white/[0.06] text-zinc-500 hover:text-white hover:border-white/[0.12]'
                }`}
              >
                <span className="text-[8px] font-bold uppercase tracking-widest opacity-60">{day.dayName}</span>
                <span className="text-xl font-bold text-white">{day.dayNumber}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-4 overflow-y-auto flex-1 scrollbar-hide pb-4">
        {selectedDate ? (
          <div className="space-y-2.5">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Horários Disponíveis</span>
            <div className="grid grid-cols-4 gap-2">
              {getTimeSlotsForDate(selectedDate).map(time => {
                const occupied = isOccupied(time);
                const isSelected = selectedTime === time;
                return (
                  <button
                    key={time}
                    type="button"
                    disabled={occupied}
                    onClick={() => onSelectTime(time)}
                    className={`py-3 rounded-xl border text-[11px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                      occupied
                        ? 'text-zinc-800 border-transparent cursor-not-allowed opacity-20 bg-transparent'
                        : isSelected
                          ? 'text-[#C5A059] border-[#C5A059]/50 bg-transparent'
                          : 'text-zinc-400 border-white/[0.06] bg-transparent hover:border-white/[0.12] hover:text-white'
                    }`}
                  >
                    {time}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="py-10 text-center">
            <p className="text-zinc-600 text-xs">Selecione um dia acima para ver os horários.</p>
          </div>
        )}
      </div>
    </div>
  );
}
