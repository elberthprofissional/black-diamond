import { type FC } from 'react';
import { formatPhone } from '../../../lib/utils';
import { ChevronRight } from 'lucide-react';
import type { ClientWithStats } from '../../../types';

const AVATAR_STYLE = 'bg-white/[0.06] border border-white/[0.08] text-zinc-300';

interface DesktopClientGridProps {
  clients: ClientWithStats[];
  plans: Array<{ id: string; name: string }>;
  isReminderRecent: (clientId: string) => boolean;
  onSelect: (client: ClientWithStats) => void;
}

function getStatusColor(client: ClientWithStats, isReminderRecent: (id: string) => boolean) {
  if (client.isInactive) return 'bg-red-500';
  if (isReminderRecent(client.id)) return 'bg-emerald-500';
  return 'bg-amber-500';
}

const DesktopClientGrid: FC<DesktopClientGridProps> = ({
  clients,
  plans,
  isReminderRecent,
  onSelect,
}) => {
  return (
    <div className="hidden lg:grid lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5 gap-3">
      {clients.map((client) => {
        const initial = (client.name || '?').charAt(0).toUpperCase();

        return (
          <div
            key={client.id}
            onClick={() => onSelect(client)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onSelect(client);
            }}
            aria-label={`Cliente ${client.name}, ultimo corte: ${client.lastVisit}`}
            className="p-4 rounded-xl border border-white/[0.06] bg-[#111] transition-all duration-200 cursor-pointer group text-left hover:border-white/[0.12] hover:bg-[#151515]"
          >
            <div className="flex items-center gap-3.5">
              <div className="relative">
                <div
                  className={`w-11 h-11 rounded-xl ${AVATAR_STYLE} flex items-center justify-center text-sm font-black shrink-0`}
                >
                  {initial}
                </div>
                <div
                  className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#111] ${getStatusColor(client, isReminderRecent)}`}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="text-[13px] font-bold text-white truncate"
                  title={client.name}
                >
                  {client.name}
                  {client.is_mensalista && (
                    <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-md bg-[#D4AF37]/10 text-[#D4AF37] font-black uppercase tracking-wider align-middle">
                      {plans.find((p) => p.id === client.mensalista_plan_id)?.name || 'Plano'}
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                  {formatPhone(client.phone)}
                </p>
                <p className="text-[10px] text-zinc-700 truncate mt-0.5">
                  {client.lastVisit}
                </p>
              </div>
              <ChevronRight
                size={14}
                className="text-zinc-700 group-hover:text-zinc-500 shrink-0 transition-colors"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DesktopClientGrid;
