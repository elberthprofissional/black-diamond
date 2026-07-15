import { useState, useEffect, type FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useBarberSettings } from '../../../contexts/BarberSettingsContext';
import { useToast } from '../../../hooks/useToast';
import ToastNotification from '../shared/ToastNotification';
import NumInput from './horarios/NumInput';
import TimePickerSheet from './horarios/TimePickerSheet';
import ApplyAllSheet from './horarios/ApplyAllSheet';
import LunchBreakContent from './horarios/LunchBreakContent';
import {
  DEFAULT_HOURS,
  DAY_NAMES,
  DAYS_ORDER,
  type HoursData,
  type DayHours,
  type DayKey,
  type LunchBreak,
} from './horarios/types';

/* ─── Config de horarios da barbearia ───
 * Permite ativar/desativar dias, definir abertura/fechamento,
 * configurar intervalo de almoco, e aplicar horarios em lote.
 * Estado local sincronizado com o context BarberSettings.
 * So salva no banco quando clica "Salvar alteracoes". */

const SettingsHorarios: FC = () => {
  const { barberHours, updateBarberHours } = useBarberSettings();
  const { toast, showSuccess, showError } = useToast();

  const [hours, setHours] = useState<HoursData>(DEFAULT_HOURS);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [modifiedDays, setModifiedDays] = useState<Set<string>>(new Set());
  const [justSaved, setJustSaved] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [lunchOpen, setLunchOpen] = useState(false);

  // Carrega dados salvos do context ao montar
  useEffect(() => {
    if (barberHours) {
      try {
        setHours({ ...DEFAULT_HOURS, ...JSON.parse(barberHours) });
      } catch {
        setHours(DEFAULT_HOURS);
      }
    }
  }, [barberHours]);

  // Alerta se tentar sair da pagina com alteracoes nao salvas
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasChanges]);

  const markChanged = (day: DayKey) => {
    setHasChanges(true);
    setModifiedDays((prev) => new Set(prev).add(day));
    setJustSaved(false);
  };

  // Atualiza horario de um dia especifico
  const patch = (day: DayKey, data: Partial<DayHours>) => {
    setHours((prev) => ({ ...prev, [day]: { ...(prev[day] as DayHours), ...data } }));
    markChanged(day);
  };

  // Alterna dia ativo/fechado
  const toggle = (day: DayKey) => {
    patch(day, { enabled: !(hours[day] as DayHours).enabled });
  };

  // Aplica mesmo horario para multiplos dias
  const applyToAll = (open: string, close: string, days: string[]) => {
    if (open >= close) {
      showError('Horário de abertura deve ser anterior ao fechamento.');
      return;
    }
    setHours((prev) => {
      const next = { ...prev };
      for (const d of days) {
        (next as Record<string, DayHours | LunchBreak>)[d] = { enabled: true, open, close };
      }
      return next as HoursData;
    });
    setHasChanges(true);
    showSuccess('Horários aplicados!');
  };

  // Valida e salva tudo no banco
  const saveAll = async () => {
    // Valida: horario de abertura < fechamento para cada dia
    for (const day of DAYS_ORDER) {
      const h = hours[day] as DayHours;
      if (h.enabled && h.open >= h.close) {
        showError(`${DAY_NAMES[day]}: horário de abertura deve ser anterior ao fechamento.`);
        return;
      }
    }

    // Valida: almoco dentro do horario de funcionamento
    if (hours.lunch_break && hours.lunch_break.start >= hours.lunch_break.end) {
      showError('Horário de início do almoço deve ser anterior ao fim.');
      return;
    }
    if (hours.lunch_break?.enabled && hours.lunch_break.days.length > 0) {
      for (const day of DAYS_ORDER) {
        const dayNum = parseInt(day, 10);
        const h = hours[day] as DayHours;
        if (hours.lunch_break.days.includes(dayNum) && h.enabled) {
          if (hours.lunch_break.start < h.open) {
            showError(`${DAY_NAMES[day]}: almoço não pode começar antes da abertura (${h.open}).`);
            return;
          }
          if (hours.lunch_break.end > h.close) {
            showError(
              `${DAY_NAMES[day]}: almoço não pode terminar após o fechamento (${h.close}).`
            );
            return;
          }
        }
      }
    }

    setSaving(true);
    const ok = await updateBarberHours(JSON.stringify(hours));
    setSaving(false);
    if (ok) {
      showSuccess('Horários salvos!');
      setHasChanges(false);
      setJustSaved(true);
      setTimeout(() => {
        setModifiedDays(new Set());
        setJustSaved(false);
      }, 1500);
    } else {
      showError('Erro ao salvar');
    }
  };

  // Renderiza inputs HH:MM para um dia
  const renderInputs = (day: DayKey) => {
    const h = hours[day] as DayHours;
    const [oH = '08', oM = '00'] = h.open.split(':');
    const [cH = '18', cM = '00'] = h.close.split(':');
    return (
      <div className="flex items-center gap-3 flex-1">
        <div className="flex items-center gap-0.5">
          <NumInput value={oH} max={23} onChange={(v) => patch(day, { open: `${v}:${oM}` })} />
          <span className="text-zinc-600 text-[12px]">:</span>
          <NumInput value={oM} max={59} onChange={(v) => patch(day, { open: `${oH}:${v}` })} />
        </div>
        <span className="text-zinc-600 text-[12px]">às</span>
        <div className="flex items-center gap-0.5">
          <NumInput value={cH} max={23} onChange={(v) => patch(day, { close: `${v}:${cM}` })} />
          <span className="text-zinc-600 text-[12px]">:</span>
          <NumInput value={cM} max={59} onChange={(v) => patch(day, { close: `${cH}:${v}` })} />
        </div>
      </div>
    );
  };

  // Renderiza um card de dia (toggle + nome + horarios)
  const renderDayRow = (day: DayKey) => {
    const isModified = modifiedDays.has(day);
    const h = hours[day] as DayHours;
    return (
      <div
        key={day}
        className={`flex items-center py-4 border-b border-white/[0.04] transition-all ${
          !h?.enabled ? 'opacity-40' : ''
        } ${isModified && !justSaved ? 'bg-[#C5A059]/[0.03]' : ''} ${justSaved && isModified ? 'bg-emerald-500/[0.03]' : ''}`}
      >
        <button
          onClick={() => toggle(day)}
          role="switch"
          aria-checked={!!h?.enabled}
          aria-label={`${DAY_NAMES[day]} ${h?.enabled ? 'ativo' : 'inativo'}`}
          className={`relative w-9 h-5 rounded-full transition-all duration-300 shrink-0 cursor-pointer mr-4 ${
            h?.enabled ? 'bg-[#C5A059]' : 'bg-white/10'
          }`}
        >
          <span
            className={`absolute top-[3px] left-0 w-[14px] h-[14px] rounded-full bg-white shadow transition-transform duration-300 ${
              h?.enabled ? 'translate-x-[19px]' : 'translate-x-[3px]'
            }`}
          />
        </button>
        <span
          className={`text-[13px] w-36 shrink-0 ${h?.enabled ? 'text-white' : 'text-zinc-500'}`}
        >
          {DAY_NAMES[day]}
          {isModified && !justSaved && (
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#C5A059] ml-2 align-middle" />
          )}
          {justSaved && isModified && (
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 ml-2 align-middle" />
          )}
        </span>
        {h?.enabled ? (
          renderInputs(day)
        ) : (
          <span className="text-[12px] text-zinc-600 flex-1">Fechado</span>
        )}
      </div>
    );
  };

  const activeCount = DAYS_ORDER.filter((d) => (hours[d] as DayHours)?.enabled).length;

  return (
    <div className="space-y-5">
      {/* ─── DESKTOP ─── */}
      <div className="hidden lg:block max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-white text-[15px] font-semibold">Horários de funcionamento</h3>
            <p className="text-zinc-500 text-[12px] mt-0.5">
              {activeCount} {activeCount === 1 ? 'dia ativo' : 'dias ativos'}
            </p>
          </div>
          <button
            onClick={() => setApplyOpen(true)}
            className="text-[12px] text-zinc-500 hover:text-[#C5A059] transition-colors cursor-pointer"
          >
            Aplicar para todos
          </button>
        </div>

        {/* Card de almoco - Desktop */}
        <div
          className="mb-4 bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 cursor-pointer hover:bg-white/[0.04] transition-all"
          onClick={() => setLunchOpen(true)}
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-white text-[14px] font-medium block">Horário de almoço</span>
              {hours.lunch_break ? (
                <p className="text-[#C5A059] text-[12px] font-medium mt-0.5">
                  {hours.lunch_break.start} às {hours.lunch_break.end}
                </p>
              ) : (
                <p className="text-zinc-500 text-[11px] mt-0.5">Clique para configurar</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-zinc-600 text-[11px]">
                {hours.lunch_break ? 'Ativo' : 'Inativo'}
              </span>
              <svg
                className="w-4 h-4 text-zinc-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Dias da semana */}
        <div className="border-t border-white/[0.06]">{DAYS_ORDER.map(renderDayRow)}</div>

        {/* Modal de almoco - Desktop */}
        <AnimatePresence>
          {lunchOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="hidden lg:flex fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm items-center justify-center p-4"
              onClick={() => setLunchOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                className="w-full max-w-[320px] bg-[#111111] border border-white/[0.06] rounded-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-5 h-12 border-b border-white/[0.04]">
                  <button
                    onClick={() => setLunchOpen(false)}
                    className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                  <span className="text-[13px] font-semibold text-white">Intervalo de almoço</span>
                  <div className="w-[18px]" />
                </div>
                <div className="p-5 space-y-4">
                  <LunchBreakContent
                    hours={hours}
                    onChange={setHours}
                    onHasChange={() => setHasChanges(true)}
                    layout="desktop"
                  />
                  <button
                    onClick={() => setLunchOpen(false)}
                    className="w-full py-3 rounded-xl bg-[#C5A059]/10 text-[#C5A059] font-semibold text-[12px] cursor-pointer hover:bg-[#C5A059]/20 transition-all"
                  >
                    Concluir
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Botao salvar */}
        <div className="flex items-center justify-end mt-6">
          <button
            onClick={saveAll}
            disabled={saving || !hasChanges}
            className="px-6 py-2.5 bg-[#C5A059] text-black font-semibold text-[12px] rounded-lg hover:bg-[#A68233] transition-all cursor-pointer disabled:opacity-30 flex items-center gap-2 shadow-lg shadow-[#C5A059]/10"
          >
            {saving && (
              <div className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            )}
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </div>

      {/* ─── MOBILE ─── */}
      <div className="lg:hidden pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 px-1">
          <div>
            <h3 className="text-white text-[15px] font-semibold">Horário de funcionamento</h3>
            <p className="text-zinc-500 text-[11px] mt-0.5">
              {activeCount} {activeCount === 1 ? 'dia ativo' : 'dias ativos'}
            </p>
          </div>
          <button
            onClick={() => setApplyOpen(true)}
            className="text-[11px] text-zinc-500 hover:text-[#C5A059] transition-colors cursor-pointer"
          >
            Aplicar para todos
          </button>
        </div>

        {/* Card de almoco - Mobile */}
        <div
          className="mb-4 mx-1 bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 cursor-pointer active:bg-white/[0.04] transition-all"
          onClick={() => setLunchOpen(true)}
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-white text-[13px] font-medium block">Horário de almoço</span>
              {hours.lunch_break ? (
                <p className="text-[#C5A059] text-[12px] font-medium mt-0.5">
                  {hours.lunch_break.start} às {hours.lunch_break.end}
                </p>
              ) : (
                <p className="text-zinc-500 text-[11px] mt-0.5">Toque para configurar</p>
              )}
            </div>
            <svg
              className="w-4 h-4 text-zinc-600 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>

        {/* Sheet de almoco - Mobile */}
        <AnimatePresence>
          {lunchOpen && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-0 z-[300] bg-[#0A0A0A]"
            >
              <div className="flex items-center justify-between px-4 h-14 border-b border-white/[0.04]">
                <button
                  onClick={() => setLunchOpen(false)}
                  className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={22} />
                </button>
                <span className="text-[16px] font-bold text-white">Intervalo de almoço</span>
                <div className="w-[22px]" />
              </div>
              <div className="p-5 space-y-5">
                <LunchBreakContent
                  hours={hours}
                  onChange={setHours}
                  onHasChange={() => setHasChanges(true)}
                  layout="mobile"
                />
                <button
                  onClick={() => setLunchOpen(false)}
                  className="w-full py-3.5 rounded-xl bg-[#C5A059] text-black font-bold text-[12px] uppercase tracking-wider cursor-pointer active:scale-[0.98] transition-all"
                >
                  Concluir
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dias da semana - Mobile */}
        <div className="border-t border-white/[0.06]">
          {DAYS_ORDER.map((day) => {
            const h = hours[day] as DayHours;
            return (
              <div
                key={day}
                className={`border-b border-white/[0.04] ${!h?.enabled ? 'opacity-35' : ''}`}
              >
                <div className="flex items-center gap-3 py-4 px-1">
                  <button
                    onClick={() => toggle(day)}
                    role="switch"
                    aria-checked={!!h?.enabled}
                    aria-label={`${DAY_NAMES[day]} ${h?.enabled ? 'ativo' : 'inativo'}`}
                    className={`relative w-9 h-5 rounded-full transition-all duration-300 shrink-0 cursor-pointer ${
                      h?.enabled ? 'bg-[#C5A059]' : 'bg-white/10'
                    }`}
                  >
                    <span
                      className={`absolute top-[3px] left-0 w-[14px] h-[14px] rounded-full bg-white shadow transition-transform duration-300 ${
                        h?.enabled ? 'translate-x-[19px]' : 'translate-x-[3px]'
                      }`}
                    />
                  </button>
                  <span
                    className={`text-[14px] flex-1 ${h?.enabled ? 'text-white font-medium' : 'text-zinc-500'}`}
                  >
                    {DAY_NAMES[day]}
                  </span>
                  {h?.enabled ? (
                    <div className="flex items-center gap-2">
                      <TimePickerSheet
                        value={h.open}
                        onChange={(v) => patch(day, { open: v })}
                        label="Abertura"
                      />
                      <span className="text-zinc-600 text-[11px]">às</span>
                      <TimePickerSheet
                        value={h.close}
                        onChange={(v) => patch(day, { close: v })}
                        label="Fechamento"
                      />
                    </div>
                  ) : (
                    <span className="text-[11px] text-zinc-600">Fechado</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Botao salvar fixo no rodape (mobile) */}
        <div className="fixed bottom-0 left-0 right-0 z-50">
          <div className="h-16 bg-gradient-to-t from-[#0a0a0a] to-transparent pointer-events-none" />
          <div className="bg-[#0a0a0a] px-4 pb-4 -mt-1">
            <button
              onClick={saveAll}
              disabled={saving || !hasChanges}
              className={`w-full py-3.5 rounded-xl font-bold text-[11px] uppercase tracking-[0.15em] transition-all cursor-pointer active:scale-[0.98] flex items-center justify-center gap-2 ${hasChanges ? 'bg-[#C5A059] text-black' : 'bg-white/[0.04] text-zinc-600'}`}
            >
              {saving && (
                <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              )}
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
