import { type FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, AlertTriangle, ChevronRight, Clock } from 'lucide-react';
import { formatPricePublic } from '../../../lib/utils';
import type { MensalistaDashboardData } from '../../../hooks/useMensalistaDashboard';

interface MensalistaDashboardProps {
  data: MensalistaDashboardData;
  onSelectClient: (client: { name: string; phone: string }) => void;
}

function ExpiryBadge({ daysUntilExpiry }: { daysUntilExpiry: number | null }) {
  if (daysUntilExpiry === null) {
    return (
      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Sem prazo</span>
    );
  }
  if (daysUntilExpiry < 0) {
    return (
      <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider">Vencido</span>
    );
  }
  if (daysUntilExpiry === 0) {
    return (
      <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider">Vence hoje</span>
    );
  }
  if (daysUntilExpiry <= 3) {
    return (
      <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider">
        {daysUntilExpiry}d
      </span>
    );
  }
  return (
    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
      {daysUntilExpiry}d
    </span>
  );
}

const MensalistaDashboard: FC<MensalistaDashboardProps> = ({ data, onSelectClient }) => {
  const hasAlerts = data.expiringCount > 0 || data.expiredCount > 0;
  const hasData = data.totalActive > 0;

  // Empty state - clean and minimal
  if (!hasData && !data.loading) {
    return (
      <div className="text-center py-8 mb-2">
        <div className="w-14 h-14 rounded-2xl bg-[#D4AF37]/[0.06] border border-[#D4AF37]/10 flex items-center justify-center mx-auto mb-3">
          <Crown size={20} className="text-[#D4AF37]/40" />
        </div>
        <p className="text-[13px] text-zinc-400 font-medium">Nenhum mensalista ativo</p>
        <p className="text-[10px] text-zinc-600 mt-1">
          Torne clientes mensalistas na lista de clientes
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Compact Stats Bar */}
      <div className="flex items-center gap-6 py-3 px-4 bg-[#111111] border border-white/[0.04] rounded-xl">
        <div className="flex items-center gap-2">
          <Crown size={14} className="text-[#D4AF37]" />
          <span className="text-[11px] font-bold text-white">{data.totalActive}</span>
          <span className="text-[10px] text-zinc-500">ativos</span>
        </div>
        <div className="w-px h-4 bg-white/[0.06]" />
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-[#D4AF37]">
            {formatPricePublic(data.totalMonthlyRevenue)}
          </span>
          <span className="text-[10px] text-zinc-500">/mês</span>
        </div>
        {hasAlerts && (
          <>
            <div className="w-px h-4 bg-white/[0.06]" />
            <div className="flex items-center gap-3">
              {data.expiringCount > 0 && (
                <div className="flex items-center gap-1">
                  <Clock size={12} className="text-amber-400" />
                  <span className="text-[11px] font-bold text-amber-400">{data.expiringCount}</span>
                  <span className="text-[10px] text-zinc-500">vencendo</span>
                </div>
              )}
              {data.expiredCount > 0 && (
                <div className="flex items-center gap-1">
                  <AlertTriangle size={12} className="text-red-400" />
                  <span className="text-[11px] font-bold text-red-400">{data.expiredCount}</span>
                  <span className="text-[10px] text-zinc-500">vencidos</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Expiring Alerts */}
      <AnimatePresence>
        {hasAlerts && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="space-y-2"
          >
            {data.expiredClients.map((client) => (
              <button
                key={client.id}
                onClick={() => onSelectClient(client)}
                className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl bg-red-500/[0.04] border border-red-500/10 hover:bg-red-500/[0.08] transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-[10px] font-bold text-red-400 uppercase">
                    {client.name.charAt(0)}
                  </div>
                  <div className="text-left">
                    <p className="text-[12px] font-semibold text-white group-hover:text-red-400 transition-colors">
                      {client.name}
                    </p>
                    <p className="text-[9px] text-zinc-500">
                      {client.planName} · {formatPricePublic(client.planPrice)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ExpiryBadge daysUntilExpiry={client.daysUntilExpiry} />
                  <ChevronRight
                    size={12}
                    className="text-zinc-600 group-hover:text-zinc-400 transition-colors"
                  />
                </div>
              </button>
            ))}

            {data.expiringClients.map((client) => (
              <button
                key={client.id}
                onClick={() => onSelectClient(client)}
                className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl bg-amber-500/[0.04] border border-amber-500/10 hover:bg-amber-500/[0.08] transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-[10px] font-bold text-amber-400 uppercase">
                    {client.name.charAt(0)}
                  </div>
                  <div className="text-left">
                    <p className="text-[12px] font-semibold text-white group-hover:text-amber-400 transition-colors">
                      {client.name}
                    </p>
                    <p className="text-[9px] text-zinc-500">
                      {client.planName} · {formatPricePublic(client.planPrice)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ExpiryBadge daysUntilExpiry={client.daysUntilExpiry} />
                  <ChevronRight
                    size={12}
                    className="text-zinc-600 group-hover:text-zinc-400 transition-colors"
                  />
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Mensalistas List */}
      {data.activeClients.length > 0 && (
        <div className="space-y-1.5">
          {data.activeClients.map((client) => (
            <button
              key={client.id}
              onClick={() => onSelectClient(client)}
              className="w-full flex items-center justify-between py-2 px-3 rounded-xl hover:bg-white/[0.03] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center text-[10px] font-bold text-[#D4AF37] uppercase">
                  {client.name.charAt(0)}
                </div>
                <div className="text-left">
                  <p className="text-[12px] font-semibold text-white group-hover:text-[#D4AF37] transition-colors">
                    {client.name}
                  </p>
                  <p className="text-[9px] text-zinc-500">{client.planName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-zinc-400">
                  {formatPricePublic(client.planPrice)}
                </span>
                <ExpiryBadge daysUntilExpiry={client.daysUntilExpiry} />
                <ChevronRight
                  size={12}
                  className="text-zinc-600 group-hover:text-zinc-400 transition-colors"
                />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MensalistaDashboard;
