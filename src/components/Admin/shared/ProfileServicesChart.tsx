import { type FC } from 'react';
import { BarChart3 } from 'lucide-react';
import type { TopService } from '../../../hooks/useProfileStats';

interface ProfileServicesChartProps {
  topServices: TopService[];
}

const ProfileServicesChart: FC<ProfileServicesChartProps> = ({ topServices }) => {
  const hasAnyRequested = topServices.length > 0 && topServices.some((s) => s.count > 0);

  if (!hasAnyRequested) {
    return (
      <div className="bg-[#111111] border border-white/5 rounded-2xl p-5">
        <h2 className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-4">
          Top serviços mais pedidos no mês
        </h2>
        <div className="flex flex-col items-center py-6 gap-3">
          <BarChart3 size={24} className="text-zinc-700" />
          <p className="text-[11px] text-zinc-600 text-center max-w-xs">
            Nenhum serviço foi solicitado neste período. Os dados aparecerão assim que houver
            agendamentos concluídos.
          </p>
        </div>
      </div>
    );
  }

  const maxCount = Math.max(...topServices.map((s) => s.count));
  const totalCount = topServices.reduce((acc, s) => acc + s.count, 0);

  return (
    <div className="bg-[#111111] border border-white/5 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
          Top serviços mais pedidos no mês
        </h2>
        <span className="text-[9px] text-zinc-600 tabular-nums">{totalCount} pedidos</span>
      </div>
      <div className="space-y-4">
        {topServices.slice(0, 5).map((srv, idx) => {
          const percentage = maxCount > 0 ? (srv.count / maxCount) * 100 : 0;
          const percentOfTotal = totalCount > 0 ? ((srv.count / totalCount) * 100).toFixed(0) : '0';
          const isFirst = idx === 0;

          return (
            <div key={idx} className="space-y-1.5">
              <div className="flex items-center gap-3">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    isFirst ? 'bg-[#C5A059]/20 text-[#C5A059]' : 'bg-white/[0.04] text-zinc-500'
                  }`}
                >
                  <span
                    className={`text-[11px] font-black ${isFirst ? 'text-[#C5A059]' : 'text-zinc-500'}`}
                  >
                    {idx + 1}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[12px] font-bold truncate ${
                        isFirst ? 'text-white' : 'text-zinc-300'
                      }`}
                    >
                      {srv.name}
                    </span>
                    <div className="flex items-center gap-2 ml-2">
                      <span
                        className={`text-[10px] font-black tabular-nums ${
                          isFirst ? 'text-[#C5A059]' : 'text-zinc-400'
                        }`}
                      >
                        {srv.count}x
                      </span>
                      <span className="text-[8px] text-zinc-600 tabular-nums">
                        {percentOfTotal}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden ml-10">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    isFirst
                      ? 'bg-gradient-to-r from-[#C5A059] to-[#D4B06A] shadow-[0_0_8px_rgba(197,160,89,0.25)]'
                      : 'bg-white/[0.12]'
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProfileServicesChart;
