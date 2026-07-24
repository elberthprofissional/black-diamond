import { type FC, useMemo, useState } from 'react';
import { useProfileStats } from '../hooks/useProfileStats';
import { useWeeklyRevenue } from '../hooks/useWeeklyRevenue';
import AdminLayout from '../components/Admin/AdminLayout';
import { SkeletonDashboard } from '../components/Skeleton';

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const AdminReports: FC = () => {
  const { stats, loading } = useProfileStats();
  const { currentWeek, lastWeek, changePercent, loading: weeklyLoading } = useWeeklyRevenue();
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
        <div className="space-y-5">
          <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-white uppercase italic">
            Relatórios
          </h1>
          <SkeletonDashboard />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
          <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-white uppercase italic">
            Relatórios
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => setPeriod('week')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                period === 'week'
                  ? 'bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37]'
                  : 'bg-white/[0.02] border border-white/[0.06] text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Semana
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                period === 'month'
                  ? 'bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37]'
                  : 'bg-white/[0.02] border border-white/[0.06] text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Mês
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-[#111111] border border-white/5 rounded-2xl p-5 space-y-2">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.15em] block">
              Faturamento
            </span>
            <p className="text-2xl font-black text-[#D4AF37] tracking-tight tabular-nums">
              R$ {currentRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-[#111111] border border-white/5 rounded-2xl p-5 space-y-2">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.15em] block">
              Total (Histórico)
            </span>
            <p className="text-2xl font-black text-white tracking-tight tabular-nums">
              R$ {stats.lucroTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-[#111111] border border-white/5 rounded-2xl p-5 space-y-2">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.15em] block">
              Atendimentos
            </span>
            <p className="text-2xl font-black text-white tracking-tight tabular-nums">
              {currentCompleted}
            </p>
          </div>
          <div className="bg-[#111111] border border-white/5 rounded-2xl p-5 space-y-2">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.15em] block">
              Cancelamentos
            </span>
            <p className="text-2xl font-black text-red-500/70 tracking-tight tabular-nums">
              {currentCancelled}
            </p>
          </div>
        </div>

        {/* Weekly Comparison */}
        <div className="bg-[#111111] border border-white/5 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
              Comparativo Semanal
            </span>
            <span
              className={`text-[10px] font-bold uppercase tracking-wider ${
                changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {changePercent >= 0 ? '▲' : '▼'} {Math.abs(changePercent)}%
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/[0.02] rounded-xl p-4 space-y-2">
              <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">
                Semana Atual
              </span>
              <p className="text-lg font-black text-[#D4AF37] tabular-nums">
                R$ {currentWeek.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-zinc-600">{currentWeek.count} atendimentos</span>
            </div>
            <div className="bg-white/[0.02] rounded-xl p-4 space-y-2">
              <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">
                Semana Passada
              </span>
              <p className="text-lg font-black text-zinc-400 tabular-nums">
                R$ {lastWeek.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-zinc-600">{lastWeek.count} atendimentos</span>
            </div>
          </div>
        </div>

        {/* Daily Revenue Chart (bar chart) */}
        <div className="bg-[#111111] border border-white/5 rounded-2xl p-5 space-y-4">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] block">
            Faturamento Diário (Esta Semana)
          </span>
          <div className="flex items-end gap-2 h-40 pt-2">
            {weeklyData.map((day) => (
              <div key={day.label} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <span className="text-[9px] font-bold text-[#D4AF37] tabular-nums">
                  R$ {day.value.toFixed(0)}
                </span>
                <div
                  className="w-full bg-gradient-to-t from-[#D4AF37] to-[#D4AF37]/40 rounded-t-md transition-all duration-500"
                  style={{
                    height: `${Math.max(day.percent, 4)}%`,
                    opacity: day.value > 0 ? 1 : 0.2,
                  }}
                />
                <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider">
                  {day.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Services */}
        <div className="bg-[#111111] border border-white/5 rounded-2xl p-5 space-y-4">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] block">
            Serviços Mais Pedidos (Mês)
          </span>
          {topServices.length > 0 ? (
            <div className="space-y-4">
              {topServices.map((srv, idx) => {
                const maxCount = topServices[0]?.count ?? 1;
                const percentage = maxCount > 0 ? (srv.count / maxCount) * 100 : 0;
                return (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-5 h-5 rounded-full bg-white/[0.04] flex items-center justify-center text-[9px] font-bold text-zinc-500">
                          {idx + 1}
                        </span>
                        <span className="text-[12px] font-bold text-zinc-300">{srv.name}</span>
                      </div>
                      <span className="text-[10px] font-bold text-[#D4AF37] tabular-nums">
                        {srv.count}x
                      </span>
                    </div>
                    <div className="h-2 bg-white/[0.03] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#D4AF37] to-[#d4aF37]/60 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest text-center py-6">
              Nenhum serviço no período
            </p>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminReports;
