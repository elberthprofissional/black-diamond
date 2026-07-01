import { Search, ChevronRight } from 'lucide-react';
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
  return (
    <div className="space-y-5 h-full flex flex-col">
      <div className="space-y-1 shrink-0">
        <h2 className="text-lg font-bold text-white uppercase tracking-tight">Cliente</h2>
        <p className="text-xs text-zinc-500">Busque ou cadastre o cliente</p>
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
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">NOME DO CLIENTE</label>
                <input
                  type="text"
                  placeholder="Nome completo"
                  className="w-full bg-white/[0.03] border border-white/[0.06] focus:border-[#C5A059]/60 rounded-xl px-4 py-3.5 text-sm text-white outline-none transition-all placeholder:text-zinc-700"
                  value={newClient.name}
                  onChange={(e) => onSetNewClient({ ...newClient, name: e.target.value.toUpperCase() })}
                />
                {newClient.name.trim().length > 0 && newClient.name.trim().length < 3 && (
                  <p className="text-[9px] text-zinc-600 ml-1">Mínimo 3 caracteres</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">TELEFONE (WHATSAPP)</label>
                <input
                  type="tel"
                  placeholder="(00) 00000-0000"
                  className="w-full bg-white/[0.03] border border-white/[0.06] focus:border-[#C5A059]/60 rounded-xl px-4 py-3.5 text-sm text-white outline-none transition-all placeholder:text-zinc-700"
                  value={newClient.phone}
                  onChange={(e) => onSetNewClient({ ...newClient, phone: formatPhone(e.target.value) })}
                />
                {newClient.phone.trim().length > 0 && newClient.phone.replace(/\D/g, '').length < 8 && (
                  <p className="text-[9px] text-zinc-600 ml-1">Telefone muito curto</p>
                )}
              </div>

              <div className="pt-4 border-t border-white/[0.04]">
                <button
                  type="button"
                  onClick={() => { onSetIsManualEntry(false); onSetSearchQuery(''); }}
                  className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C5A059] transition-colors cursor-pointer"
                >
                  Buscar Cliente Existente →
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">WHATSAPP OU NOME</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600" />
                    <input
                      type="text"
                      placeholder="Digite para buscar..."
                      className="w-full bg-white/[0.03] border border-white/[0.06] focus:border-[#C5A059]/60 rounded-xl py-3 pl-10 pr-3 text-sm text-white outline-none transition-all placeholder:text-zinc-700"
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
                  <button
                    type="button"
                    onClick={onSearch}
                    disabled={!searchQuery.trim() || isSearchingClient}
                    className="px-5 bg-[#C5A059] text-black text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 min-w-[90px] disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
                  >
                    {isSearchingClient ? <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : 'Buscar'}
                  </button>
                </div>
              </div>

              {multipleMatches.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Selecione o cliente:</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-hide">
                    {multipleMatches.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { onSetSelectedClient(c); onSetMultipleMatches([]); }}
                        className="w-full text-left p-3.5 bg-[#111111] border border-white/[0.06] rounded-xl hover:border-[#C5A059]/30 transition-all flex items-center justify-between cursor-pointer"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white uppercase tracking-wide truncate">{c.name}</p>
                          <p className="text-[10px] text-zinc-500 mt-0.5">{c.phone}</p>
                        </div>
                        <ChevronRight size={14} className="text-[#C5A059] shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-white/[0.04]">
                <button
                  type="button"
                  onClick={() => { onSetIsManualEntry(true); onSetSearchQuery(''); }}
                  className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C5A059] transition-colors cursor-pointer"
                >
                  ← Cadastrar Novo Cliente
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
