import { type FC, useMemo, useState } from 'react';
import { useProfileStats } from '../hooks/useProfileStats';
import { useWeeklyRevenue } from '../hooks/useWeeklyRevenue';
import { useBarberScope } from '../hooks/useBarberScope';
import AdminLayout from '../components/Admin/AdminLayout';
import { SkeletonDashboard } from '../components/Skeleton';

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const AdminReports: FC = () => {
  const { stats, loading } = useProfileStats();
  const { scopedBarberId } = useBarberScope();
  const {
    currentWeek,
    lastWeek,
    changePercent,
    loading: weeklyLoading,
  } = useWeeklyRevenue(scopedBarberId || undefined);
  const [period, setPeriod] = useState<'week' | 'month'>('week');

  const weeklyData = useMemo(() => {
    const max = Math.max(...currentWeek.daily, 1);
    return currentWeek.daily.map((value, i) => ({
      label: DAY_LABELS[i],
      value,
      percent: (value / max) * 100,
    }));
  }, [currentWeek.daily]);

  const topServices = useMemo(() => {
    return stats.topServices.slice(0, 5);
  }, [stats.topServices]);

  const currentRevenue = period === 'week' ? stats.lucroSemana : stats.lucroMes;
  const currentCompleted = period === 'week' ? stats.concluidosSemana : stats.concluidosMes;
  const currentCancelled = period === 'week' ? stats.canceladosSemana : stats.canceladosMes;

  if (loading || weeklyLoading) {
    return (
      <AdminLayout>
        <div className="space-y-4">
          <h1 className="text-lg font-bold tracking-tight text-white">Painel</h1>
          <SkeletonDashboard />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-4 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg lg:text-2xl font-bold tracking-tight text-white">Painel</h1>
            <p className="text-[10px] lg:text-[11px] text-zinc-500 mt-0.5">Resumo do seu negócio</p>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => setPeriod('week')}
              className={`px-3 py-1.5 lg:px-4 lg:py-2 rounded-lg lg:rounded-xl text-[10px] lg:text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                period === 'week'
                  ? 'bg-gold/10 border border-gold/30 text-gold'
                  : 'bg-white/[0.02] border border-white/[0.06] text-zinc-500'
              }`}
            >
              Semana
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`px-3 py-1.5 lg:px-4 lg:py-2 rounded-lg lg:rounded-xl text-[10px] lg:text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                period === 'month'
                  ? 'bg-gold/10 border border-gold/30 text-gold'
                  : 'bg-white/[0.02] border border-white/[0.06] text-zinc-500'
              }`}
            >
              Mês
            </button>
          </div>
        </div>

        {/* Resumo Rápido - 2x2 grid compacto */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-[#111111] border border-white/5 rounded-xl p-4">
            <span className="text-[9px] lg:text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
              {period === 'week' ? 'Ganhos Semana' : 'Ganhos Mês'}
            </span>
            <p className="text-xl lg:text-2xl font-black text-gold tracking-tight tabular-nums">
              R$ {currentRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-[#111111] border border-white/5 rounded-xl p-4">
            <span className="text-[9px] lg:text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
              Total Geral
            </span>
            <p className="text-xl lg:text-2xl font-black text-white tracking-tight tabular-nums">
              R$ {stats.lucroTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-[#111111] border border-white/5 rounded-xl p-4">
            <span className="text-[9px] lg:text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
              Cortes
            </span>
            <p className="text-xl lg:text-2xl font-black text-white tracking-tight tabular-nums">
              {currentCompleted}
            </p>
          </div>
          <div className="bg-[#111111] border border-white/5 rounded-xl p-4">
            <span className="text-[9px] lg:text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
              Cancelamentos
            </span>
            <p className="text-xl lg:text-2xl font-black text-red-500/70 tracking-tight tabular-nums">
              {currentCancelled}
            </p>
          </div>
        </div>

        {/* Comparação - compacta */}
        <div className="bg-[#111111] border border-white/5 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] lg:text-[12px] font-bold text-zinc-300">
              Comparação Semanal
            </span>
            <span
              className={`text-[10px] lg:text-[11px] font-bold px-2 py-0.5 rounded-md ${
                changePercent >= 0
                  ? 'text-emerald-400 bg-emerald-400/10'
                  : 'text-red-400 bg-red-400/10'
              }`}
            >
              {changePercent >= 0 ? '+' : ''}
              {changePercent}%
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/[0.02] rounded-lg p-3">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">
                Esta
              </span>
              <p className="text-base lg:text-lg font-black text-gold tabular-nums mt-0.5">
                R$ {currentWeek.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[9px] text-zinc-600">
                {currentWeek.count} {currentWeek.count === 1 ? 'corte' : 'cortes'}
              </span>
            </div>
            <div className="bg-white/[0.02] rounded-lg p-3">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">
                Anterior
              </span>
              <p className="text-base lg:text-lg font-black text-zinc-400 tabular-nums mt-0.5">
                R$ {lastWeek.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[9px] text-zinc-600">
                {lastWeek.count} {lastWeek.count === 1 ? 'corte' : 'cortes'}
              </span>
            </div>
          </div>
        </div>

        {/* Ganhos por Dia */}
        <div className="bg-[#111111] border border-white/5 rounded-xl p-4 space-y-3">
          <span className="text-[11px] lg:text-[12px] font-bold text-zinc-300 block">
            Ganhos por Dia
          </span>
          <div className="flex items-end gap-1.5 lg:gap-2 h-32 lg:h-40">
            {weeklyData.map((day) => (
              <div
                key={day.label}
                className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end"
              >
                <span className="text-[8px] lg:text-[9px] font-bold text-gold tabular-nums">
                  R${day.value.toFixed(0)}
                </span>
                <div
                  className="w-full bg-gradient-to-t from-gold to-gold/40 rounded-t transition-all duration-500"
                  style={{
                    height: `${Math.max(day.percent, 4)}%`,
                    opacity: day.value > 0 ? 1 : 0.2,
                  }}
                />
                <span className="text-[8px] lg:text-[9px] font-bold text-zinc-600 uppercase">
                  {day.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Serviços Mais Populares */}
        <div className="bg-[#111111] border border-white/5 rounded-xl p-4 space-y-3">
          <span className="text-[11px] lg:text-[12px] font-bold text-zinc-300 block">
            Serviços Populares
          </span>
          {topServices.length > 0 ? (
            <div className="space-y-3">
              {topServices.map((srv, idx) => {
                const maxCount = topServices[0]?.count ?? 1;
                const percentage = maxCount > 0 ? (srv.count / maxCount) * 100 : 0;
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-white/[0.04] flex items-center justify-center text-[8px] font-bold text-zinc-500">
                          {idx + 1}
                        </span>
                        <span className="text-[11px] lg:text-[12px] font-bold text-zinc-300">
                          {srv.name}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-gold tabular-nums">
                        {srv.count}x
                      </span>
                    </div>
                    <div className="h-1.5 bg-white/[0.03] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-gold to-gold/60 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[10px] text-zinc-600 text-center py-4">Nenhum serviço no período</p>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminReports;
