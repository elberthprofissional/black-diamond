import { type FC, useMemo } from 'react';
import { formatPhone } from '../../../lib/utils';
import { ChevronRight, AlertTriangle } from 'lucide-react';
import type { ClientWithStats } from '../../../types';

interface MobileClientListProps {
  clients: ClientWithStats[];
  plans: Array<{ id: string; name: string }>;
  isReminderRecent: (clientId: string) => boolean;
  onSelect: (client: ClientWithStats) => void;
}

function getClientStatusColor(client: ClientWithStats, isReminderRecent: (id: string) => boolean) {
  if (client.isInactive) return 'bg-red-500';
  if (isReminderRecent(client.id)) return 'bg-emerald-500';
  return 'bg-amber-500';
}

const MobileClientList: FC<MobileClientListProps> = ({
  clients,
  plans,
  isReminderRecent,
  onSelect,
}) => {
  const grouped = useMemo(() => {
    const map: Record<string, ClientWithStats[]> = {};
    clients.forEach((client) => {
      const letter = (client.name || '?').charAt(0).toUpperCase();
      if (!map[letter]) map[letter] = [];
      map[letter].push(client);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [clients]);

  return (
    <div className="lg:hidden space-y-2">
      {grouped.map(([letter, letterClients]) => (
        <div key={letter}>
          <div className="px-4 py-2 sticky top-0 z-10">
            <span className="text-[12px] font-bold text-zinc-500 uppercase">{letter}</span>
          </div>
          <div className="space-y-2">
            {letterClients.map((client) => (
              <div
                key={client.id}
                onClick={() => onSelect(client)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') onSelect(client);
                }}
                aria-label={`Cliente ${client.name}`}
                className="w-full flex items-center gap-3 py-3 px-4 rounded-xl cursor-pointer border border-white/[0.04] bg-white/[0.02] transition-all duration-200 group text-left hover:bg-white/[0.04] active:scale-[0.98]"
              >
                <div className="relative shrink-0">
                  <div className="w-9 h-9 rounded-full bg-[#111111] border border-white/[0.08] flex items-center justify-center text-xs font-bold text-white uppercase">
                    {client.name.charAt(0)}
                  </div>
                  <div
                    className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0A0A0A] ${getClientStatusColor(client, isReminderRecent)}`}
                  />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-[14px] font-semibold text-white truncate">
                    {client.name}
                    {client.is_mensalista &&
                      (() => {
                        const plan = plans.find((p) => p.id === client.mensalista_plan_id);
                        const expDate = client.mensalista_expires_at
                          ? new Date(client.mensalista_expires_at + 'T23:59:59')
                          : null;
                        const isExpiring =
                          expDate &&
                          expDate > new Date() &&
                          expDate <= new Date(Date.now() + 5 * 86400000);
                        const isExpired = expDate && expDate < new Date();
                        return (
                          <span
                            className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded font-bold align-middle inline-flex items-center gap-0.5 ${
                              isExpired
                                ? 'bg-red-500/10 text-red-400'
                                : isExpiring
                                  ? 'bg-amber-500/10 text-amber-400'
                                  : 'bg-[#D4AF37]/10 text-[#D4AF37]'
                            }`}
                          >
                            {isExpired && <AlertTriangle size={8} />}
                            {plan?.name || 'Mensalista'}
                          </span>
                        );
                      })()}
                  </p>
                  <p className="text-[12px] text-zinc-500 truncate mt-0.5">
                    {formatPhone(client.phone)} · {client.lastVisit}
                  </p>
                </div>
                <ChevronRight size={14} className="text-zinc-700 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default MobileClientList;
