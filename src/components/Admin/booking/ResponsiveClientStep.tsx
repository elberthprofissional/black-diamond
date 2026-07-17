import { useEffect, useState } from 'react';
import { Search, Loader2, ChevronRight, UserPlus, User, Phone, ArrowLeft } from 'lucide-react';
import { formatPhone } from '../../../lib/utils';
import { useIsDesktop } from '../../../hooks/useIsDesktop';
import type { Client } from '../../../types';

interface ResponsiveClientStepProps {
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
  onNextStep?: () => void;
  onOpenSearch?: () => void;
  isStepValid?: (step: number) => boolean;
}

export default function ResponsiveClientStep({
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
}: ResponsiveClientStepProps) {
  const isDesktop = useIsDesktop();
  const [showFullSearch, setShowFullSearch] = useState(false);

  // Clear search when switching back to manual entry
  useEffect(() => {
    if (isManualEntry) {
      onSetSearchQuery('');
      onSetMultipleMatches([]);
    }
  }, [isManualEntry, onSetSearchQuery, onSetMultipleMatches]);

  // Auto-search with debounce on mobile
  useEffect(() => {
    if (isDesktop) return;
    if (isManualEntry || !searchQuery.trim()) return;
    const timer = setTimeout(() => {
      onSearch();
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, isManualEntry, onSearch, isDesktop]);

  const handleSearchChange = (val: string) => {
    if (/^\d/.test(val) || val === '') {
      onSetSearchQuery(formatPhone(val));
    } else {
      onSetSearchQuery(val);
    }
  };

  // ── Desktop Layout ──
  if (isDesktop) {
    return (
      <div className="space-y-6 h-full flex flex-col">
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

        {selectedClient ? (
          /* Selected Client Card */
          <div className="p-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37] font-bold text-lg">
                {selectedClient.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-[15px] font-semibold text-white">{selectedClient.name}</p>
                  {selectedClient.is_mensalista && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
                      <span className="text-[9px] font-bold text-[#D4AF37] uppercase">
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
              className="text-[12px] text-[#D4AF37] hover:text-white transition-colors cursor-pointer"
            >
              Alterar
            </button>
          </div>
        ) : !isManualEntry ? (
          /* Search Mode */
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
                      className="text-zinc-600 group-hover:text-[#D4AF37] transition-colors"
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
                className="text-[12px] text-[#D4AF37] hover:text-white transition-colors cursor-pointer"
              >
                Nova busca
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[12px] font-medium text-zinc-400 uppercase tracking-wider">
                  Buscar Cliente
                </label>
                <button
                  type="button"
                  onClick={onOpenSearch}
                  className="flex items-center gap-1.5 text-[12px] text-[#D4AF37] hover:text-white transition-colors cursor-pointer"
                >
                  <Search size={12} /> Ver meus clientes
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
                    placeholder="Digite o número ou nome..."
                    className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl py-3.5 pl-11 pr-4 text-[15px] text-white outline-none transition-all placeholder:text-zinc-600 focus:border-[#D4AF37]/50 focus:bg-white/[0.05]"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
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
                  className="px-6 py-3.5 bg-[#D4AF37] text-black text-[12px] font-bold uppercase tracking-wider rounded-xl hover:bg-[#b8962e] transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-[#D4AF37]/20"
                >
                  {isSearchingClient ? <Loader2 size={14} className="animate-spin" /> : 'Buscar'}
                </button>
              </div>
              <button
                type="button"
                onClick={() => onSetIsManualEntry(true)}
                className="flex items-center gap-2 text-[12px] text-zinc-500 hover:text-[#D4AF37] transition-colors cursor-pointer"
              >
                <UserPlus size={14} /> Cadastrar novo cliente
              </button>
            </div>
          )
        ) : (
          /* Manual Entry */
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <label className="text-[12px] font-bold text-[#D4AF37]/70 uppercase tracking-wider">
                Dados do Cliente
              </label>
              <button
                type="button"
                onClick={onOpenSearch}
                className="flex items-center gap-1.5 text-[12px] text-[#D4AF37] hover:text-white transition-colors cursor-pointer"
              >
                <Search size={12} /> Ver meus clientes
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
                  className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl py-3.5 pl-11 pr-4 text-[15px] text-white outline-none transition-all placeholder:text-zinc-600 focus:border-[#D4AF37]/50 focus:bg-white/[0.05]"
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
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
                      <span className="text-[10px] font-bold text-[#D4AF37] uppercase">
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
                    className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl py-3.5 pl-11 pr-4 text-[15px] text-white outline-none transition-all placeholder:text-zinc-600 focus:border-[#D4AF37]/50 focus:bg-white/[0.05]"
                    value={newClient.phone}
                    onChange={(e) =>
                      onSetNewClient({ ...newClient, phone: formatPhone(e.target.value) })
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Continuar — sempre visível quando cliente selecionado */}
        {onNextStep && isStepValid && (
          <button
            type="button"
            onClick={onNextStep}
            disabled={!isStepValid(1)}
            className="w-full py-4 bg-[#D4AF37] text-black text-[13px] font-bold uppercase tracking-wider rounded-xl hover:bg-[#b8962e] transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-[#D4AF37]/20"
          >
            Continuar <ChevronRight size={16} />
          </button>
        )}
      </div>
    );
  }

  // ── Mobile Layout ──
  if (showFullSearch || (!isManualEntry && !selectedClient)) {
    return (
      <div className="fixed inset-0 bg-[#050505] z-[150] flex flex-col">
        <div className="px-5 pt-14 pb-4 flex items-center gap-3 border-b border-white/[0.04]">
          <button
            type="button"
            onClick={() => {
              setShowFullSearch(false);
              onSetIsManualEntry(true);
              onSetSearchQuery('');
            }}
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
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onSearch();
                }
              }}
            />
          </div>
          {searchQuery.trim() && (
            <button
              type="button"
              onClick={() => onSearch()}
              disabled={!searchQuery.trim() || isSearchingClient}
              className="text-[#D4AF37] text-[13px] font-bold cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {isSearchingClient ? '...' : 'Buscar'}
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {multipleMatches.length > 0 ? (
            <div className="px-5 py-3">
              <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-3">
                Selecione o cliente
              </p>
              <div className="space-y-1">
                {multipleMatches.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      onSetSelectedClient(c);
                      onSetMultipleMatches([]);
                      setShowFullSearch(false);
                      onSetIsManualEntry(true);
                    }}
                    className="w-full text-left py-3.5 flex items-center gap-3 cursor-pointer group"
                  >
                    <div className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center shrink-0">
                      <span className="text-[11px] font-bold text-zinc-400">
                        {c.name.charAt(0)}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-white truncate">{c.name}</p>
                      <p className="text-[11px] text-zinc-500 truncate">{c.phone}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 px-5">
              <div className="w-12 h-12 rounded-full bg-white/[0.04] flex items-center justify-center mb-4">
                <Search size={20} className="text-zinc-600" />
              </div>
              <p className="text-[13px] text-zinc-500 text-center">
                {searchQuery.trim()
                  ? 'Nenhum cliente encontrado'
                  : 'Digite um nome ou WhatsApp para buscar'}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 h-full flex flex-col">
      <div className="space-y-1 shrink-0">
        <h2 className="text-lg font-bold text-white uppercase tracking-tight">Cliente</h2>
        <p className="text-xs text-zinc-500">Insira os dados do cliente</p>
      </div>

      {selectedClient ? (
        <div className="p-3.5 sm:p-4 bg-[#111111] border border-[#D4AF37]/30 rounded-2xl flex items-center justify-between gap-3 min-w-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-11 h-11 bg-[#050505] border border-white/[0.08] rounded-xl flex items-center justify-center text-[#D4AF37] text-base font-bold shrink-0">
              {selectedClient.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[8px] font-bold text-[#D4AF37] tracking-widest uppercase block mb-0.5">
                  CADASTRADO
                </span>
                {selectedClient.is_mensalista && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-full">
                    <span className="w-1 h-1 rounded-full bg-[#D4AF37]" />
                    <span className="text-[7px] font-bold text-[#D4AF37] uppercase">
                      Mensalista
                    </span>
                  </span>
                )}
              </div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wide leading-none truncate">
                {selectedClient.name}
              </h3>
              <p className="text-[11px] text-zinc-500 mt-1 truncate">{selectedClient.phone}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onSetSelectedClient(null);
              onSetSearchQuery('');
              onSetIsManualEntry(true);
            }}
            className="text-[9px] font-bold uppercase tracking-widest text-[#D4AF37] cursor-pointer px-3 py-1.5 shrink-0 bg-white/[0.03] border border-[#D4AF37]/20 rounded-xl hover:bg-white/[0.08] hover:border-[#D4AF37]/40 hover:text-white transition-all duration-200 active:scale-95"
          >
            Alterar
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                NOME
              </label>
              <input
                type="text"
                placeholder="Insira um nome"
                className="w-full bg-transparent border border-white/[0.06] focus:border-[#D4AF37]/60 rounded-xl px-4 py-3.5 text-sm text-white outline-none transition-all placeholder:text-zinc-700"
                value={newClient.name}
                onChange={(e) =>
                  onSetNewClient({ ...newClient, name: e.target.value.toUpperCase() })
                }
              />
              {newClient.name.trim().length > 0 && newClient.name.trim().length < 3 && (
                <p className="text-[9px] text-zinc-600 ml-1">Mínimo 3 caracteres</p>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  WHATSAPP
                </label>
                {isMensalista && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-full">
                    <span className="w-1 h-1 rounded-full bg-[#D4AF37]" />
                    <span className="text-[8px] font-bold text-[#D4AF37] uppercase">
                      Mensalista
                    </span>
                  </span>
                )}
              </div>
              <input
                type="tel"
                placeholder="(00) 00000-0000"
                className="w-full bg-transparent border border-white/[0.06] focus:border-[#D4AF37]/60 rounded-xl px-4 py-3.5 text-sm text-white outline-none transition-all placeholder:text-zinc-700"
                value={newClient.phone}
                onChange={(e) =>
                  onSetNewClient({ ...newClient, phone: formatPhone(e.target.value) })
                }
              />
              {newClient.phone.trim().length > 0 &&
                newClient.phone.replace(/\D/g, '').length < 8 && (
                  <p className="text-[9px] text-zinc-600 ml-1">Telefone muito curto</p>
                )}
            </div>

            <div className="flex items-center gap-4 py-2">
              <div className="flex-1 h-px bg-white/[0.06]" />
              <button
                type="button"
                onClick={() => onSetIsManualEntry(false)}
                className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-500 hover:text-[#D4AF37] transition-colors cursor-pointer whitespace-nowrap"
              >
                ou buscar cliente existente
              </button>
              <div className="flex-1 h-px bg-white/[0.06]" />
            </div>

            {onOpenSearch && (
              <button
                type="button"
                onClick={() => setShowFullSearch(true)}
                className="w-full flex items-center justify-center gap-2 py-3 text-[11px] font-bold text-[#D4AF37] uppercase tracking-wider hover:bg-white/[0.02] rounded-xl transition-all cursor-pointer"
              >
                <Search size={14} /> Ver meus clientes
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
