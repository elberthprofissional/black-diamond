import { useState, useEffect, type FC } from 'react';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../hooks/useToast';
import ToastNotification from '../shared/ToastNotification';
import { UserX, Shield, AlertTriangle, Ban, Check } from 'lucide-react';

const SettingsFaltas: FC = () => {
  const { toast, showSuccess, showError } = useToast();
  const [maxNoShows, setMaxNoShows] = useState('3');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'max_no_shows')
          .maybeSingle();
        if (data?.value) setMaxNoShows(data.value);
      } catch {
        // keep default
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleSave = async () => {
    const val = parseInt(maxNoShows, 10);
    if (isNaN(val) || val < 1 || val > 20) {
      showError('Digite um valor entre 1 e 20.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({ key: 'max_no_shows', value: String(val) }, { onConflict: 'key' });
      if (error) throw error;
      showSuccess('Limite de faltas atualizado!');
    } catch {
      showError('Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const numericVal = parseInt(maxNoShows, 10);
  const severity = numericVal <= 2 ? 'alto' : numericVal <= 4 ? 'medio' : 'baixo';
  const severityConfig = {
    alto: {
      label: 'Rigoroso',
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
    },
    medio: {
      label: 'Equilibrado',
      color: 'text-[#C5A059]',
      bg: 'bg-[#C5A059]/10',
      border: 'border-[#C5A059]/20',
    },
    baixo: {
      label: 'Permissivo',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
    },
  };
  const sev = severityConfig[severity];

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
      <div className="hidden lg:flex items-center gap-3 py-2">
        <div className="w-10 h-10 rounded-xl bg-[#C5A059]/10 border border-[#C5A059]/20 flex items-center justify-center shrink-0">
          <UserX size={18} className="text-[#C5A059]" />
        </div>
        <div>
          <h3 className="text-[15px] font-bold text-white">Controle de Faltas</h3>
          <p className="text-[12px] text-zinc-500 mt-0.5">
            Bloqueio automático por não comparecimento
          </p>
        </div>
      </div>

      {/* Header — Mobile */}
      <div className="lg:hidden">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-[#C5A059]/10 border border-[#C5A059]/20 flex items-center justify-center shrink-0">
            <UserX size={18} className="text-[#C5A059]" />
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-white">Controle de Faltas</h3>
            <p className="text-[11px] text-zinc-500">Bloqueio automático por não comparecimento</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr,340px] gap-6">
        {/* Left column — Config */}
        <div className="space-y-5">
          {/* Info card */}
          <div className="bg-[#C5A059]/[0.03] border border-[#C5A059]/10 rounded-2xl p-4 flex items-start gap-3">
            <Shield size={16} className="text-[#C5A059]/70 shrink-0 mt-0.5" />
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Quando um cliente atingir o limite de faltas, ele será bloqueado automaticamente e não
              poderá fazer novos agendamentos por <strong className="text-zinc-300">90 dias</strong>
              .
            </p>
          </div>

          {/* Slider */}
          <div className="bg-[#111111] border border-white/5 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.15em]">
                Limite de faltas
              </span>
              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-bold uppercase tracking-wider ${sev.color}`}>
                  {sev.label}
                </span>
                <span className="text-lg font-black text-[#C5A059] tabular-nums">
                  {maxNoShows}x
                </span>
              </div>
            </div>

            <input
              type="range"
              min="1"
              max="10"
              value={maxNoShows}
              onChange={(e) => setMaxNoShows(e.target.value)}
              className="w-full h-1.5 bg-white/[0.06] rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#C5A059]
                [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-[#C5A059]/30
                [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2
                [&::-webkit-slider-thumb]:border-[#111111]
                [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full
                [&::-moz-range-thumb]:bg-[#C5A059] [&::-moz-range-thumb]:border-2
                [&::-moz-range-thumb]:border-[#111111] [&::-moz-range-thumb]:cursor-pointer"
            />

            <div className="flex justify-between text-[9px] text-zinc-600 px-0.5">
              <span>1 falta</span>
              <span>10 faltas</span>
            </div>
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-12 bg-[#C5A059] text-black font-black text-[11px] uppercase tracking-[0.2em] rounded-xl
              hover:bg-[#A68233] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed
              flex items-center justify-center gap-2 shadow-lg shadow-[#C5A059]/10"
          >
            {saving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar Configurações'
            )}
          </button>
        </div>

        {/* Right column — Preview / How it works */}
        <div className="space-y-5">
          {/* How it works */}
          <div className="bg-[#111111] border border-white/5 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.04] flex items-center gap-2">
              <AlertTriangle size={14} className="text-[#C5A059]" />
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Como funciona
              </span>
            </div>

            <div className="p-5 space-y-4">
              {/* Visual timeline */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-zinc-500">Faltas acumuladas</span>
                  <span className="text-[11px] text-zinc-500">Bloqueio em {maxNoShows}x</span>
                </div>
                <div className="flex gap-1.5">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div
                      key={i}
                      className={`flex-1 h-2 rounded-full transition-colors ${
                        i < numericVal - 1
                          ? 'bg-[#C5A059]/40'
                          : i === numericVal - 1
                            ? 'bg-[#C5A059]'
                            : 'bg-white/[0.04]'
                      }`}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-zinc-600">0</span>
                  <span className="text-[9px] text-[#C5A059] font-medium">Bloqueio</span>
                </div>
              </div>

              <div className="h-px bg-white/[0.04]" />

              {/* Steps */}
              <div className="space-y-3">
                {[
                  { icon: '1', text: 'Cliente falha em um agendamento' },
                  { icon: '2', text: 'Contador de faltas aumenta +1' },
                  { icon: '3', text: `Ao atingir ${maxNoShows}x, bloqueio ativa` },
                  { icon: '4', text: 'Cliente não pode agendar por 90 dias' },
                ].map((step) => (
                  <div key={step.icon} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#C5A059]/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[9px] font-bold text-[#C5A059]">{step.icon}</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">{step.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Severity indicator */}
          <div className={`${sev.bg} border ${sev.border} rounded-2xl p-5`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-8 h-8 rounded-lg ${sev.bg} flex items-center justify-center`}>
                <Ban size={14} className={sev.color} />
              </div>
              <div>
                <p className="text-[11px] text-zinc-500">Nível de rigor</p>
                <p className={`text-[14px] font-bold ${sev.color}`}>{sev.label}</p>
              </div>
            </div>
            <div className="flex items-start gap-2 text-[11px] text-zinc-400">
              <Check size={12} className={`${sev.color} shrink-0 mt-0.5`} />
              <span>
                {severity === 'alto' && (
                  <>
                    Com apenas <strong className="text-zinc-300">{maxNoShows} falta(s)</strong>, o
                    cliente é bloqueado. Ideal para evitar prejuízos.
                  </>
                )}
                {severity === 'medio' && (
                  <>
                    Após <strong className="text-zinc-300">{maxNoShows} faltas</strong>, o bloqueio
                    é ativado. Equilíbrio entre confiança e proteção.
                  </>
                )}
                {severity === 'baixo' && (
                  <>
                    O cliente precisa de{' '}
                    <strong className="text-zinc-300">{maxNoShows} faltas</strong> para ser
                    bloqueado. Mais tolerante com imprevistos.
                  </>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      <ToastNotification toast={toast} />
    </div>
  );
};

export default SettingsFaltas;
