import { useState, useEffect } from 'react';
import { getTimeSlotsForDate, isTimeOccupied, formatDisplayName } from '../../../lib/utils';
import { useIsDesktop } from '../../../hooks/useIsDesktop';
import type { Booking, BookingWithClient, Service } from '../../../types';

interface Day {
  fullDate: string;
  dayName: string;
  dayNumber: number;
}

interface ResponsiveDateTimeStepProps {
  nextDays: Day[];
  selectedDate: string;
  selectedTime: string;
  existingBookings: Booking[];
  rescheduleBookingId?: string;
  rescheduleBooking?: BookingWithClient;
  onSelectDate: (date: string) => void;
  onSelectTime: (time: string) => void;
  onFinish?: () => void;
  isSubmitting?: boolean;
  isStepValid?: (step: number) => boolean;
  isPreFilled?: boolean;
  selectedServices?: Service[];
  totalPrice?: number;
  clientName?: string;
}

export default function ResponsiveDateTimeStep({
  nextDays,
  selectedDate,
  selectedTime,
  existingBookings,
  rescheduleBookingId,
  rescheduleBooking,
  onSelectDate,
  onSelectTime,
  onFinish,
  isSubmitting = false,
  isStepValid,
  isPreFilled = false,
  selectedServices = [],
  totalPrice = 0,
  clientName = '',
}: ResponsiveDateTimeStepProps) {
  const isDesktop = useIsDesktop();
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
      : rescheduleBooking
        ? existingBookings.filter((b) => b.id !== rescheduleBooking.id)
        : existingBookings;
    return isTimeOccupied(time, toCheck);
  };

  const formattedDate = selectedDate.split('-').reverse().join('/');

  // Summary view when date/time are pre-filled
  if (isPreFilled && selectedDate && selectedTime) {
    return (
      <div className="space-y-6 h-full flex flex-col">
        <div className="space-y-1">
          <h2
            className={`font-bold tracking-tight text-white ${isDesktop ? 'text-xl' : 'text-lg uppercase'}`}
          >
            {isDesktop ? 'Confirmar Agendamento' : 'Confirmar'}
          </h2>
          <p className={`text-zinc-500 ${isDesktop ? 'text-[13px]' : 'text-xs'}`}>
            Revise os dados antes de confirmar.
          </p>
        </div>

        <div className="space-y-4 flex-1">
          {clientName && (
            <div className="flex justify-between items-center py-2 border-b border-white/[0.04]">
              <span className="text-[12px] text-zinc-500 uppercase tracking-wider">Cliente</span>
              <span className="text-[14px] font-semibold text-white">{clientName}</span>
            </div>
          )}
          <div className="flex justify-between items-center py-2 border-b border-white/[0.04]">
            <span className="text-[12px] text-zinc-500 uppercase tracking-wider">Data</span>
            <span className="text-[14px] font-semibold text-white">{formattedDate}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-white/[0.04]">
            <span className="text-[12px] text-zinc-500 uppercase tracking-wider">Horário</span>
            <span className="text-[14px] font-semibold text-[#C5A059]">{selectedTime}</span>
          </div>
          <div className="pt-2 space-y-2">
            <span className="text-[12px] text-zinc-500 uppercase tracking-wider">Serviços</span>
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
            <span className={`font-bold text-[#C5A059] ${isDesktop ? 'text-xl' : 'text-lg'}`}>
              R$ {totalPrice.toFixed(0)}
            </span>
          </div>
        </div>

        {onFinish && isStepValid && (
          <button
            type="button"
            onClick={onFinish}
            disabled={isSubmitting || !isStepValid?.(1) || !isStepValid?.(2)}
            className="w-full py-4 bg-[#C5A059] text-black text-[12px] font-bold uppercase tracking-wider rounded-xl hover:bg-[#A68233] transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-[#C5A059]/20"
          >
            {isSubmitting ? 'Confirmando...' : 'Confirmar Agendamento'}
          </button>
        )}
      </div>
    );
  }

  // Normal date/time picker
  const renderDatePicker = () => (
    <div className="space-y-2">
      <span
        className={`font-medium text-zinc-500 uppercase tracking-wider ${isDesktop ? 'text-[11px]' : 'text-[10px] font-bold tracking-widest'}`}
      >
        {isDesktop ? 'Dia' : 'SELECIONE O DIA'}
      </span>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {nextDays.map((day) => {
          const isSel = selectedDate === day.fullDate;
          return (
            <button
              key={day.fullDate}
              type="button"
              onClick={() => onSelectDate(day.fullDate)}
              className={`flex flex-col items-center gap-1 py-3 rounded-xl transition-all cursor-pointer shrink-0 ${
                isDesktop ? 'px-4' : 'min-w-[64px]'
              } ${
                isSel
                  ? 'bg-[#C5A059]/10 border border-[#C5A059]/30 text-[#C5A059]'
                  : 'bg-transparent border border-white/[0.06] text-zinc-500 hover:text-white hover:border-white/[0.12]'
              }`}
            >
              <span
                className={`font-medium uppercase opacity-60 ${isDesktop ? 'text-[10px]' : 'text-[8px] font-bold tracking-widest'}`}
              >
                {day.dayName}
              </span>
              <span className={`font-bold ${isDesktop ? 'text-xl' : 'text-xl text-white'}`}>
                {day.dayNumber}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderTimePicker = () => (
    <div className="space-y-2">
      <span
        className={`font-medium text-zinc-500 uppercase tracking-wider ${isDesktop ? 'text-[11px]' : 'text-[10px] font-bold tracking-widest'}`}
      >
        {isDesktop ? 'Horários' : 'HORÁRIOS DISPONÍVEIS'}
      </span>
      {selectedDate ? (
        <div className={`grid gap-2 ${isDesktop ? 'grid-cols-5' : 'grid-cols-4'}`}>
          {timeSlots.map((time) => {
            const occupied = isOccupied(time);
            const isSel = selectedTime === time;
            return (
              <button
                key={time}
                type="button"
                disabled={occupied}
                onClick={() => onSelectTime(time)}
                className={`py-3 rounded-xl border font-medium transition-all cursor-pointer ${
                  isDesktop ? 'text-[13px]' : 'text-[11px] font-bold uppercase tracking-wider'
                } ${
                  occupied
                    ? 'text-zinc-700 cursor-not-allowed line-through opacity-30'
                    : isSel
                      ? 'bg-[#C5A059]/10 border-[#C5A059]/30 text-[#C5A059]'
                      : 'bg-transparent border-white/[0.06] text-zinc-400 hover:text-white hover:border-white/[0.12]'
                }`}
              >
                {time}
              </button>
            );
          })}
        </div>
      ) : (
        <p
          className={`text-zinc-600 ${isDesktop ? 'text-[13px] py-4' : 'text-xs py-10 text-center'}`}
        >
          Selecione um dia acima para ver os horários.
        </p>
      )}
    </div>
  );

  // Mobile layout with reschedule banner
  if (!isDesktop) {
    return (
      <div className="space-y-5 h-full flex flex-col">
        {rescheduleBooking ? (
          <div className="p-4 bg-[#111111] border border-[#C5A059]/20 rounded-2xl flex flex-col gap-1.5 shrink-0">
            <span className="text-[8px] font-bold text-[#C5A059] uppercase tracking-[0.25em]">
              REAGENDANDO ATENDIMENTO
            </span>
            <h3 className="text-sm font-bold text-white uppercase tracking-wide leading-none">
              {formatDisplayName(rescheduleBooking.clients?.name)}
            </h3>
            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">
              Original:{' '}
              {new Date(rescheduleBooking.booking_date + 'T12:00:00').toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short',
              })}{' '}
              às {rescheduleBooking.booking_time.slice(0, 5)}
            </p>
          </div>
        ) : (
          <div className="space-y-1 shrink-0">
            <h2 className="text-lg font-bold text-white uppercase tracking-tight">
              Data e horário
            </h2>
            <p className="text-xs text-zinc-500">Selecione o melhor dia e horário</p>
          </div>
        )}

        {renderDatePicker()}
        <div className="overflow-y-auto flex-1 scrollbar-hide pb-4">{renderTimePicker()}</div>
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="space-y-1">
        <h2 className="text-xl font-bold tracking-tight text-white">Data e Horário</h2>
        <p className="text-[13px] text-zinc-500">Defina o dia e horário do agendamento.</p>
      </div>

      {renderDatePicker()}
      {renderTimePicker()}

      {onFinish && isStepValid && (
        <button
          type="button"
          onClick={onFinish}
          disabled={
            isSubmitting ||
            !selectedTime ||
            !isStepValid?.(1) ||
            !isStepValid?.(2) ||
            !isStepValid?.(3)
          }
          className="py-4 px-10 bg-[#C5A059] text-black text-[12px] font-bold uppercase tracking-wider rounded-xl hover:bg-[#A68233] transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-[#C5A059]/20"
        >
          {isSubmitting ? 'Confirmando...' : 'Confirmar Agendamento'}
        </button>
      )}
    </div>
  );
}
