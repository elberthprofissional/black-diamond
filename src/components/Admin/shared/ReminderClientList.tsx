import { useState, useMemo, type FC } from 'react';
import { Search, ChevronRight } from 'lucide-react';
import { formatPhone } from '../../../lib/utils';
import type { Client } from '../../../types';

const AVATAR_STYLE = 'bg-white/[0.06] border border-white/[0.08] text-zinc-300';

interface ReminderClientListProps {
  clients: Client[];
  onSelect: (client: Client) => void;
}

const ReminderClientList: FC<ReminderClientListProps> = ({ clients, onSelect }) => {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return clients;
    const term = search.toLowerCase();
    return clients.filter(
      (c) => c.name.toLowerCase().includes(term) || c.phone.includes(term.replace(/\D/g, ''))
    );
  }, [search, clients]);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0 scrollbar-hide">
      <div className="relative mb-4">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          placeholder="Buscar cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl py-3 pl-11 pr-4 text-[14px] text-white outline-none transition-all placeholder:text-zinc-600 focus:border-[#D4AF37]/50 focus:bg-white/[0.05]"
        />
      </div>
      {filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((client) => {
            const initial = (client.name || '?').charAt(0).toUpperCase();
            return (
              <button
                key={client.id}
                onClick={() => onSelect(client)}
                className="w-full flex items-center gap-3 py-3 px-4 rounded-xl border border-white/[0.04] bg-white/[0.02] cursor-pointer group hover:bg-white/[0.04] hover:border-white/[0.08] transition-all text-left"
              >
                <div
                  className={`w-10 h-10 rounded-xl ${AVATAR_STYLE} flex items-center justify-center shrink-0`}
                >
                  <span className="text-[13px] font-bold">{initial}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-white truncate">{client.name}</p>
                  <p className="text-[11px] text-zinc-500">{formatPhone(client.phone)}</p>
                </div>
                <ChevronRight
                  size={16}
                  className="text-zinc-600 shrink-0 group-hover:text-zinc-400 transition-colors"
                />
              </button>
            );
          })}
        </div>
      ) : (
        <div className="py-12 text-center">
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
            Nenhum cliente encontrado
          </p>
        </div>
      )}
    </div>
  );
};

export default ReminderClientList;
