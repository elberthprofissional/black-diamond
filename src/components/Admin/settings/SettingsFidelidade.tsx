import { useState, useEffect, type FC } from 'react';
import { getServices } from '../../../lib/api';
import { getMilestones, saveMilestones, setLoyaltyEnabled } from '../../../lib/api/loyalty';
import { useToast } from '../../../hooks/useToast';
import ToastNotification from '../shared/ToastNotification';
import { Plus, Trash2, Check, X, Sparkles, Star, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import type { LoyaltyMilestone, Service } from '../../../types';
import { logError } from '../../../lib/logger';

const SettingsFidelidade: FC = () => {
  const { toast, showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [milestones, setMilestones] = useState<LoyaltyMilestone[]>([]);
  const [enabled, setEnabled] = useState(false);

  // Form state for new milestone
  const [newVisits, setNewVisits] = useState('');
  const [newServiceId, setNewServiceId] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [miles, svcs] = await Promise.all([getMilestones(), getServices()]);
        setServices(svcs);
        setMilestones(miles);
        setEnabled(miles.length > 0);
      } catch (e) {
        logError(e);
        // keep defaults
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleToggleEnabled = async () => {
    if (enabled) {
      // Desativar: marca milestones como inativas (preserva dados)
      setSaving(true);
      try {
        await setLoyaltyEnabled(false);
        setMilestones([]);
        setEnabled(false);
        showSuccess('Fidelidade desativada. Metas preservadas para reativação futura.');
      } catch (e) {
        logError(e);
        showError('Erro ao desativar.');
      } finally {
        setSaving(false);
      }
    } else {
      // Ativar: reativa milestones existentes ou cria novas
      setSaving(true);
      try {
        await setLoyaltyEnabled(true);
        const fresh = await getMilestones();
        setMilestones(fresh);
        setEnabled(true);
        if (fresh.length === 0) {
          setShowNewForm(true);
        }
        showSuccess('Fidelidade ativada!');
      } catch (e) {
        logError(e);
        showError('Erro ao ativar.');
      } finally {
        setSaving(false);
      }
    }
  };

  const handleAddMilestone = () => {
    const visits = parseInt(newVisits, 10);
    if (isNaN(visits) || visits < 1) {
      showError('Informe um número de visitas válido.');
      return;
    }
    if (!newServiceId) {
      showError('Selecione um serviço como prêmio.');
      return;
    }

    // Verifica se já existe milestone com esse número de visitas
    if (milestones.some((m) => m.visits_required === visits)) {
      showError(`Já existe uma meta de ${visits} visitas.`);
      return;
    }

    // Cria milestone local
    const tempId = `temp-${Date.now()}`;
    const newMilestone: LoyaltyMilestone = {
      id: tempId,
      visits_required: visits,
      reward_service_id: newServiceId,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    setMilestones((prev) =>
      [...prev, newMilestone].sort((a, b) => a.visits_required - b.visits_required)
    );
    setNewVisits('');
    setNewServiceId('');
    setShowNewForm(false);
  };

  const handleRemoveMilestone = (id: string) => {
    setMilestones((prev) => prev.filter((m) => m.id !== id));
  };

  const handleSaveAll = async () => {
    if (milestones.length === 0) {
      showError('Adicione pelo menos uma meta.');
      return;
    }

    setSaving(true);
    try {
      await saveMilestones(
        milestones.map((m) => ({
          visits_required: m.visits_required,
          reward_service_id: m.reward_service_id,
        }))
      );
      // Recarrega pra pegar os IDs reais
      const fresh = await getMilestones();
      setMilestones(fresh);
      setEnabled(true);
      showSuccess(`${milestones.length} meta(s) salva(s)!`);
    } catch (e) {
      logError(e);
      showError('Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const getServiceName = (id: string) => services.find((s) => s.id === id)?.name || '?';

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-white/[0.02] rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto lg:mx-0">
      {/* Header — Desktop */}
      <div className="hidden lg:flex items-center justify-between py-2">
        <div>
          <h3 className="text-[15px] font-bold text-white">Programa de Fidelidade</h3>
          <p className="text-[12px] text-zinc-500 mt-0.5">
            {enabled
              ? `${milestones.length} meta(s) configurada(s)`
              : 'Inativo — ative para começar'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleEnabled}
            disabled={saving}
            role="switch"
            aria-checked={enabled}
            className={`relative w-12 h-7 rounded-full transition-colors cursor-pointer ${
              enabled ? 'bg-[#D4AF37]' : 'bg-zinc-700'
            } disabled:opacity-50`}
          >
            <motion.div
              className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-md"
              animate={{ left: enabled ? 26 : 4 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </button>
        </div>
      </div>

      {/* Header — Mobile (só toggle) */}
      <div className="lg:hidden flex items-center justify-between py-2">
        <p className="text-[12px] text-zinc-500">
          {enabled ? `${milestones.length} meta(s) configurada(s)` : 'Inativo — ative para começar'}
        </p>
        <button
          onClick={handleToggleEnabled}
          disabled={saving}
          role="switch"
          aria-checked={enabled}
          className={`relative w-12 h-7 rounded-full transition-colors cursor-pointer ${
            enabled ? 'bg-[#D4AF37]' : 'bg-zinc-700'
          } disabled:opacity-50`}
        >
          <motion.div
            className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-md"
            animate={{ left: enabled ? 26 : 4 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        </button>
      </div>

      {enabled && (
        <>
          {/* How it works banner */}
          <div className="bg-[#D4AF37]/[0.04] border border-[#D4AF37]/10 rounded-xl p-4 flex items-start gap-3">
            <Sparkles size={16} className="text-[#D4AF37] shrink-0 mt-0.5" />
            <p className="text-[12px] text-zinc-400 leading-relaxed">
              O cliente <strong className="text-zinc-200">acumula visitas pra sempre</strong> (nunca
              reseta). Cada meta é uma recompensa diferente. Ex: 5 visitas → sobrancelha grátis, 10
              visitas → corte grátis.
            </p>
          </div>

          {/* Milestones list */}
          {milestones.length > 0 && (
            <div className="space-y-2">
              {milestones.map((m) => {
                const svcName = getServiceName(m.reward_service_id);
                return (
                  <div
                    key={m.id}
                    className="flex items-center gap-4 bg-[#111111] border border-white/5 rounded-xl px-4 py-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center shrink-0">
                      <Star size={14} className="text-[#D4AF37]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-white">
                        {m.visits_required} visitas
                      </p>
                      <p className="text-[11px] text-zinc-500">🎁 {svcName}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveMilestone(m.id)}
                      className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                      title="Remover meta"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add milestone form */}
          {showNewForm ? (
            <div className="bg-[#111111] border border-[#D4AF37]/20 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  Nova meta
                </span>
                <button
                  onClick={() => {
                    setShowNewForm(false);
                    setNewVisits('');
                    setNewServiceId('');
                  }}
                  className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <span className="text-[10px] text-zinc-500">Visitas necessárias</span>
                  <input
                    type="number"
                    min="1"
                    max="999"
                    value={newVisits}
                    onChange={(e) => setNewVisits(e.target.value)}
                    placeholder="Ex: 10"
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-[14px] text-white font-bold outline-none focus:border-[#D4AF37]/50 transition-all placeholder:text-zinc-600"
                  />
                </div>
                <div className="space-y-1.5">
                  <span className="text-[10px] text-zinc-500">Prêmio</span>
                  <div className="relative">
                    <select
                      value={newServiceId}
                      onChange={(e) => setNewServiceId(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-[13px] text-white outline-none focus:border-[#D4AF37]/40 transition-all appearance-none cursor-pointer"
                    >
                      <option value="" className="bg-[#1A1A1A]">
                        Selecione
                      </option>
                      {services.map((s) => (
                        <option key={s.id} value={s.id} className="bg-[#1A1A1A]">
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={14}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleAddMilestone}
                className="w-full h-10 bg-[#D4AF37] text-black font-bold text-[11px] uppercase tracking-wider rounded-xl hover:bg-[#b8962e] transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus size={14} strokeWidth={2.5} />
                Adicionar Meta
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowNewForm(true)}
              className="w-full h-10 border border-dashed border-white/[0.12] text-zinc-400 hover:text-white hover:border-[#D4AF37]/30 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 text-[11px] font-bold"
            >
              <Plus size={14} />
              Adicionar Meta
            </button>
          )}

          {/* Save button */}
          {milestones.length > 0 && (
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="w-full h-12 bg-[#D4AF37] text-black font-black text-[11px] uppercase tracking-[0.2em] rounded-xl hover:bg-[#b8962e] transition-all cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-[#D4AF37]/10"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Check size={16} strokeWidth={2.5} />
                  Salvar {milestones.length} meta(s)
                </>
              )}
            </button>
          )}
        </>
      )}

      <ToastNotification toast={toast} />
    </div>
  );
};

export default SettingsFidelidade;
