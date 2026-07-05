import React, { useState, useEffect } from 'react';
import { useBarberSettings } from '../../../contexts/BarberSettingsContext';
import { useToast } from '../../../hooks/useToast';
import ToastNotification from '../shared/ToastNotification';
import { motion, AnimatePresence } from 'framer-motion';

interface HoursData {
  [key: string]: { enabled: boolean; open: string; close: string };
}

const DEFAULT: HoursData = {
  '1': { enabled: true, open: '08:00', close: '18:00' },
  '2': { enabled: true, open: '08:00', close: '18:00' },
  '3': { enabled: true, open: '08:00', close: '18:00' },
  '4': { enabled: true, open: '08:00', close: '18:00' },
  '5': { enabled: true, open: '08:00', close: '18:00' },
  '6': { enabled: true, open: '08:00', close: '18:00' },
  '0': { enabled: false, open: '09:00', close: '14:00' },
};

const DAYS_ORDER = ['1', '2', '3', '4', '5', '6', '0'];
const DAY_NAMES: Record<string, string> = {
  '1': 'Segunda', '2': 'Terça', '3': 'Quarta',
  '4': 'Quinta', '5': 'Sexta', '6': 'Sábado', '0': 'Domingo',
};

const TIME_OPTIONS = Array.from({ length: 36 }, (_, i) => {
  const h = Math.floor(i / 2) + 6;
  const m = i % 2 === 0 ? '00' : '30';
  if (h > 23) return null;
  return `${String(h).padStart(2, '0')}:${m}`;
}).filter(Boolean) as string[];

const inputClass = "bg-transparent border-b border-white/[0.08] focus:border-[#C5A059]/40 pb-1 text-[13px] text-zinc-300 outline-none transition-all text-center w-9 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

/** Input numérico controlado que só formata/valida no onBlur.
 *  Enquanto digita, deixa o usuário digitar livremente.
 *  No onBlur: clamp + padStart + dispara onChange. */
const NumInput: React.FC<{ value: string; onChange: (v: string) => void; max: number }> = ({ value, onChange, max }) => {
  const [local, setLocal] = useState(value);

  // Sincroniza se o valor externo mudar (ex: carregou dados novos)
  useEffect(() => { setLocal(value); }, [value]);

  const commit = () => {
    const raw = local.replace(/\D/g, '').slice(0, 2);
    const clamped = String(Math.min(parseInt(raw || '0', 10), max)).padStart(2, '0');
    setLocal(clamped);
    onChange(clamped);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      maxLength={2}
      value={local}
      onChange={e => setLocal(e.target.value.replace(/\D/g, '').slice(0, 2))}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); } }}
      className={inputClass}
    />
  );
};

