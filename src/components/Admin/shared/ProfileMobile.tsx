import React from 'react';
import { Eye, EyeOff, TrendingUp, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface QuickAction {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  active?: boolean;
}

interface ProfileMobileProps {
  greeting: string;
  barberName: string;
  barberPhoto?: string;
  showBalance: boolean;
  toggleBalance: () => void;
  lucroTotal: number;
  lucroSemana: number;
  lucroMes: number;
  currentConcluidos: number;
  currentCancelados: number;
  timeRange: 'week' | 'month';
  setTimeRange: (range: 'week' | 'month') => void;
  topServices: { name: string; count: number }[];
  quickActions: QuickAction[];
}

const ProfileMobile: React.FC<ProfileMobileProps> = ({
  greeting,
  barberName,
  barberPhoto,
  showBalance,
  toggleBalance,
  lucroTotal,
  lucroSemana,
  lucroMes,
  currentConcluidos,
  currentCancelados,
  timeRange,
  setTimeRange,
  topServices,
  quickActions,
}) => {
  return (
    <div className="lg:hidden w-full max-w-md mx-auto space-y-6">
      <div className="bg-[#161616] border-b border-white/5 px-6 pt-6 pb-8 -mt-4 text-white flex flex-col gap-6 relative overflow-hidden shadow-lg shadow-black/40">
        <div className="absolute top-[-50px] right-[-50px] w-[150px] h-[150px] bg-[#C5A059]/5 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between">
          <div className="w-12 h-12 rounded-full border border-white/[0.08] overflow-hidden shrink-0 bg-white/[0.03]">
            {barberPhoto ? (
              <img src={barberPhoto} alt={barberName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User size={18} className="text-zinc-600" />
              </div>
            )}
          </div>
          <button
            onClick={toggleBalance}
            className="w-10 h-10 rounded-full hover:bg-white/5 flex items-center justify-center transition-all cursor-pointer text-zinc-400 hover:text-white"
            aria-label={showBalance ? "Ocultar faturamento" : "Exibir faturamento"}
          >
            {showBalance ? <Eye size={20} /> : <EyeOff size={20} />}
          </button>
        </div>
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-white">{greeting}, {barberName}</h1>
        </div>
      </div>

      <div className="px-5 py-1 space-y-1">
        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Faturamento Total</p>
        <div className="text-2xl font-bold text-white tracking-tight leading-none flex items-baseline">
          {showBalance ? (
            <>
              <span className="text-[#C5A059] font-bold text-sm mr-1">R$</span>
              <span>{lucroTotal.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
            </>
          ) : (
            <span className="text-zinc-600 tracking-widest text-lg font-bold">••••</span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest pl-5">Ações Rápidas</span>
        <div className="flex gap-4 overflow-x-auto pb-2 px-5 scrollbar-hide snap-x w-full">
          {quickActions.map((action, idx) => {
            const Icon = action.icon;
            const isActive = 'active' in action ? action.active : false;
            return (
              <button
                key={idx}
                onClick={action.onClick}
                className="flex flex-col items-center gap-2 snap-center cursor-pointer shrink-0 group select-none"
              >
                <div className={`w-14 h-14 rounded-full border flex items-center justify-center transition-all ${
                  isActive
                    ? 'bg-[#C5A059]/10 border-[#C5A059]/30 text-[#C5A059]'
                    : 'bg-[#111111] hover:bg-[#161616] border-white/5 group-hover:border-[#C5A059]/30 text-zinc-400 group-hover:text-white'
                }`}>
                  <Icon size={18} className="transition-transform group-hover:scale-110" />
                </div>
                <span className="text-[9px] font-bold text-zinc-500 group-hover:text-zinc-300 uppercase tracking-widest transition-colors">
                  {action.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between border-b border-white/[0.04] pb-2 pt-2 px-5">
        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Resumo do Período</span>
        <div className="flex gap-4">
          <button
            onClick={() => setTimeRange('week')}
            className={`relative pb-2 text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer ${timeRange === 'week' ? 'text-[#C5A059]' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            {timeRange === 'week' && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#C5A059] rounded-full" />}
            Semana
          </button>
          <button
            onClick={() => setTimeRange('month')}
            className={`relative pb-2 text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer ${timeRange === 'month' ? 'text-[#C5A059]' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            {timeRange === 'month' && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#C5A059] rounded-full" />}
            Mês
          </button>
        </div>
      </div>

      <div className="space-y-4 px-5">
        <div className="bg-[#111111] border border-white/5 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-zinc-400">
            <TrendingUp size={14} className="text-[#C5A059]" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Análise da Barbearia</span>
          </div>
          <div className="grid grid-cols-2 gap-4 divide-x divide-white/[0.04]">
            <div className="space-y-1">
              <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest block">Faturamento</span>
              <div className="text-base font-bold text-[#C5A059] tabular-nums">
                {showBalance ? `R$ ${(timeRange === 'week' ? lucroSemana : lucroMes).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '••••'}
              </div>
            </div>
            <div className="space-y-1 pl-4">
              <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest block">Atendimentos</span>
              <div className="text-base font-bold text-white tabular-nums">{currentConcluidos}</div>
            </div>
          </div>
          <div className="pt-2 border-t border-white/[0.03] flex justify-center">
            <div className="space-y-1 text-center">
              <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest block">Cancelamentos</span>
              <div className="text-base font-bold text-red-500/70 tabular-nums">{currentCancelados}</div>
            </div>
          </div>
        </div>

        <div className="bg-[#111111] border border-white/5 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-zinc-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Serviços Mais Pedidos</span>
          </div>
          {topServices.length > 0 && topServices.some(s => s.count > 0) ? (
            <div className="space-y-3 pt-1">
              {topServices.filter(s => s.count > 0).map((srv, idx) => {
                const maxCount = Math.max(...topServices.map(s => s.count));
                const percentage = maxCount > 0 ? (srv.count / maxCount) * 100 : 0;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-zinc-300">{srv.name}</span>
                      <span className="font-bold text-[#C5A059] tabular-nums">{srv.count}x</span>
                    </div>
                    <div className="h-1.5 bg-white/[0.03] rounded-full overflow-hidden">
                      <div className="h-full bg-[#C5A059] rounded-full transition-all duration-500" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[9px] text-zinc-600 uppercase tracking-widest text-center py-6">Nenhum serviço no período</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileMobile;
