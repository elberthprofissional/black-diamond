import { type FC } from 'react';
import { Scissors, DollarSign, User, LogOut } from 'lucide-react';

interface ProfileDesktopMetricsProps {
  greeting: string;
  barberName: string;
  barberPhoto: string;
  lucroTotal: number;
  lucroSemana: number;
  lucroMes: number;
  currentConcluidos: number;
  currentCancelados: number;
  onLogout: () => void;
}

const ProfileDesktopMetrics: FC<ProfileDesktopMetricsProps> = ({
  greeting,
  barberName,
  barberPhoto,
  lucroTotal,
  lucroSemana,
  lucroMes,
  currentConcluidos,
  currentCancelados,
  onLogout,
}) => {
  return (
    <div className="hidden lg:flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 py-2 border-b border-white/5 pb-5">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <div className="w-16 h-16 rounded-full border border-white/10 overflow-hidden bg-white/[0.03]">
              {barberPhoto ? (
                <img src={barberPhoto} alt={barberName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User size={24} className="text-zinc-600" />
                </div>
              )}
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#0A0A0A] rounded-full" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-white tracking-tight">
              {greeting}, {barberName}
            </h1>
          </div>
          <button
            onClick={onLogout}
            aria-label="Sair da conta"
            className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-red-400 border border-white/[0.06] hover:border-red-500/20 rounded-lg transition-all cursor-pointer shrink-0"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>

      {/* Total Revenue */}
      <div className="bg-[#111111] border border-white/5 rounded-2xl p-5">
        <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.2em] block mb-1">
          Faturamento Total
        </span>
        <p className="text-3xl font-black text-white tracking-tight">
          <span className="text-sm font-bold text-[#C5A059] mr-1">R$</span>
          {lucroTotal.toLocaleString('pt-BR', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })}
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="bg-[#111111] border border-white/5 rounded-xl p-4 flex flex-col gap-3">
          <Scissors size={22} className="text-[#C5A059]/30" />
          <div>
            <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.15em] block mb-1">
              Atendimentos
            </span>
            <p className="text-xl font-black text-white tracking-tight tabular-nums">
              {currentConcluidos}
            </p>
          </div>
        </div>
        <div className="bg-[#111111] border border-white/5 rounded-xl p-4 flex flex-col gap-3">
          <span className="text-[#C5A059]/30 text-lg font-black">✕</span>
          <div>
            <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.15em] block mb-1">
              Cancelados
            </span>
            <p className="text-xl font-black text-red-500/70 tracking-tight tabular-nums">
              {currentCancelados}
            </p>
          </div>
        </div>
        <div className="col-span-2 lg:col-span-2 bg-[#111111] border border-white/5 rounded-xl p-4 flex flex-col gap-3">
          <DollarSign size={22} className="text-[#C5A059]/30" />
          <div>
            <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.15em] block mb-1">
              Faturamento Semanal
            </span>
            <p className="text-xl font-black text-[#C5A059] tracking-tight tabular-nums">
              R${' '}
              {lucroSemana.toLocaleString('pt-BR', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </p>
          </div>
        </div>
        <div className="col-span-2 lg:col-span-2 bg-[#111111] border border-white/5 rounded-xl p-4 flex flex-col gap-3">
          <DollarSign size={22} className="text-[#C5A059]/30" />
          <div>
            <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.15em] block mb-1">
              Faturamento Mensal
            </span>
            <p className="text-xl font-black text-[#C5A059] tracking-tight tabular-nums">
              R${' '}
              {lucroMes.toLocaleString('pt-BR', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileDesktopMetrics;