const TimePickerSheet: React.FC<{
  value: string;
  onChange: (v: string) => void;
  label: string;
}> = ({ value, onChange, label }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-[13px] text-white font-medium cursor-pointer active:scale-95 transition-all">
        {value}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[300] flex items-end" onClick={() => setOpen(false)}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} onClick={e => e.stopPropagation()} className="relative w-full bg-[#0f0f0f] rounded-t-3xl border-t border-white/[0.06] p-5 pb-10">
              <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between mb-5">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">{label}</span>
                <button onClick={() => setOpen(false)} className="text-[#C5A059] text-[13px] font-semibold cursor-pointer">OK</button>
              </div>
              <div className="grid grid-cols-4 gap-2 max-h-[50vh] overflow-y-auto scrollbar-hide">
                {TIME_OPTIONS.map(t => (
                  <button key={t} onClick={() => { onChange(t); setOpen(false); }} className={`py-3 rounded-xl text-[13px] font-bold transition-all cursor-pointer active:scale-95 ${value === t ? 'bg-[#C5A059]/15 text-[#C5A059] border border-[#C5A059]/30' : 'bg-white/[0.03] text-zinc-400 border border-white/[0.04]'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

const ApplyAllSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  onApply: (open: string, close: string, days: string[]) => void;
}> = ({ open, onClose, onApply }) => {
  const [start, setStart] = useState('08:00');
  const [end, setEnd] = useState('18:00');
  const [picked, setPicked] = useState<Record<string, boolean>>({ '1': true, '2': true, '3': true, '4': true, '5': true, '6': false, '0': false });

  const apply = () => {
    const days = Object.entries(picked).filter(([, v]) => v).map(([k]) => k);
    if (days.length === 0) return;
    onApply(start, end, days);
    onClose();
  };

  const pickedCount = Object.values(picked).filter(Boolean).length;

  const [startH, startM] = start.split(':');
  const [endH, endM] = end.split(':');

  const applyInputClass = "bg-transparent border-b border-white/[0.08] focus:border-[#C5A059]/40 pb-1 text-[18px] lg:text-[20px] text-white font-semibold outline-none transition-all text-center w-10";

  const content = (
    <>
      <div className="flex items-center justify-between mb-6 lg:mb-8">
        <span className="text-[14px] lg:text-[17px] text-white font-semibold tracking-tight">Aplicar para todos</span>
        <button onClick={onClose} className="text-zinc-500 hover:text-white cursor-pointer transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div className="flex items-center gap-4 lg:gap-6 mb-6 lg:mb-8">
        <div className="flex-1">
          <span className="text-[9px] lg:text-[10px] text-zinc-500 uppercase tracking-wider block mb-3">Início</span>
          <div className="flex items-center gap-1 justify-center">
            <input type="text" inputMode="numeric" maxLength={2} value={startH} onChange={e => { const r = e.target.value.replace(/\D/g, '').slice(0, 2); setStart(`${String(Math.min(parseInt(r || '0', 10), 23)).padStart(2, '0')}:${startM}`); }} className={applyInputClass} />
            <span className="text-zinc-500 text-[18px] font-semibold">:</span>
            <input type="text" inputMode="numeric" maxLength={2} value={startM} onChange={e => { const r = e.target.value.replace(/\D/g, '').slice(0, 2); setStart(`${startH}:${String(Math.min(parseInt(r || '0', 10), 59)).padStart(2, '0')}`); }} className={applyInputClass} />
          </div>
        </div>
        <span className="text-zinc-600 text-[14px] mt-6">às</span>
        <div className="flex-1">
          <span className="text-[9px] lg:text-[10px] text-zinc-500 uppercase tracking-wider block mb-3">Fim</span>
          <div className="flex items-center gap-1 justify-center">
            <input type="text" inputMode="numeric" maxLength={2} value={endH} onChange={e => { const r = e.target.value.replace(/\D/g, '').slice(0, 2); setEnd(`${String(Math.min(parseInt(r || '0', 10), 23)).padStart(2, '0')}:${endM}`); }} className={applyInputClass} />
            <span className="text-zinc-500 text-[18px] font-semibold">:</span>
            <input type="text" inputMode="numeric" maxLength={2} value={endM} onChange={e => { const r = e.target.value.replace(/\D/g, '').slice(0, 2); setEnd(`${endH}:${String(Math.min(parseInt(r || '0', 10), 59)).padStart(2, '0')}`); }} className={applyInputClass} />
          </div>
        </div>
      </div>

      <div className="mb-6 lg:mb-8">
        <span className="text-[9px] lg:text-[10px] text-zinc-500 uppercase tracking-wider block mb-3">{pickedCount} {pickedCount === 1 ? 'dia selecionado' : 'dias selecionados'}</span>
        <div className="flex gap-1.5 lg:gap-2">
          {DAYS_ORDER.map(d => (
            <button key={d} onClick={() => setPicked(p => ({ ...p, [d]: !p[d] }))} className={`flex-1 py-2.5 lg:py-3 rounded-lg text-[10px] lg:text-[11px] font-medium transition-all cursor-pointer ${picked[d] ? 'text-[#C5A059]' : 'text-zinc-600'}`}>
              {DAY_NAMES[d].slice(0, 3).toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <button onClick={apply} disabled={pickedCount === 0} className="w-full py-3.5 lg:py-4 bg-[#C5A059] hover:bg-[#A68233] text-black font-bold text-[11px] uppercase tracking-[0.15em] rounded-xl transition-all cursor-pointer active:scale-[0.98] disabled:opacity-30 shadow-lg shadow-[#C5A059]/10">
        Aplicar
      </button>
    </>
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Mobile: bottom sheet */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[400] lg:hidden flex items-end" onClick={onClose}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} onClick={e => e.stopPropagation()} className="relative w-full bg-[#0f0f0f] rounded-t-3xl border-t border-white/[0.06] px-5 pt-4 pb-8">
              <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mb-5" />
              {content}
            </motion.div>
          </motion.div>
          {/* Desktop: centered modal */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[400] hidden lg:flex items-center justify-center" onClick={onClose}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.2 }} onClick={e => e.stopPropagation()} className="relative w-full max-w-sm bg-gradient-to-b from-[#141414] to-[#0f0f0f] border border-white/[0.06] rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] overflow-hidden">
              <div className="h-px bg-gradient-to-r from-transparent via-[#C5A059]/30 to-transparent" />
              <div className="p-6">
                {content}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const SettingsHorarios: React.FC = () => {
  const { barberHours, updateBarberHours } = useBarberSettings();
  const { toast, showSuccess, showError } = useToast();
  const [hours, setHours] = useState<HoursData>(DEFAULT);
  const [saving, setSaving] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (barberHours) {
      try {
        const parsed = JSON.parse(barberHours);
        setHours({ ...DEFAULT, ...parsed });
      } catch { setHours(DEFAULT); }
    }
  }, [barberHours]);

  const patch = (day: string, data: Partial<{ enabled: boolean; open: string; close: string }>) => {
    setHours(prev => ({ ...prev, [day]: { ...prev[day], ...data } }));
    setHasChanges(true);
  };

  const toggle = (day: string) => patch(day, { enabled: !hours[day].enabled });

  const applyToAll = (open: string, close: string, days: string[]) => {
    setHours(prev => {
      const next = { ...prev };
      for (const d of days) next[d] = { enabled: true, open, close };
      return next;
    });
    setHasChanges(true);
    showSuccess('Horários aplicados!');
  };

  const saveAll = async () => {
    setSaving(true);
    const ok = await updateBarberHours(JSON.stringify(hours));
    setSaving(false);
    if (ok) { showSuccess('Horários salvos!'); setHasChanges(false); }
    else showError('Erro ao salvar');
  };

  const activeCount = DAYS_ORDER.filter(d => hours[d]?.enabled).length;

  const renderInputs = (day: string) => {
    const [oH, oM] = hours[day].open.split(':');
    const [cH, cM] = hours[day].close.split(':');
    return (
      <div className="flex items-center gap-3 flex-1">
        <div className="flex items-center gap-0.5">
          <NumInput value={oH} max={23} onChange={v => patch(day, { open: `${v}:${oM}` })} />
          <span className="text-zinc-600 text-[12px]">:</span>
          <NumInput value={oM} max={59} onChange={v => patch(day, { open: `${oH}:${v}` })} />
        </div>
        <span className="text-zinc-600 text-[12px]">às</span>
        <div className="flex items-center gap-0.5">
          <NumInput value={cH} max={23} onChange={v => patch(day, { close: `${v}:${cM}` })} />
          <span className="text-zinc-600 text-[12px]">:</span>
          <NumInput value={cM} max={59} onChange={v => patch(day, { close: `${cH}:${v}` })} />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Desktop */}
      <div className="hidden lg:block max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-white text-[15px] font-semibold">Horários de funcionamento</h3>
            <p className="text-zinc-500 text-[12px] mt-0.5">{activeCount} {activeCount === 1 ? 'dia ativo' : 'dias ativos'}</p>
          </div>
          <button onClick={() => setApplyOpen(true)} className="text-[12px] text-zinc-500 hover:text-[#C5A059] transition-colors cursor-pointer">
            Aplicar para todos
          </button>
        </div>
        <div className="border-t border-white/[0.06]">
          {DAYS_ORDER.map(day => (
            <div key={day} className={`flex items-center py-4 border-b border-white/[0.04] ${!hours[day]?.enabled ? 'opacity-40' : ''}`}>
              <button onClick={() => toggle(day)} className="relative cursor-pointer shrink-0 mr-4">
                <div className={`w-9 h-5 rounded-full transition-all duration-300 ${hours[day]?.enabled ? 'bg-[#C5A059]' : 'bg-white/10'}`}>
                  <div className={`absolute top-[3px] w-[14px] h-[14px] rounded-full bg-white shadow transition-transform duration-300 ${hours[day]?.enabled ? 'translate-x-[19px]' : 'translate-x-[3px]'}`} />
                </div>
              </button>
              <span className={`text-[13px] w-36 shrink-0 ${hours[day]?.enabled ? 'text-white' : 'text-zinc-500'}`}>{DAY_NAMES[day]}</span>
              {hours[day]?.enabled ? renderInputs(day) : <span className="text-[12px] text-zinc-600 flex-1">Fechado</span>}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-end mt-6">
          <button onClick={saveAll} disabled={saving || !hasChanges} className="px-6 py-2.5 bg-[#C5A059] text-black font-semibold text-[12px] rounded-lg hover:bg-[#A68233] transition-all cursor-pointer disabled:opacity-30 flex items-center gap-2 shadow-lg shadow-[#C5A059]/10">
            {saving && <div className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />}
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </div>

      {/* Mobile */}
      <div className="lg:hidden pb-24">
        {/* Quick apply */}
        <div className="flex items-center justify-between mb-4 px-1">
          <span className="text-[11px] text-zinc-500">{activeCount} {activeCount === 1 ? 'dia ativo' : 'dias ativos'}</span>
          <button onClick={() => setApplyOpen(true)} className="text-[11px] text-zinc-500 hover:text-[#C5A059] transition-colors cursor-pointer">
            Aplicar para todos
          </button>
        </div>

        {/* Days */}
        <div className="space-y-0">
          {DAYS_ORDER.map(day => (
            <div key={day} className={`border-b border-white/[0.04] ${!hours[day]?.enabled ? 'opacity-35' : ''}`}>
              <div className="flex items-center gap-3 py-4 px-1">
                <button onClick={() => toggle(day)} className="relative cursor-pointer shrink-0">
                  <div className={`w-9 h-5 rounded-full transition-all duration-300 ${hours[day]?.enabled ? 'bg-[#C5A059]' : 'bg-white/10'}`}>
                    <div className={`absolute top-[3px] w-[14px] h-[14px] rounded-full bg-white shadow transition-transform duration-300 ${hours[day]?.enabled ? 'translate-x-[19px]' : 'translate-x-[3px]'}`} />
                  </div>
                </button>
                <span className={`text-[14px] flex-1 ${hours[day]?.enabled ? 'text-white font-medium' : 'text-zinc-500'}`}>{DAY_NAMES[day]}</span>
                {hours[day]?.enabled ? (
                  <div className="flex items-center gap-2">
                    <TimePickerSheet value={hours[day].open} onChange={v => patch(day, { open: v })} label="Abertura" />
                    <span className="text-zinc-600 text-[11px]">às</span>
                    <TimePickerSheet value={hours[day].close} onChange={v => patch(day, { close: v })} label="Fechamento" />
                  </div>
                ) : (
                  <span className="text-[11px] text-zinc-600">Fechado</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Sticky save */}
        <div className="fixed bottom-0 left-0 right-0 z-50">
          <div className="h-16 bg-gradient-to-t from-[#0a0a0a] to-transparent pointer-events-none" />
          <div className="bg-[#0a0a0a] px-4 pb-4 -mt-1">
            <button onClick={saveAll} disabled={saving || !hasChanges} className={`w-full py-3.5 rounded-xl font-bold text-[11px] uppercase tracking-[0.15em] transition-all cursor-pointer active:scale-[0.98] flex items-center justify-center gap-2 ${hasChanges ? 'bg-[#C5A059] text-black' : 'bg-white/[0.04] text-zinc-600'}`}>
              {saving && <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />}
              {saving ? 'Salvando...' : hasChanges ? 'Salvar Horários' : 'Sem alterações'}
            </button>
          </div>
        </div>
      </div>

      <ApplyAllSheet open={applyOpen} onClose={() => setApplyOpen(false)} onApply={applyToAll} />
      <ToastNotification toast={toast} />
    </div>
  );
};

export default SettingsHorarios;
