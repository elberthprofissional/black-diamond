import { useState, useEffect, type FC } from 'react';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../hooks/useToast';
import ToastNotification from '../shared/ToastNotification';
import { Shield } from 'lucide-react';

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
      desc: 'Bloqueia rápido. Ideal para evitar prejuízos.',
    },
    medio: {
      label: 'Equilibrado',
      color: 'text-[#C5A059]',
      bg: 'bg-[#C5A059]/10',
      border: 'border-[#C5A059]/20',
      desc: 'Equilíbrio entre confiança e proteção.',
    },
    baixo: {
      label: 'Permissivo',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      desc: 'Mais tolerante com imprevistos.',
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
    <div className="space-y-5 max-w-3xl mx-auto lg:mx-0">
      {/* Header — Desktop */}
      <div className="hidden lg:block py-2">
        <h3 className="text-[15px] font-bold text-white">Controle de Faltas</h3>
        <p className="text-[12px] text-zinc-500 mt-0.5">
          Bloqueio automático por não comparecimento
        </p>
      </div>

      {/* Info */}
      <div className="flex items-start gap-3 bg-[#C5A059]/[0.03] border border-[#C5A059]/10 rounded-xl px-4 py-3">
        <Shield size={15} className="text-[#C5A059]/60 shrink-0 mt-0.5" />
        <p className="text-[11px] text-zinc-400 leading-relaxed">
          Ao atingir o limite, o cliente é bloqueado por{' '}
          <strong className="text-zinc-300">90 dias</strong> e não pode agendar.
        </p>
      </div>

      {/* Slider + Severity */}
      <div className="bg-[#111111] border border-white/5 rounded-2xl p-5 space-y-5">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.15em]">
            Limite de faltas
          </span>
          <div className="flex items-center gap-2.5">
            <span className={`text-[9px] font-bold uppercase tracking-wider ${sev.color}`}>
              {sev.label}
            </span>
            <span className="text-xl font-black text-[#C5A059] tabular-nums">{maxNoShows}x</span>
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

        {/* Severity description */}
        <div
          className={`flex items-center gap-2 px-3 py-2.5 rounded-lg ${sev.bg} border ${sev.border}`}
        >
          <div className={`w-1.5 h-1.5 rounded-full ${sev.color.replace('text-', 'bg-')}`} />
          <span className={`text-[11px] ${sev.color}`}>{sev.desc}</span>
        </div>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full h-12 bg-[#C5A059] text-black font-black text-[11px] uppercase tracking-[0.2em] rounded-xl
          hover:bg-[#A68233] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed
          flex items-center justify-center gap-2"
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

      <ToastNotification toast={toast} />
    </div>
  );
};

export default SettingsFaltas;
