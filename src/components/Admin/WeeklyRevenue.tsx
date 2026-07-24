import { type FC } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, DollarSign, RefreshCw } from 'lucide-react';
import { useWeeklyRevenue } from '../../hooks/useWeeklyRevenue';

const DAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

interface WeeklyRevenueProps {
  barberId?: string;
}

const WeeklyRevenue: FC<WeeklyRevenueProps> = ({ barberId }) => {
  const { currentWeek, lastWeek, changePercent, loading, error, refetch } =
    useWeeklyRevenue(barberId);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 border border-white/[0.06] rounded-2xl p-5">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-28 bg-white/[0.06] rounded" />
          <div className="h-8 w-40 bg-white/[0.06] rounded" />
          <div className="h-3 w-32 bg-white/[0.06] rounded" />
          <div className="flex gap-1.5 mt-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex-1 h-16 bg-white/[0.04] rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 border border-white/[0.06] rounded-2xl p-5">
        <p className="text-[11px] text-zinc-500">Faturamento semanal</p>
        <p className="text-[12px] text-red-400 mt-1">{error}</p>
      </div>
    );
  }

  const isPositive = changePercent >= 0;
  const maxDaily = Math.max(...currentWeek.daily, 1);
  const formattedCurrent = currentWeek.revenue.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const formattedLast = lastWeek.revenue.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 border border-white/[0.06] rounded-2xl p-5 hover:border-white/[0.1] transition-all duration-300"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <DollarSign size={13} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Faturamento
            </p>
            <p className="text-[9px] text-zinc-600 -mt-0.5">Esta semana vs anterior</p>
          </div>
        </div>
        <button
          onClick={refetch}
          className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer"
          title="Atualizar"
        >
          <RefreshCw size={13} className="text-zinc-500" />
        </button>
      </div>

      {/* Revenue Number */}
      <div className="flex items-baseline gap-3 mb-1">
        <span className="text-3xl font-bold text-white tracking-tight">R$ {formattedCurrent}</span>
        <div
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
            isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
          }`}
        >
          {isPositive ? (
            <TrendingUp size={11} className="shrink-0" />
          ) : (
            <TrendingDown size={11} className="shrink-0" />
          )}
          <span>
            {isPositive ? '+' : ''}
            {changePercent}%
          </span>
        </div>
      </div>

      {/* Last week comparison */}
      <p className="text-[10px] text-zinc-600 mb-4">
        Semana passada: <span className="text-zinc-400">R$ {formattedLast}</span>
        {' · '}
        {currentWeek.count} agendamento{currentWeek.count !== 1 ? 's' : ''}
      </p>

      {/* Mini Bar Chart */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          {currentWeek.daily.map((value, i) => {
            const height = value > 0 ? Math.max((value / maxDaily) * 100, 8) : 4;
            const nowDay = new Date().getDay();
            const isCurrentDay = i === (nowDay + 6) % 7;

            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="relative w-full flex items-end justify-center"
                  style={{ height: 52 }}
                >
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${height}%` }}
                    transition={{ duration: 0.6, delay: i * 0.05, ease: 'easeOut' }}
                    className={`w-full max-w-[24px] rounded-sm transition-all duration-300 ${
                      isCurrentDay
                        ? 'bg-gradient-to-t from-[#D4AF37] to-amber-400 shadow-[0_0_8px_rgba(212,175,55,0.3)]'
                        : value > 0
                          ? 'bg-gradient-to-t from-emerald-600/60 to-emerald-500/40'
                          : 'bg-white/[0.03]'
                    }`}
                    style={{
                      minHeight: value > 0 ? 8 : 4,
                    }}
                  />
                </div>
                <span
                  className={`text-[8px] font-medium ${
                    isCurrentDay ? 'text-[#D4AF37]' : 'text-zinc-600'
                  }`}
                >
                  {DAY_LABELS[i]}
                </span>
                <span className="text-[7px] text-zinc-700 leading-none">
                  R${value > 0 ? Math.round(value) : '—'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary footer */}
      {lastWeek.revenue > 0 && (
        <div className="mt-3 pt-3 border-t border-white/[0.04]">
          <p className="text-[9px] text-zinc-600 leading-relaxed">
            {isPositive
              ? `📈 ${currentWeek.count >= lastWeek.count ? 'Mais agendamentos' : 'Ticket médio maior'} que a semana passada`
              : `📉 Abaixo da semana passada em R$ ${(lastWeek.revenue - currentWeek.revenue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default WeeklyRevenue;
