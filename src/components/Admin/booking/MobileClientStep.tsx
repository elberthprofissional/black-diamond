import { useEffect } from 'react';
import { Search, ArrowLeft } from 'lucide-react';
import { formatPhone } from '../../../lib/utils';
import type { Client } from '../../../types';

interface MobileClientStepProps {
  selectedClient: Client | null;
  newClient: { name: string; phone: string };
  searchQuery: string;
  multipleMatches: Client[];
  isManualEntry: boolean;
  isSearchingClient: boolean;
  onSetNewClient: (client: { name: string; phone: string }) => void;
  onSetSearchQuery: (query: string) => void;
  onSetIsManualEntry: (v: boolean) => void;
  onSetMultipleMatches: (matches: Client[]) => void;
  onSetSelectedClient: (client: Client | null) => void;
  onSearch: () => void;
}

export default function MobileClientStep({
  selectedClient,
  newClient,
  searchQuery,
  multipleMatches,
  isManualEntry,
  isSearchingClient,
  onSetNewClient,
  onSetSearchQuery,
  onSetIsManualEntry,
  onSetMultipleMatches,
  onSetSelectedClient,
  onSearch,
}: MobileClientStepProps) {
  // Clear search when switching back to manual entry
  useEffect(() => {
    if (isManualEntry) {
      onSetSearchQuery('');
      onSetMultipleMatches([]);
    }
  }, [isManualEntry, onSetSearchQuery, onSetMultipleMatches]);

  // Auto-search with debounce when in search mode
  useEffect(() => {
    if (isManualEntry || !searchQuery.trim()) return;
    const timer = setTimeout(() => {
      onSearch();
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, isManualEntry, onSearch]);

  return (
    <div className="space-y-5 h-full flex flex-col">
      <div className="space-y-1 shrink-0">
        <h2 className="text-lg font-bold text-white uppercase tracking-tight">Cliente</h2>
        <p className="text-xs text-zinc-500">Insira os dados do cliente</p>
      </div>

      {selectedClient ? (
        <div className="p-3.5 sm:p-4 bg-[#111111] border border-[#C5A059]/30 rounded-2xl flex items-center justify-between gap-3 min-w-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-11 h-11 bg-[#050505] border border-white/[0.08] rounded-xl flex items-center justify-center text-[#C5A059] text-base font-bold shrink-0">
              {selectedClient.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[8px] font-bold text-[#C5A059] tracking-widest uppercase block mb-0.5">CADASTRADO</span>
              <h3 className="text-sm font-bold text-white uppercase tracking-wide leading-none truncate">{selectedClient.name}</h3>
              <p className="text-[11px] text-zinc-500 mt-1 truncate">{selectedClient.phone}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { onSetSelectedClient(null); onSetSearchQuery(''); onSetIsManualEntry(true); }}
            className="text-[9px] font-bold uppercase tracking-widest text-[#C5A059] cursor-pointer px-3 py-1.5 shrink-0 bg-white/[0.03] border border-[#C5A059]/20 rounded-xl hover:bg-white/[0.08] hover:border-[#C5A059]/40 hover:text-white transition-all duration-200 active:scale-95"
          >
            Alterar
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col space-y-4">
          {isManualEntry ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">NOME</label>
                <input
                  type="text"
                  placeholder="Insira um nome"
                  className="w-full bg-transparent border border-white/[0.06] focus:border-[#C5A059]/60 rounded-xl px-4 py-3.5 text-sm text-white outline-none transition-all placeholder:text-zinc-700"
                  value={newClient.name}
                  onChange={(e) => onSetNewClient({ ...newClient, name: e.target.value.toUpperCase() })}
                />
                {newClient.name.trim().length > 0 && newClient.name.trim().length < 3 && (
                  <p className="text-[9px] text-zinc-600 ml-1">Mínimo 3 caracteres</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">WHATSAPP</label>
                <input
                  type="tel"
                  placeholder="(00) 00000-0000"
                  className="w-full bg-transparent border border-white/[0.06] focus:border-[#C5A059]/60 rounded-xl px-4 py-3.5 text-sm text-white outline-none transition-all placeholder:text-zinc-700"
                  value={newClient.phone}
                  onChange={(e) => onSetNewClient({ ...newClient, phone: formatPhone(e.target.value) })}
                />
                {newClient.phone.trim().length > 0 && newClient.phone.replace(/\D/g, '').length < 8 && (
                  <p className="text-[9px] text-zinc-600 ml-1">Telefone muito curto</p>
                )}
              </div>

              <div className="flex items-center gap-4 py-2">
                <div className="flex-1 h-px bg-white/[0.06]" />
                <button
                  type="button"
                  onClick={() => { onSetIsManualEntry(false); onSetSearchQuery(''); }}
                  className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-500 hover:text-[#C5A059] transition-colors cursor-pointer whitespace-nowrap"
                >
                  ou buscar cliente existente
                </button>
                <div className="flex-1 h-px bg-white/[0.06]" />
              </div>
            </div>
          ) : (
            <div className="fixed inset-0 bg-[#050505] z-[150] flex flex-col">
              <div className="px-5 pt-14 pb-4 flex items-center gap-3 border-b border-white/[0.04]">
                <button
                  type="button"
                  onClick={() => { onSetIsManualEntry(true); onSetSearchQuery(''); }}
                  className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <ArrowLeft size={20} />
                </button>
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Buscar por nome ou WhatsApp..."
                    autoFocus
                    className="w-full bg-transparent text-white text-[15px] outline-none placeholder:text-zinc-600"
                    value={searchQuery}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^\d/.test(val) || val === '') {
                        onSetSearchQuery(formatPhone(val));
                      } else {
                        onSetSearchQuery(val);
                      }
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onSearch(); } }}
                  />
                </div>
                {searchQuery.trim() && (
                  <button
                    type="button"
                    onClick={() => onSearch()}
                    disabled={!searchQuery.trim() || isSearchingClient}
                    className="text-[#C5A059] text-[13px] font-bold cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {isSearchingClient ? '...' : 'Buscar'}
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto">
                {multipleMatches.length > 0 ? (
                  <div className="px-5 py-3">
                    <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-3">Selecione o cliente</p>
                    <div className="space-y-1">
                      {multipleMatches.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => { onSetSelectedClient(c); onSetMultipleMatches([]); onSetIsManualEntry(true); }}
                          className="w-full text-left py-3.5 flex items-center gap-3 cursor-pointer group"
                        >
                          <div className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center shrink-0">
                            <span className="text-[11px] font-bold text-zinc-400">{c.name.charAt(0)}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-semibold text-white truncate">{c.name}</p>
                            <p className="text-[11px] text-zinc-500 truncate">{c.phone}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : searchQuery.trim() && !isSearchingClient ? (
                  <div className="flex flex-col items-center justify-center py-20 px-5">
                    <div className="w-12 h-12 rounded-full bg-white/[0.04] flex items-center justify-center mb-4">
                      <Search size={20} className="text-zinc-600" />
                    </div>
                    <p className="text-[13px] text-zinc-500 text-center">Nenhum cliente encontrado</p>
                    <p className="text-[11px] text-zinc-600 text-center mt-1">Cadastre um novo cliente ou tente outro nome</p>
                  </div>
                ) : !searchQuery.trim() ? (
                  <div className="flex flex-col items-center justify-center py-20 px-5">
                    <div className="w-12 h-12 rounded-full bg-white/[0.04] flex items-center justify-center mb-4">
                      <Search size={20} className="text-zinc-600" />
                    </div>
                    <p className="text-[13px] text-zinc-500 text-center">Digite um nome ou WhatsApp para buscar</p>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
