import { useState, useEffect } from 'react';
import { getTimeSlotsForDate, isTimeOccupied } from '../../../lib/utils';
import type { Booking, Service } from '../../../types';

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
  isPreFilled?: boolean;
  selectedServices?: Service[];
  totalPrice?: number;
  clientName?: string;
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
  isPreFilled = false,
  selectedServices = [],
  totalPrice = 0,
  clientName = '',
}: DesktopDateTimeStepProps) {
  const [timeSlots, setTimeSlots] = useState<string[]>([]);

  useEffect(() => {
    if (selectedDate) {
      let active = true;
      getTimeSlotsForDate(selectedDate).then((slots) => {
        if (active) setTimeSlots(slots);
      });
      return () => {
        active = false;
      };
    }
  }, [selectedDate]);

  const isOccupied = (time: string) => {
    const toCheck = rescheduleBookingId
      ? existingBookings.filter((b) => b.id !== rescheduleBookingId)
      : existingBookings;
    return isTimeOccupied(time, toCheck);
  };

  const formattedDate = selectedDate.split('-').reverse().join('/');

  // Summary view when date/time are pre-filled from weekly schedule
  if (isPreFilled && selectedDate && selectedTime) {
    return (
      <div className="space-y-6 h-full flex flex-col">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-white">Confirmar Agendamento</h2>
          <p className="text-[13px] text-zinc-500">Revise os dados antes de confirmar.</p>
        </div>

        <div className="space-y-4 flex-1">
          {clientName && (
            <div className="flex justify-between items-center py-2 border-b border-white/[0.04]">
              <span className="text-[12px] text-zinc-500">Cliente</span>
              <span className="text-[14px] font-semibold text-white">{clientName}</span>
            </div>
          )}
          <div className="flex justify-between items-center py-2 border-b border-white/[0.04]">
            <span className="text-[12px] text-zinc-500">Data</span>
            <span className="text-[14px] font-semibold text-white">{formattedDate}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-white/[0.04]">
            <span className="text-[12px] text-zinc-500">Horário</span>
            <span className="text-[14px] font-semibold text-[#C5A059]">{selectedTime}</span>
          </div>
          <div className="pt-2 space-y-2">
            <span className="text-[12px] text-zinc-500">Serviços</span>
            {selectedServices.map((s) => (
              <div key={s.id} className="flex justify-between items-center">
                <span className="text-[13px] text-zinc-400">{s.name}</span>
                <span className="text-[13px] font-medium text-white">
                  R$ {Number(s.price).toFixed(0)}
                </span>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center pt-3 border-t border-white/[0.04]">
            <span className="text-[12px] font-bold text-zinc-500 uppercase tracking-wider">
              Total
            </span>
            <span className="text-xl font-bold text-[#C5A059]">R$ {totalPrice.toFixed(0)}</span>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={onFinish}
            disabled={isSubmitting || !isStepValid(1) || !isStepValid(2)}
            className="h-13 px-10 bg-[#C5A059] text-black text-[12px] font-bold uppercase tracking-wider rounded-xl hover:bg-[#A68233] transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-[#C5A059]/20 hover:shadow-xl hover:shadow-[#C5A059]/30"
          >
            {isSubmitting ? 'Confirmando...' : 'Confirmar Agendamento'}
          </button>
        </div>
      </div>
    );
  }

  // Normal date/time picker view
  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="space-y-1">
        <h2 className="text-xl font-bold tracking-tight text-white">Data e Horário</h2>
        <p className="text-[13px] text-zinc-500">Defina o dia e horário do agendamento.</p>
      </div>

      {/* Date Selection */}
      <div className="space-y-2">
        <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Dia</span>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {nextDays.map((day) => {
            const isSelected = selectedDate === day.fullDate;
            return (
              <button
                key={day.fullDate}
                type="button"
                onClick={() => onSelectDate(day.fullDate)}
                className={`flex flex-col items-center gap-1 px-4 py-3 rounded-xl transition-all cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-[#C5A059]/10 border border-[#C5A059]/30 text-[#C5A059]'
                    : 'bg-white/[0.02] border border-white/[0.04] text-zinc-500 hover:text-white hover:border-white/[0.08]'
                }`}
              >
                <span className="text-[10px] font-medium uppercase">{day.dayName}</span>
                <span className="text-xl font-semibold">{day.dayNumber}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Time Selection */}
      <div className="space-y-2">
        <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
          Horários
        </span>
        {selectedDate ? (
          <div className="grid grid-cols-5 gap-2">
            {timeSlots.map((time) => {
              const occupied = isOccupied(time);
              const isSelected = selectedTime === time;
              return (
                <button
                  key={time}
                  type="button"
                  disabled={occupied}
                  onClick={() => onSelectTime(time)}
                  className={`py-3 rounded-xl text-[13px] font-medium transition-all cursor-pointer ${
                    occupied
                      ? 'text-zinc-700 cursor-not-allowed line-through opacity-30'
                      : isSelected
                        ? 'bg-[#C5A059]/10 border border-[#C5A059]/30 text-[#C5A059]'
                        : 'bg-white/[0.02] border border-white/[0.04] text-zinc-400 hover:text-white hover:border-white/[0.08]'
                  }`}
                >
                  {time}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-[13px] text-zinc-600 py-4">Selecione um dia acima.</p>
        )}
      </div>

      <div className="pt-2">
        <button
          type="button"
          onClick={onFinish}
          disabled={
            isSubmitting || !selectedTime || !isStepValid(1) || !isStepValid(2) || !isStepValid(3)
          }
          className="h-13 px-10 bg-[#C5A059] text-black text-[12px] font-bold uppercase tracking-wider rounded-xl hover:bg-[#A68233] transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-[#C5A059]/20 hover:shadow-xl hover:shadow-[#C5A059]/30"
        >
          {isSubmitting ? 'Confirmando...' : 'Confirmar Agendamento'}
        </button>
      </div>
    </div>
  );
}
