import { type FC } from 'react';
import { BarChart3, TrendingDown, TrendingUp } from 'lucide-react';

interface OccupancyRateCardProps {
  occupiedCount: number;
  totalSlots: number;
}

const OccupancyRateCard: FC<OccupancyRateCardProps> = ({ occupiedCount, totalSlots }) => {
  const percentage = totalSlots > 0 ? Math.round((occupiedCount / totalSlots) * 100) : 0;
  const trend = percentage >= 60 ? 'up' : percentage >= 30 ? 'neutral' : 'down';
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : BarChart3;

  return (
    <div className="bg-[#111111] border border-white/5 rounded-2xl p-5 flex items-center gap-4">
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
          trend === 'up'
            ? 'bg-emerald-500/10 text-emerald-400'
            : trend === 'down'
              ? 'bg-white/5 text-zinc-400'
              : 'bg-zinc-500/10 text-zinc-400'
        }`}
      >
        <TrendIcon size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.2em] block mb-0.5">
          Taxa de Ocupação
        </span>
        <div className="flex items-baseline gap-2">
          <span
            className={`text-2xl font-black tabular-nums ${
              trend === 'up'
                ? 'text-emerald-400'
                : trend === 'down'
                  ? 'text-zinc-300'
                  : 'text-zinc-300'
            }`}
          >
            {percentage}%
          </span>
          <span className="text-[10px] text-zinc-600">
            {occupiedCount}/{totalSlots} horários
          </span>
        </div>
        {/* Progress bar */}
        <div className="mt-2 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              trend === 'up'
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                : trend === 'down'
                  ? 'bg-white/20'
                  : 'bg-white/[0.12]'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default OccupancyRateCard;
