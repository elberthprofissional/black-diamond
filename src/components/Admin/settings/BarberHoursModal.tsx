import { useState, useEffect, type FC } from 'react';
import { upsertBarber } from '../../../lib/api/barbers';
import { getWorkSettings } from '../../../lib/api/settings';
import { useToast } from '../../../hooks/useToast';
import ToastNotification from '../shared/ToastNotification';
import { useModalA11y } from '../../../hooks/useModalA11y';
import { useScrollLock } from '../../../hooks/useScrollLock';
import { useIsDesktop } from '../../../hooks/useIsDesktop';
import { logError } from '../../../lib/logger';
import type { Barber } from '../../../types';
import { X, Clock, Info } from 'lucide-react';
import TimePickerSheet from './horarios/TimePickerSheet';
import LunchBreakContent from './horarios/LunchBreakContent';
import {
  DEFAULT_HOURS,
  DAY_NAMES,
  DAYS_ORDER,
  type HoursData,
  type DayHours,
  type DayKey,
} from './horarios/types';

interface BarberHoursModalProps {
  barber: Barber;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Horário por barbeiro.
 * - "Horário padrão da barbearia" (padrão): todos seguem settings.barber_hours.
 * - "Personalizado": este barbeiro tem horário próprio (barbers.barber_hours).
 * O editor começa com o horário padrão atual para facilitar pequenos ajustes.
 */
const BarberHoursModal: FC<BarberHoursModalProps> = ({ barber, onClose, onSaved }) => {
  const { showError, showSuccess, toast } = useToast();
  const isDesktop = useIsDesktop();
  useScrollLock();
  const { dialogRef } = useModalA11y(true, onClose, '#barber-hours-toggle');

  const [custom, setCustom] = useState<boolean>(() => !!barber.barber_hours);
  const [globalHours, setGlobalHours] = useState<HoursData | null>(null);
  const [hours, setHours] = useState<HoursData>(() =>
    barber.barber_hours
      ? ({ ...DEFAULT_HOURS, ...barber.barber_hours } as HoursData)
      : DEFAULT_HOURS
  );
  const [saving, setSaving] = useState(false);

  // Carrega o horário padrão da barbearia (para o editor começar de lá)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const cfg = await getWorkSettings();
        let base = DEFAULT_HOURS;
        if (cfg.barberHours) {
          try {
            base = { ...DEFAULT_HOURS, ...JSON.parse(cfg.barberHours) };
          } catch (e) {
            logError(e);
          }
        }
        if (mounted) setGlobalHours(base);
      } catch (e) {
        logError(e, 'BarberHoursModal/loadGlobal');
        if (mounted) setGlobalHours(DEFAULT_HOURS);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Sempre que não houver override (ou o editor ainda não foi tocado),
  // o horário reflete o padrão atual da barbearia — inclusive se o dono
  // trocar para "Personalizado" antes do carregamento terminar.
  useEffect(() => {
    if (globalHours && (!custom || hours === DEFAULT_HOURS)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHours(globalHours);
    }
  }, [globalHours, custom, hours]);

  const toggleCustom = (next: boolean) => {
    setCustom(next);
    if (next && globalHours) setHours(globalHours);
  };

  const patch = (day: DayKey, data: Partial<DayHours>) => {
    setHours((prev) => ({ ...prev, [day]: { ...(prev[day] as DayHours), ...data } }));
  };

  const toggleDay = (day: DayKey) => {
    patch(day, { enabled: !(hours[day] as DayHours).enabled });
  };

  const handleSave = async () => {
    if (custom) {
      // Validação: abertura < fechamento + almoço dentro do expediente
      for (const day of DAYS_ORDER) {
        const h = hours[day] as DayHours;
        if (h.enabled && h.open >= h.close) {
          showError(`${DAY_NAMES[day]}: abertura deve ser antes do fechamento.`);
          return;
        }
      }
      if (hours.lunch_break) {
        if (hours.lunch_break.start >= hours.lunch_break.end) {
          showError('Início do almoço deve ser antes do fim.');
          return;
        }
        for (const day of DAYS_ORDER) {
          const dayNum = Number(day);
          const h = hours[day] as DayHours;
          if (hours.lunch_break.days.includes(dayNum) && h.enabled) {
            if (hours.lunch_break.start < h.open || hours.lunch_break.end > h.close) {
              showError(
                `${DAY_NAMES[day]}: almoço deve ficar dentro do horário (${h.open}–${h.close}).`
              );
              return;
            }
          }
        }
      }
    }

    setSaving(true);
    try {
      if (custom) {
        await upsertBarber({
          id: barber.id,
          name: barber.name,
          barber_hours: hours as unknown as Record<string, unknown>,
        });
        showSuccess('Horário personalizado salvo!');
      } else {
        await upsertBarber({ id: barber.id, name: barber.name, use_default_hours: true });
        showSuccess('Barbeiro voltou ao horário padrão da barbearia.');
      }
      onSaved();
      onClose();
    } catch (e) {
      logError(e, 'BarberHoursModal/save');
      showError(e instanceof Error ? e.message : 'Erro ao salvar horários.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] sm:flex sm:items-center sm:justify-center sm:p-5">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="barber-hours-title"
        className="relative flex flex-col w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-[480px] bg-[#0d0d0d] sm:border sm:border-gold/20 sm:rounded-2xl overflow-hidden sm:shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gold/10 border border-gold/25 flex items-center justify-center shrink-0">
              <Clock size={16} className="text-gold" />
            </div>
            <div className="min-w-0">
              <h3
                id="barber-hours-title"
                className="text-[13px] font-bold text-gold uppercase tracking-widest truncate"
              >
                Horários de {barber.name}
              </h3>
              <p className="text-[11px] text-zinc-500 mt-0.5 truncate">
                {custom ? 'Horário próprio deste barbeiro' : 'Segue o horário padrão da barbearia'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer shrink-0"
            aria-label="Fechar horários"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 scrollbar-hide">
          {/* Toggle padrão / personalizado */}
          <div
            id="barber-hours-toggle"
            tabIndex={-1}
            className="grid grid-cols-2 gap-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-1"
            role="radiogroup"
            aria-label="Tipo de horário"
          >
            <button
              type="button"
              role="radio"
              aria-checked={!custom}
              onClick={() => toggleCustom(false)}
              className={`py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
                !custom ? 'bg-gold text-black' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Padrão da barbearia
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={custom}
              onClick={() => toggleCustom(true)}
              className={`py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
                custom ? 'bg-gold text-black' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Personalizado
            </button>
          </div>

          {!custom ? (
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4 flex gap-3">
              <Info size={15} className="text-gold shrink-0 mt-0.5" />
              <p className="text-[12px] text-zinc-500 leading-relaxed">
                Este barbeiro usa o{' '}
                <span className="text-zinc-300">mesmo horário da barbearia</span> (definido em{' '}
                <span className="text-zinc-300">Configurações → Horários</span>). Se um dia ele
                precisar de um horário diferente, é só escolher{' '}
                <span className="text-zinc-300">Personalizado</span> acima.
              </p>
            </div>
          ) : (
            <>
              {/* Dias da semana */}
              <div className="border border-white/[0.06] rounded-xl divide-y divide-white/[0.04] bg-white/[0.02]">
                {DAYS_ORDER.map((day) => {
                  const h = hours[day] as DayHours;
                  return (
                    <div
                      key={day}
                      className={`flex items-center gap-3 px-4 py-3 transition-opacity ${
                        h?.enabled ? '' : 'opacity-40'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleDay(day)}
                        role="switch"
                        aria-checked={!!h?.enabled}
                        aria-label={`${DAY_NAMES[day]} ${h?.enabled ? 'ativo' : 'inativo'}`}
                        className={`relative w-9 h-5 rounded-full transition-all duration-300 shrink-0 cursor-pointer ${
                          h?.enabled ? 'bg-gold' : 'bg-white/10'
                        }`}
                      >
                        <span
                          className={`absolute top-[3px] left-0 w-[14px] h-[14px] rounded-full bg-white shadow transition-transform duration-300 ${
                            h?.enabled ? 'translate-x-[19px]' : 'translate-x-[3px]'
                          }`}
                        />
                      </button>
                      <span
                        className={`text-[14px] flex-1 ${h?.enabled ? 'text-white' : 'text-zinc-500'}`}
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
                          <span className="text-zinc-600 text-[12px]">às</span>
                          <TimePickerSheet
                            value={h.close}
                            onChange={(v) => patch(day, { close: v })}
                            label="Fechamento"
                          />
                        </div>
                      ) : (
                        <span className="text-[12px] text-zinc-600">Fechado</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Almoço (por barbeiro quando personalizado) */}
              <div className="border border-white/[0.06] rounded-xl p-4 bg-white/[0.02] space-y-3">
                <LunchBreakContent
                  hours={hours}
                  onChange={setHours}
                  onHasChange={() => {
                    /* estado local; validação acontece no salvar */
                  }}
                  layout={isDesktop ? 'desktop' : 'mobile'}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex gap-3 px-5 pt-3 border-t border-white/[0.06] shrink-0 bg-[#0d0d0d]/95 backdrop-blur"
          style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))' }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-5 h-11 border border-white/[0.08] text-zinc-400 hover:text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 h-11 bg-gold text-black text-[10px] font-bold uppercase tracking-[0.15em] rounded-xl hover:bg-[#b8962e] transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar horários'}
          </button>
        </div>
      </div>

      <ToastNotification toast={toast} />
    </div>
  );
};

export default BarberHoursModal;
