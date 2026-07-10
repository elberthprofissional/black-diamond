import { useState, useEffect, useMemo, type FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getLocalDateString, formatDisplayName } from '../../../lib/utils';
import { getAvailableSlots } from '../../../lib/api';
import type { Service, Booking, BookingWithClient } from '../../../types';

interface RescheduleWizardProps {
  selectedBooking: BookingWithClient;
  services: Service[];
  step: number;
  setStep: (step: number) => void;
  rescheduleServices: Service[];
  setRescheduleServices: (services: Service[]) => void;
  rescheduleDate: string;
  setRescheduleDate: (date: string) => void;
  rescheduleTime: string;
  setRescheduleTime: (time: string) => void;
  existingBookings: Booking[];
  loadingSlots: boolean;
  isSaving: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

const getNext14Days = () => {
  const list = [];
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    if (d.getDay() === 0) continue;
    list.push({
      dateStr: getLocalDateString(d),
      dayNum: String(d.getDate()).padStart(2, '0'),
      dayName: d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
      monthName: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
      rawDate: d,
    });
  }
  return list;
};

const RescheduleWizard: FC<RescheduleWizardProps> = ({
  selectedBooking,
  services,
  step,
  setStep,
  rescheduleServices,
  setRescheduleServices,
  rescheduleDate,
  setRescheduleDate,
  rescheduleTime,
  setRescheduleTime,
  existingBookings,
  loadingSlots,
  isSaving,
  onConfirm,
  onClose,
}) => {
  const next14Days = useMemo(() => getNext14Days(), []);
  const [rescheduleSlots, setRescheduleSlots] = useState<string[]>([]);

  useEffect(() => {
    if (!rescheduleDate || step !== 2) return;
    let active = true;
    getAvailableSlots(rescheduleDate).then((slots) => {
      if (active) setRescheduleSlots(slots);
    });
    return () => {
      active = false;
    };
  }, [rescheduleDate, step]);

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
    else onClose();
  };

  return (
    <>
      {/* Header */}
      <div className="sticky top-0 bg-[#0E0E0E]/95 backdrop-blur-md z-10 border-b border-white/[0.04]">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="text-zinc-500 hover:text-white transition-colors cursor-pointer p-1"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
            </button>
            <div>
              <span className="text-[9px] font-black text-[#C5A059] uppercase tracking-[0.25em] block">
                Reagendamento
              </span>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mt-0.5 truncate max-w-[180px]">
                {formatDisplayName(selectedBooking.clients?.name)}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors cursor-pointer p-1"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="flex gap-1 px-6 pb-3">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`flex-1 h-[2px] rounded-full transition-all duration-300 ${s <= step ? 'bg-[#C5A059]' : 'bg-white/[0.06]'}`}
            />
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <AnimatePresence mode="wait">
          {/* Step 1: Services */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="px-6 py-6 space-y-5"
            >
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-[#C5A059] uppercase tracking-[0.25em] block">
                  Serviços
                </span>
                <p className="text-[10px] text-zinc-600">
                  Selecione os serviços para este agendamento
                </p>
              </div>
              <div className="space-y-2">
                {services.map((srv) => {
                  const isSelected = rescheduleServices.some((s) => s.id === srv.id);
                  return (
                    <div
                      key={srv.id}
                      onClick={() => {
                        setRescheduleServices(
                          isSelected
                            ? rescheduleServices.filter((s) => s.id !== srv.id)
                            : [...rescheduleServices, srv]
                        );
                      }}
                      className={`flex items-center p-3.5 rounded-xl border cursor-pointer transition-all duration-200 ${isSelected ? 'border-[#C5A059]/40 bg-[#C5A059]/[0.06] shadow-[0_0_20px_rgba(197,160,89,0.05)]' : 'border-white/[0.04] bg-[#111111] hover:border-white/[0.08]'}`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span
                          className={`w-5 h-5 rounded-md flex items-center justify-center border-2 transition-all duration-200 shrink-0 ${isSelected ? 'border-[#C5A059] bg-[#C5A059]' : 'border-white/10 bg-transparent'}`}
                        >
                          {isSelected && (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="10"
                              height="10"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="black"
                              strokeWidth="4"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </span>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[11px] font-bold text-zinc-100">{srv.name}</span>
                          {srv.duration && (
                            <span className="text-[9px] text-zinc-500 mt-0.5">
                              {srv.duration} min
                            </span>
                          )}
                        </div>
                      </div>
                      <span
                        className={`text-xs font-black tabular-nums shrink-0 ${isSelected ? 'text-[#C5A059]' : 'text-zinc-500'}`}
                      >
                        R$ {Number(srv.price || 0).toFixed(0)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <button
                disabled={rescheduleServices.length === 0}
                onClick={() => setStep(2)}
                className="w-full py-3.5 bg-[#C5A059] hover:bg-white text-black font-black text-[10px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
              >
                Continuar
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </motion.div>
          )}

          {/* Step 2: Date + Time */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="px-6 py-6 space-y-6"
            >
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-[#C5A059] uppercase tracking-[0.25em] block">
                  Data e Horário
                </span>
                <p className="text-[10px] text-zinc-600">Escolha a nova data e horário</p>
              </div>

              {/* Date ribbon */}
              <div className="space-y-3">
                <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest block px-1">
                  Nova Data
                </span>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x flex-nowrap">
                  {next14Days.map((day) => {
                    const isSelected = rescheduleDate === day.dateStr;
                    return (
                      <button
                        key={day.dateStr}
                        type="button"
                        onClick={() => setRescheduleDate(day.dateStr)}
                        className={`flex flex-col items-center justify-center shrink-0 w-[52px] py-3 rounded-xl border transition-all cursor-pointer snap-start ${isSelected ? 'border-[#C5A059] bg-[#C5A059]/10 text-white shadow-[0_0_15px_rgba(197,160,89,0.15)]' : 'border-white/[0.04] bg-white/[0.01] text-zinc-500 hover:text-zinc-200 hover:border-white/[0.08]'}`}
                      >
                        <span className="text-[7px] font-extrabold uppercase tracking-wider opacity-60 mb-1 leading-none">
                          {day.dayName}
                        </span>
                        <span
                          className={`text-sm font-black leading-none ${isSelected ? 'text-[#C5A059]' : 'text-zinc-300'}`}
                        >
                          {day.dayNum}
                        </span>
                        <span className="text-[7px] font-bold uppercase tracking-wider opacity-60 mt-1 leading-none">
                          {day.monthName}
                        </span>
                      </button>
                    );
                  })}
                  <div className="relative shrink-0 w-[52px] flex items-center justify-center">
                    <input
                      type="date"
                      value={rescheduleDate}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                      min={getLocalDateString()}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div
                      className={`flex flex-col items-center justify-center w-full py-3 rounded-xl border transition-all pointer-events-none ${!next14Days.some((d) => d.dateStr === rescheduleDate) && rescheduleDate ? 'border-[#C5A059] bg-[#C5A059]/10 text-[#C5A059]' : 'border-white/[0.04] bg-white/[0.01] text-zinc-500'}`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        className="mb-0.5"
                      >
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      <span className="text-[6px] font-black uppercase tracking-widest text-center leading-none">
                        Outra
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Time grid */}
              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">
                    Novo Horário
                  </span>
                  {!loadingSlots && (
                    <span className="text-[7px] font-bold text-[#C5A059] uppercase tracking-wider">
                      {
                        rescheduleSlots.filter((slot: string) => {
                          const occupied =
                            rescheduleDate === selectedBooking.booking_date &&
                            slot === selectedBooking.booking_time.slice(0, 5)
                              ? false
                              : existingBookings.some(
                                  (b) =>
                                    b.status !== 'cancelled' && b.booking_time.slice(0, 5) === slot
                                );
                          return !occupied;
                        }).length
                      }{' '}
                      livres
                    </span>
                  )}
                </div>
                {loadingSlots ? (
                  <div className="py-8 text-center flex flex-col items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-zinc-800 border-t-[#C5A059] rounded-full animate-spin" />
                    <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">
                      Carregando...
                    </span>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {rescheduleSlots.map((slot: string) => {
                      const occupied =
                        rescheduleDate === selectedBooking.booking_date &&
                        slot === selectedBooking.booking_time.slice(0, 5)
                          ? false
                          : existingBookings.some(
                              (b) => b.status !== 'cancelled' && b.booking_time.slice(0, 5) === slot
                            );
                      const isSelected = rescheduleTime === slot;
                      return (
                        <button
                          key={slot}
                          type="button"
                          disabled={occupied}
                          onClick={() => setRescheduleTime(slot)}
                          className={`py-2.5 text-[10px] font-black rounded-lg border text-center transition-all cursor-pointer disabled:opacity-15 disabled:cursor-not-allowed ${isSelected ? 'border-[#C5A059] bg-[#C5A059]/15 text-[#C5A059] shadow-[0_0_10px_rgba(197,160,89,0.1)]' : 'border-white/[0.03] bg-white/[0.01] text-zinc-400 hover:text-white hover:border-white/[0.08]'}`}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                disabled={!rescheduleDate || !rescheduleTime}
                onClick={() => setStep(3)}
                className="w-full py-3.5 bg-[#C5A059] hover:bg-white text-black font-black text-[10px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
              >
                Continuar
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </motion.div>
          )}

          {/* Step 3: Review & Confirm */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="px-6 py-6 space-y-5"
            >
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-[#C5A059] uppercase tracking-[0.25em] block">
                  Revisar
                </span>
                <p className="text-[10px] text-zinc-600">Confirme as alterações antes de salvar</p>
              </div>

              <div className="bg-white/[0.02] border border-white/[0.04] rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/[0.04]">
                  <span className="text-[7px] font-black text-zinc-500 uppercase tracking-widest block mb-2">
                    Agendamento Atual
                  </span>
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col shrink-0">
                      <span className="text-[10px] font-bold text-zinc-400">
                        {new Date(selectedBooking.booking_date + 'T12:00:00')
                          .toLocaleDateString('pt-BR', {
                            weekday: 'short',
                            day: '2-digit',
                            month: 'short',
                          })
                          .replace('.', '')}
                      </span>
                      <span className="text-sm font-black text-zinc-300 mt-1">
                        {selectedBooking.booking_time.slice(0, 5)}
                      </span>
                    </div>
                    <div className="w-px h-10 bg-white/[0.06] shrink-0" />
                    <div className="flex flex-col gap-1 min-w-0">
                      {selectedBooking.service_ids?.map((id: string) => {
                        const srv = services.find((s) => s.id === id);
                        return (
                          <span key={id} className="text-[10px] font-medium text-zinc-500 truncate">
                            {srv?.name || 'Serviço'}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-center py-2 bg-[#C5A059]/[0.03]">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#C5A059"
                    strokeWidth="2.5"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <polyline points="19 12 12 19 5 12" />
                  </svg>
                </div>
                <div className="px-5 py-4">
                  <span className="text-[7px] font-black text-[#C5A059] uppercase tracking-widest block mb-2">
                    Novo Agendamento
                  </span>
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col shrink-0">
                      <span className="text-[10px] font-bold text-white">
                        {rescheduleDate
                          ? new Date(rescheduleDate + 'T12:00:00')
                              .toLocaleDateString('pt-BR', {
                                weekday: 'short',
                                day: '2-digit',
                                month: 'short',
                              })
                              .replace('.', '')
                          : '---'}
                      </span>
                      <span className="text-sm font-black text-[#C5A059] mt-1">
                        {rescheduleTime || '---'}
                      </span>
                    </div>
                    <div className="w-px h-10 bg-white/[0.06] shrink-0" />
                    <div className="flex flex-col gap-1 min-w-0">
                      {rescheduleServices.map((srv) => (
                        <span
                          key={srv.id}
                          className="text-[10px] font-medium text-zinc-300 truncate"
                        >
                          {srv.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center px-1">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                  Investimento Total
                </span>
                <span className="text-lg font-black text-[#C5A059]">
                  R${' '}
                  {rescheduleServices.reduce((sum, s) => sum + Number(s.price || 0), 0).toFixed(0)}
                </span>
              </div>

              <button
                disabled={isSaving}
                onClick={onConfirm}
                className="w-full py-3.5 bg-[#C5A059] hover:bg-white text-black font-black text-[10px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-30"
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Confirmar Reagendamento
                  </>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default RescheduleWizard;
