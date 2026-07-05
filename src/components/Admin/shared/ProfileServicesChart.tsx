import React from 'react';
import type { TopService } from '../../../hooks/useProfileStats';

interface ProfileServicesChartProps {
  topServices: TopService[];
}

const ProfileServicesChart: React.FC<ProfileServicesChartProps> = ({ topServices }) => {
  const hasData = topServices.length > 0 && topServices.some((s) => s.count > 0);

  if (!hasData) {
    return (
      <div className="bg-[#111111] border border-white/5 rounded-2xl p-5">
        <h2 className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-4">
          Serviços mais pedidos no mês
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
      <h2 className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-4">
        Serviços mais pedidos no mês
      </h2>
      <div className="grid grid-cols-2 gap-x-8 gap-y-3">
        {topServices
          .filter((s) => s.count > 0)
          .map((srv, idx) => {
            const percentage = maxCount > 0 ? (srv.count / maxCount) * 100 : 0;
            return (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-zinc-300">{srv.name}</span>
                  <span className="text-[10px] font-black text-[#C5A059] tabular-nums">
                    {srv.count}x
                  </span>
                </div>
                <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#C5A059] rounded-full transition-all duration-500"
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
