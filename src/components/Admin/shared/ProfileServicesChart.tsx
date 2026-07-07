import React from 'react';
import type { TopService } from '../../../hooks/useProfileStats';

interface ProfileServicesChartProps {
  topServices: TopService[];
}

const RANK_LABELS = ['1º', '2º', '3º'];

const ProfileServicesChart: React.FC<ProfileServicesChartProps> = ({ topServices }) => {
  const hasAnyRequested = topServices.length > 0 && topServices.some((s) => s.count > 0);

  if (!hasAnyRequested) {
    return (
      <div className="bg-[#111111] border border-white/5 rounded-2xl p-5">
        <h2 className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-4">
          Top serviços mais pedidos no mês
        </h2>
        <p className="text-[9px] text-zinc-600 uppercase tracking-widest text-center py-6">
          Nenhum serviço no período
        </p>
      </div>
    );
  }

  const maxCount = Math.max(...topServices.map((s) => s.count));

  return (
    <div className="bg-[#111111] border border-white/5 rounded-2xl p-5">
      <h2 className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-5">
        Top serviços mais pedidos no mês
      </h2>
      <div className="space-y-4">
        {topServices.map((srv, idx) => {
          const percentage = maxCount > 0 ? (srv.count / maxCount) * 100 : 0;
          const isFirst = idx === 0;

          return (
            <div key={idx} className="space-y-2">
              <div className="flex items-center gap-3">
                {/* Ranking badge */}
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs shrink-0 ${
                    isFirst ? 'bg-[#C5A059]/20 text-[#C5A059]' : 'bg-white/[0.04] text-zinc-500'
                  }`}
                >
                  <span className="font-black">{RANK_LABELS[idx]}</span>
                </div>

                {/* Service name + count */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[13px] font-bold truncate ${
                        isFirst ? 'text-white' : 'text-zinc-300'
                      }`}
                    >
                      {srv.name}
                    </span>
                    <span
                      className={`text-[11px] font-black tabular-nums ml-3 ${
                        isFirst ? 'text-[#C5A059]' : 'text-zinc-400'
                      }`}
                    >
                      {srv.count}x
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden ml-11">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    isFirst
                      ? 'bg-gradient-to-r from-[#C5A059] to-[#D4B06A] shadow-[0_0_10px_rgba(197,160,89,0.3)]'
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
