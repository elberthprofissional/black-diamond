import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, ChevronRight, X } from 'lucide-react';
import { useModalA11y } from '../../../hooks/useModalA11y';
import type { Client } from '../../../types';

interface BookingSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectClient: (client: Client) => void;
  clients: Client[];
}

const BookingSearchModal: React.FC<BookingSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectClient,
  clients,
}) => {
  const [query, setQuery] = useState('');
  const { dialogRef } = useModalA11y(isOpen, onClose);

  const filteredClients = useMemo(() => {
    return clients.filter(c =>
      c && c.name &&
      c.name !== 'CLIENTE EXCLUIDO' &&
      c.name !== 'BLOQUEADO' &&
      !c.phone.startsWith('DELETED_') &&
      c.phone !== '00000000000'
    );
  }, [clients]);

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return filteredClients;
    const isPhone = /^\d/.test(term);
    if (isPhone) {
      const digits = term.replace(/\D/g, '');
      return filteredClients.filter(c => c.phone.replace(/\D/g, '').includes(digits));
    }
    return filteredClients.filter(c => c.name.toLowerCase().includes(term));
  }, [query, filteredClients]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col lg:items-center lg:justify-center lg:p-4 bg-[#0A0A0A] lg:bg-black/60">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm hidden lg:block"
      />
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Buscar cliente"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative z-10 w-full h-full lg:h-auto lg:max-w-md lg:bg-[#0A0A0A] lg:border lg:border-white/[0.06] lg:rounded-2xl overflow-hidden max-h-full flex flex-col"
      >
        <div className="px-5 pt-14 pb-4 lg:pt-6 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Buscar Cliente</h3>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Pesquise por nome ou whatsapp</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar busca"
            className="w-8 h-8 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-white transition-all flex items-center justify-center cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-2 shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              id="booking-search"
              placeholder="Digite o nome ou número..."
              aria-label="Buscar cliente por nome ou WhatsApp"
              autoFocus
              className="w-full bg-[#151515] border border-white/5 focus:border-[#C5A059]/30 rounded-xl py-3 pl-10 pr-4 text-xs font-semibold text-white outline-none transition-all placeholder:text-zinc-700 uppercase tracking-wider"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0 scrollbar-hide">
          {results.length > 0 ? (
            <div className="divide-y divide-white/5 border-t border-b border-white/5">
              {results.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onSelectClient(c);
                    setQuery('');
                  }}
                  aria-label={`Selecionar cliente ${c.name}`}
                  className="w-full text-left py-3.5 flex items-center justify-between cursor-pointer group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-zinc-300 group-hover:text-white uppercase tracking-wider transition-colors truncate">{c.name}</p>
                  </div>
                  <ChevronRight size={14} className="text-zinc-800 group-hover:text-[#C5A059] transition-colors" />
                </button>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold italic">Nenhum cliente encontrado</p>
            </div>
          )}
        </div>

        <div className="px-5 pb-8 lg:pb-6 pt-2 shrink-0">
          <button
            onClick={onClose}
            className="w-full h-10 bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.05] text-zinc-400 hover:text-white text-[9px] font-bold uppercase tracking-widest rounded-xl transition-all cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default BookingSearchModal;
