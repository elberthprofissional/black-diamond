import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronRight, Loader2 } from 'lucide-react';
import { formatPhone } from '../../../lib/utils';
import type { Client } from '../../../types';

interface BookingSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectClient: (client: Client) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  multipleMatches: Client[];
  isSearchingClient: boolean;
  onSearch: () => void;
}

const BookingSearchModal: React.FC<BookingSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectClient,
  searchQuery,
  setSearchQuery,
  multipleMatches,
  isSearchingClient,
  onSearch
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex flex-col lg:items-center lg:justify-center lg:p-4 bg-[#0A0A0A] lg:bg-black/60">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => { onClose(); setSearchQuery(''); }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm hidden lg:block"
        />
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title-search"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative z-10 w-full h-full lg:h-auto lg:max-w-md lg:bg-[#0A0A0A] lg:border lg:border-white/[0.06] lg:rounded-2xl overflow-hidden max-h-full flex flex-col"
        >
          <div className="px-5 pt-14 pb-4 lg:pt-6 flex items-center justify-between shrink-0">
            <div>
              <h3 id="modal-title-search" className="text-sm font-bold text-white uppercase tracking-wider">Buscar Cliente</h3>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Pesquise por nome ou whatsapp</p>
            </div>
            <button
              onClick={() => { onClose(); setSearchQuery(''); }}
              aria-label="Fechar busca"
              className="w-8 h-8 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-white transition-all flex items-center justify-center cursor-pointer text-sm"
            >
              ✕
            </button>
          </div>

          <div className="px-5 py-2 shrink-0">
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Digite o nome ou número..."
                autoFocus
                aria-label="Campo de pesquisa de cliente por nome ou número de whatsapp"
                className="w-full bg-[#151515] border border-white/5 focus:border-[#C5A059]/30 rounded-xl py-3 pl-10 pr-4 text-xs font-semibold text-white outline-none transition-all placeholder:text-zinc-700 uppercase tracking-wider"
                value={searchQuery}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^\d/.test(val) || val === '') {
                    setSearchQuery(formatPhone(val));
                  } else {
                    setSearchQuery(val);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onSearch();
                  }
                }}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0 scrollbar-hide">
            {multipleMatches.length > 0 ? (
              <div className="divide-y divide-white/5 border-t border-b border-white/5">
                {multipleMatches.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      onSelectClient(c);
                      setSearchQuery('');
                    }}
                    aria-label={`Selecionar cliente ${c.name}`}
                    className="w-full text-left py-3.5 flex items-center justify-between cursor-pointer group"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-zinc-300 group-hover:text-white uppercase tracking-wider transition-colors">{c.name}</p>
                      <p className="text-[10px] text-zinc-500 mt-1 font-mono tracking-tight">{c.phone}</p>
                    </div>
                    <ChevronRight size={14} className="text-zinc-800 group-hover:text-[#C5A059] transition-colors" />
                  </button>
                ))}
              </div>
            ) : searchQuery.trim().length > 0 ? (
              <div className="py-12 text-center">
                <p className="text-[9px] text-zinc-700 uppercase tracking-widest font-bold italic">Nenhum cliente encontrado</p>
              </div>
            ) : (
              <div className="py-12 text-center">
                <p className="text-[9px] text-zinc-700 uppercase tracking-widest font-bold italic">Digite para pesquisar...</p>
              </div>
            )}
          </div>

          <div className="px-5 pb-8 lg:pb-6 pt-2 shrink-0">
            <div className="flex gap-2">
              <button
                onClick={() => { onClose(); setSearchQuery(''); }}
                aria-label="Cancelar busca"
                className="flex-1 h-10 bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.05] text-zinc-400 hover:text-white text-[9px] font-bold uppercase tracking-widest rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={onSearch}
                disabled={!searchQuery.trim() || isSearchingClient}
                aria-label="Executar busca de cliente"
                className="flex-1 h-10 bg-white text-black hover:bg-zinc-200 text-[9px] font-bold uppercase tracking-widest rounded-xl transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isSearchingClient ? <Loader2 size={12} className="animate-spin" /> : 'Buscar'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default BookingSearchModal;
