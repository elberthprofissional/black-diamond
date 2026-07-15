import { useState, useMemo, type FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ChevronRight } from 'lucide-react';
import { useModalA11y } from '../../../hooks/useModalA11y';
import { formatPhone } from '../../../lib/utils';
import { BLOCKED_NAME, BLOCKED_PHONE } from '../../../lib/constants';
import type { Client } from '../../../types';

interface BookingSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectClient: (client: Client) => void;
  clients: Client[];
}

const AVATAR_STYLE = 'bg-white/[0.06] border border-white/[0.08] text-zinc-300';

const BookingSearchModal: FC<BookingSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectClient,
  clients,
}) => {
  const [query, setQuery] = useState('');
  const { dialogRef } = useModalA11y(isOpen, onClose);

  const filteredClients = useMemo(() => {
    return clients.filter(
      (c) => c && c.name && !c.deleted_at && c.name !== BLOCKED_NAME && c.phone !== BLOCKED_PHONE
    );
  }, [clients]);

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return filteredClients;
    const isPhone = /^\d/.test(term);
    if (isPhone) {
      const digits = term.replace(/\D/g, '');
      return filteredClients.filter((c) => c.phone.replace(/\D/g, '').includes(digits));
    }
    return filteredClients.filter((c) => c.name.toLowerCase().includes(term));
  }, [query, filteredClients]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        />
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label="Buscar cliente"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative z-10 w-full max-w-[400px] bg-[#0E0E0E] border border-white/[0.06] rounded-2xl overflow-hidden max-h-[80vh] flex flex-col shadow-2xl"
        >
          {/* Header — Igual ao ReminderModal */}
          <div className="px-6 py-5 flex items-center justify-between border-b border-white/[0.04] shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#C5A059]/10 flex items-center justify-center">
                <Search size={14} className="text-[#C5A059]" />
              </div>
              <div>
                <span className="text-[9px] font-black text-[#C5A059] uppercase tracking-[0.25em] block">
                  Buscar Cliente
                </span>
                <p className="text-[12px] font-medium text-zinc-400 mt-0.5">
                  Pesquise por nome ou WhatsApp
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Fechar busca"
              className="w-8 h-8 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-all flex items-center justify-center cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Search */}
          <div className="px-6 py-4 shrink-0">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
              />
              <input
                type="text"
                id="booking-search"
                placeholder="Digite o nome ou número..."
                aria-label="Buscar cliente por nome ou WhatsApp"
                autoFocus
                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl py-3.5 pl-11 pr-4 text-[14px] text-white outline-none transition-all placeholder:text-zinc-600 focus:border-[#C5A059]/50 focus:bg-white/[0.05]"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Client List */}
          <div className="flex-1 overflow-y-auto px-6 py-2 min-h-0 scrollbar-hide">
            {results.length > 0 ? (
              <div className="space-y-2">
                {results.map((c) => {
                  const initial = (c.name || '?').charAt(0).toUpperCase();
                  const color = AVATAR_STYLE;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        onSelectClient(c);
                        setQuery('');
                      }}
                      aria-label={`Selecionar cliente ${c.name}`}
                      className="w-full text-left py-3.5 px-4 flex items-center gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] cursor-pointer group hover:bg-white/[0.04] hover:border-white/[0.08] transition-all"
                    >
                      <div
                        className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center shrink-0`}
                      >
                        <span className="text-[13px] font-bold">{initial}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-white truncate flex items-center gap-1.5">
                          {c.name}
                          {(c as Client & { _isNoShowBlocked?: boolean })._isNoShowBlocked && (
                            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold uppercase tracking-wider shrink-0 flex items-center gap-1">
                              <svg
                                width="8"
                                height="8"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                              >
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                <line x1="12" y1="9" x2="12" y2="13" />
                                <line x1="12" y1="17" x2="12.01" y2="17" />
                              </svg>
                              Atenção
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-zinc-500">{formatPhone(c.phone)}</p>
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
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default BookingSearchModal;
