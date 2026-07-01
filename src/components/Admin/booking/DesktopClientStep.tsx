import { Search, Loader2, ChevronRight, RefreshCw } from 'lucide-react';
import { formatPhone } from '../../../lib/utils';
import type { Client } from '../../../types';

interface DesktopClientStepProps {
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
  onNextStep: () => void;
  onOpenSearch: () => void;
  isStepValid: (step: number) => boolean;
}

export default function DesktopClientStep({
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
  onNextStep,
  onOpenSearch,
  isStepValid,
}: DesktopClientStepProps) {
  return (
    <div className="space-y-6 lg:space-y-8 h-full flex flex-col justify-between overflow-visible pr-1 scrollbar-hide">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold uppercase tracking-tight">CLIENTE</h2>
        <p className="text-zinc-500 text-sm">
          {selectedClient
            ? 'Cliente selecionado com sucesso.'
            : isManualEntry
              ? 'Insira os dados do cliente abaixo.'
              : 'Busque pelo WhatsApp ou nome cadastrado.'}
        </p>
      </div>

      {selectedClient ? (
        <div className="p-5 sm:p-6 bg-[#111111] border border-white/[0.06] flex items-center justify-between gap-4 min-w-0 transition-all group hover:border-[#C5A059]/30 rounded-xl">
          <div className="flex items-center gap-4 sm:gap-5 min-w-0 flex-1">
            <div className="w-12 h-12 bg-[#0A0A0A] border border-white/[0.08] flex items-center justify-center text-[#C5A059] text-lg font-bold transition-all duration-300 shrink-0">
              {selectedClient.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[8px] font-bold text-[#C5A059] tracking-[0.25em] uppercase block mb-1">CLIENTE CADASTRADO</span>
              <h3 className="text-base sm:text-lg font-bold text-white uppercase tracking-wide leading-none truncate">{selectedClient.name}</h3>
              <p className="text-xs text-zinc-500 mt-2 truncate">{selectedClient.phone}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { onSetSelectedClient(null); onSetSearchQuery(''); onSetIsManualEntry(true); }}
            className="text-[10px] font-bold uppercase tracking-widest text-[#C5A059] hover:text-white transition-all cursor-pointer px-3 py-1.5 shrink-0 bg-white/[0.03] border border-[#C5A059]/20 rounded-xl hover:bg-white/[0.08] hover:border-[#C5A059]/40 active:scale-95"
          >
            Alterar
          </button>
        </div>
      ) : !isManualEntry ? (
        multipleMatches.length > 0 ? (
          <div className="space-y-4">
            <div className="p-4 bg-[#111111] border border-white/[0.06] text-xs text-zinc-400 uppercase tracking-wider">
              Múltiplos clientes encontrados. Selecione o correto abaixo:
            </div>
            <div className="divide-y divide-white/[0.04] border border-white/[0.06] max-h-60 overflow-y-auto scrollbar-hide bg-[#111111]">
              {multipleMatches.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { onSetSelectedClient(c); onSetMultipleMatches([]); }}
                  className="w-full text-left p-4 hover:bg-white/[0.02] transition-all flex items-center justify-between cursor-pointer group"
                >
                  <div>
                    <p className="text-base font-bold text-zinc-300 group-hover:text-white uppercase tracking-wide leading-none">{c.name}</p>
                    <p className="text-xs text-zinc-600 group-hover:text-zinc-500 mt-1.5 transition-colors">{c.phone}</p>
                  </div>
                  <ChevronRight size={14} className="text-[#C5A059] group-hover:translate-x-0.5 transition-all" />
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => { onSetMultipleMatches([]); onSetSearchQuery(''); }}
              className="text-[10px] font-bold uppercase tracking-widest text-[#C5A059] hover:text-white transition-colors cursor-pointer"
            >
              Fazer nova busca
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.3em] ml-0.5">TELEFONE OU NOME DO CLIENTE</label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700" />
                  <input
                    type="text"
                    placeholder="Digite o número (ou nome)..."
                    className="w-full bg-transparent border-b-2 border-white/[0.06] focus:border-[#C5A059] py-4 pl-12 pr-4 text-base text-white outline-none transition-all placeholder:text-zinc-700 font-medium"
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
                  className="px-8 bg-[#111111] border border-white/[0.06] hover:border-[#C5A059]/30 hover:bg-[#C5A059]/5 text-[#C5A059] text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 min-w-[120px] disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {isSearchingClient ? <Loader2 size={12} className="animate-spin text-[#C5A059]" /> : 'Buscar'}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={onOpenSearch}
                className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#C5A059] hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Search size={11} />
                <span>Buscar Cliente Cadastrado</span>
              </button>
            </div>
          </div>
        )
      ) : (
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.3em] ml-0.5">NOME DO CLIENTE</label>
              <input
                type="text"
                placeholder="Digite o nome completo"
                className="w-full bg-transparent border-b-2 border-white/[0.06] focus:border-[#C5A059] px-0 py-3.5 text-base text-white outline-none transition-all placeholder:text-zinc-700 font-medium"
                value={newClient.name}
                onChange={(e) => onSetNewClient({ ...newClient, name: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.3em] ml-0.5">TELEFONE (WHATSAPP)</label>
              <input
                type="tel"
                placeholder="(00) 00000-0000"
                className="w-full bg-transparent border-b-2 border-white/[0.06] focus:border-[#C5A059] px-0 py-3.5 text-base text-white outline-none transition-all placeholder:text-zinc-700 font-medium"
                value={newClient.phone}
                onChange={(e) => onSetNewClient({ ...newClient, phone: formatPhone(e.target.value) })}
              />
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div>
              <button
                type="button"
                onClick={onOpenSearch}
                className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#C5A059] hover:text-white transition-colors flex items-center gap-2 cursor-pointer group"
              >
                <Search size={11} className="text-[#C5A059] group-hover:text-white transition-colors" />
                <span>Buscar Cliente Cadastrado</span>
              </button>
            </div>

            <div className="pt-6 border-t border-white/[0.04]">
              <button
                type="button"
                onClick={onNextStep}
                disabled={!isStepValid(1)}
                className="px-10 py-4 bg-white text-black hover:bg-[#C5A059] hover:text-black text-[10px] font-bold uppercase tracking-[0.3em] transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Avançar
              </button>
            </div>
          </div>
        </div>
      )}

      {((!selectedClient && isManualEntry) || selectedClient) && (
        <div className="pt-4 border-t border-white/[0.04]">
          <div className="flex items-center gap-2 text-zinc-500">
            <RefreshCw size={12} className="shrink-0 text-zinc-550" />
            <p className="text-[9px] font-bold leading-normal">
              {selectedClient
                ? 'Cliente selecionado.'
                : 'Preencha o nome e o telefone para cadastrar o cliente na hora da reserva.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
