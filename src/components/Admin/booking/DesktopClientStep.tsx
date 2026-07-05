import { Search, Loader2, ChevronRight, UserPlus, User, Phone } from 'lucide-react';
import { formatPhone } from '../../../lib/utils';
import type { Client } from '../../../types';

interface DesktopClientStepProps {
  selectedClient: Client | null;
  newClient: { name: string; phone: string };
  searchQuery: string;
  multipleMatches: Client[];
  isManualEntry: boolean;
  isSearchingClient: boolean;
  isMensalista: boolean;
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
  isMensalista,
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
    <div className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-white">Cliente</h2>
        <p className="text-[13px] text-zinc-500">
          {selectedClient
            ? 'Cliente selecionado com sucesso.'
            : isManualEntry
              ? 'Preencha os dados ou busque um cliente cadastrado.'
              : 'Busque pelo WhatsApp ou nome do cliente.'}
        </p>
      </div>

      {/* Selected Client */}
      {selectedClient ? (
        <div className="p-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#C5A059]/10 flex items-center justify-center text-[#C5A059] font-bold text-lg">
              {selectedClient.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-[15px] font-semibold text-white">{selectedClient.name}</p>
                {selectedClient.is_mensalista && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#C5A059]/10 border border-[#C5A059]/20 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C5A059]" />
                    <span className="text-[9px] font-bold text-[#C5A059] uppercase">
                      Mensalista
                    </span>
                  </span>
                )}
              </div>
              <p className="text-[13px] text-zinc-500">{selectedClient.phone}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onSetSelectedClient(null);
              onSetSearchQuery('');
              onSetIsManualEntry(true);
            }}
            className="text-[12px] text-[#C5A059] hover:text-white transition-colors cursor-pointer"
          >
            Alterar
          </button>
        </div>
      ) : !isManualEntry ? (
        /* Multiple Matches */
        multipleMatches.length > 0 ? (
          <div className="space-y-4">
            <p className="text-[12px] text-zinc-500">Múltiplos clientes encontrados:</p>
            <div className="space-y-1">
              {multipleMatches.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onSetSelectedClient(c);
                    onSetMultipleMatches([]);
                  }}
                  className="w-full flex items-center justify-between py-3 px-1 hover:bg-white/[0.02] transition-all cursor-pointer group"
                >
                  <div>
                    <p className="text-[14px] font-medium text-zinc-300 group-hover:text-white">
                      {c.name}
                    </p>
                    <p className="text-[12px] text-zinc-600">{c.phone}</p>
                  </div>
                  <ChevronRight
                    size={14}
                    className="text-zinc-600 group-hover:text-[#C5A059] transition-colors"
                  />
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                onSetMultipleMatches([]);
                onSetSearchQuery('');
              }}
              className="text-[12px] text-[#C5A059] hover:text-white transition-colors cursor-pointer"
            >
              Nova busca
            </button>
          </div>
        ) : (
          /* Search Client */
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[12px] font-medium text-zinc-400 uppercase tracking-wider">
                  Buscar Cliente
                </label>
                <button
                  type="button"
                  onClick={onOpenSearch}
                  className="flex items-center gap-1.5 text-[12px] text-[#C5A059] hover:text-white transition-colors cursor-pointer"
                >
                  <Search size={12} />
                  Ver meus clientes
                </button>
              </div>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
                  />
                  <input
                    type="text"
                    placeholder="Digite o numero ou nome..."
                    className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl py-3.5 pl-11 pr-4 text-[15px] text-white outline-none transition-all placeholder:text-zinc-600 focus:border-[#C5A059]/50 focus:bg-white/[0.05]"
                    value={searchQuery}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^\d/.test(val) || val === '') {
                        onSetSearchQuery(formatPhone(val));
                      } else {
                        onSetSearchQuery(val);
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
                <button
                  type="button"
                  onClick={onSearch}
                  disabled={!searchQuery.trim() || isSearchingClient}
                  className="px-6 py-3.5 bg-[#C5A059] text-black text-[12px] font-bold uppercase tracking-wider rounded-xl hover:bg-[#A68233] transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-[#C5A059]/20"
                >
                  {isSearchingClient ? <Loader2 size={14} className="animate-spin" /> : 'Buscar'}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onSetIsManualEntry(true)}
              className="flex items-center gap-2 text-[12px] text-zinc-500 hover:text-[#C5A059] transition-colors cursor-pointer"
            >
              <UserPlus size={14} />
              Cadastrar novo cliente
            </button>
          </div>
        )
      ) : (
        /* New Client Form */
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[12px] font-bold text-[#C5A059]/70 uppercase tracking-wider">
                Dados do Cliente
              </label>
              <button
                type="button"
                onClick={onOpenSearch}
                className="flex items-center gap-1.5 text-[12px] text-[#C5A059] hover:text-white transition-colors cursor-pointer"
              >
                <Search size={12} />
                Ver meus clientes
              </button>
            </div>
            <div className="space-y-4">
              <div className="relative">
                <User
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
                />
                <input
                  type="text"
                  placeholder="Nome completo"
                  className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl py-3.5 pl-11 pr-4 text-[15px] text-white outline-none transition-all placeholder:text-zinc-600 focus:border-[#C5A059]/50 focus:bg-white/[0.05]"
                  value={newClient.name}
                  onChange={(e) =>
                    onSetNewClient({ ...newClient, name: e.target.value.toUpperCase() })
                  }
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[12px] font-medium text-zinc-400 uppercase tracking-wider">
                    WhatsApp
                  </label>
                  {isMensalista && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#C5A059]/10 border border-[#C5A059]/20 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C5A059]" />
                      <span className="text-[10px] font-bold text-[#C5A059] uppercase">
                        Mensalista
                      </span>
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Phone
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
                  />
                  <input
                    type="tel"
                    placeholder="(00) 00000-0000"
                    className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl py-3.5 pl-11 pr-4 text-[15px] text-white outline-none transition-all placeholder:text-zinc-600 focus:border-[#C5A059]/50 focus:bg-white/[0.05]"
                    value={newClient.phone}
                    onChange={(e) =>
                      onSetNewClient({ ...newClient, phone: formatPhone(e.target.value) })
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onNextStep}
            disabled={!isStepValid(1)}
            className="w-full py-4 bg-[#C5A059] text-black text-[13px] font-bold uppercase tracking-wider rounded-xl hover:bg-[#A68233] transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-[#C5A059]/20 hover:shadow-xl hover:shadow-[#C5A059]/30"
          >
            Continuar
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
