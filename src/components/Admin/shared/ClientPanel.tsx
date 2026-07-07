import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Pencil, Trash2, Plus, Crown, ArrowLeft, Check } from 'lucide-react';
import { formatPhone } from '../../../lib/utils';
import type { ClientWithStats, BookingWithClient, MensalistaPlan } from '../../../types';

interface ClientPanelProps {
  client: ClientWithStats;
  panelBookings: BookingWithClient[];
  panelTotal: number;
  panelLast: Date | null;
  notesText: string;
  isEditingNotes: boolean;
  savingNotes: boolean;
  plans: MensalistaPlan[];
  planName?: string;
  expiresAt?: string;
  onNotesChange: (value: string) => void;
  onToggleEditNotes: () => void;
  onSaveNotes: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReminder: () => void;
  onClose: () => void;
  onToggleMensalista: (planId?: string) => void;
  onRenewMensalidade?: () => void;
}

const ClientPanel: React.FC<ClientPanelProps> = ({
  client,
  panelBookings,
  panelTotal,
  panelLast,
  notesText,
  isEditingNotes,
  savingNotes,
  plans,
  planName,
  onNotesChange,
  onToggleEditNotes,
  onSaveNotes,
  onEdit,
  onDelete,
  onReminder,
  onClose,
  onToggleMensalista,
  onRenewMensalidade,
  expiresAt,
}) => {
  const navigate = useNavigate();
  const [showPlanSelector, setShowPlanSelector] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');

  const handleMensalistaClick = () => {
    if (client.is_mensalista) {
      onToggleMensalista();
    } else {
      setShowPlanSelector(true);
    }
  };

  const confirmToggleMensalista = () => {
    onToggleMensalista(selectedPlanId || undefined);
    setShowPlanSelector(false);
    setSelectedPlanId('');
  };

  return (
    <div className="fixed inset-0 z-[200] flex justify-end flex-col sm:flex-row">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="relative w-full sm:w-[440px] h-[100dvh] sm:h-full mt-auto sm:mt-0 bg-[#0E0E0E] border-t sm:border-t-0 sm:border-l border-[#C5A059]/20 shadow-2xl overflow-y-auto scrollbar-hide flex flex-col text-left"
      >
        <div className="sticky top-0 bg-[#0E0E0E]/95 backdrop-blur-md z-10 px-6 py-4 border-b border-white/[0.04] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              aria-label="Fechar painel"
              className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
            <span className="text-[9px] font-black text-[#C5A059] uppercase tracking-[0.25em]">
              Dados do Cliente
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onEdit}
              aria-label="Editar cliente"
              className="text-zinc-400 hover:text-white transition-all cursor-pointer"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={onDelete}
              aria-label="Excluir cliente"
              className="text-zinc-400 hover:text-red-400 transition-all cursor-pointer"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        <div className="px-6 py-6 space-y-6 flex-1">
          <div className="flex items-center gap-4 bg-white/[0.01] border border-white/[0.03] p-4 rounded-xl">
            <div className="w-12 h-12 bg-[#111111] border border-white/[0.08] rounded-xl flex items-center justify-center text-lg font-bold text-white uppercase shrink-0">
              {client.name?.charAt(0) || '?'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white uppercase tracking-tight truncate">
                  {client.name}
                </h2>
                {client.is_mensalista && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#C5A059]/10 border border-[#C5A059]/20 rounded-full shrink-0">
                    <Crown size={10} className="text-[#C5A059]" />
                    <span className="text-[8px] font-bold text-[#C5A059] uppercase">
                      {planName || 'Mensalista'}
                    </span>
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">{formatPhone(client.phone)}</p>
              <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest mt-1">
                Membro desde{' '}
                {new Date(client.created_at).toLocaleDateString('pt-BR', {
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>

          <div className="bg-[#121212] border border-white/[0.03] rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center px-2 py-1">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                Total de Visitas
              </span>
              <span className="text-sm font-black text-[#C5A059]">
                {panelBookings.length} {panelBookings.length === 1 ? 'visita' : 'visitas'}
              </span>
            </div>
            <div className="flex justify-between items-center px-2">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                Valor Gasto
              </span>
              <span className="text-sm font-black text-white">R$ {panelTotal.toFixed(0)}</span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-white/[0.04] px-2">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                Última Visita
              </span>
              <span className="text-xs font-bold text-white uppercase">
                {panelLast ? panelLast.toLocaleDateString('pt-BR') : 'Nunca'}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <a
              href={`https://wa.me/${(client.phone ?? '').replace(/\D/g, '').startsWith('55') ? '' : '55'}${(client.phone ?? '').replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 h-10 border border-white/[0.06] bg-white/[0.02] text-zinc-300 font-bold text-[9px] uppercase tracking-wider rounded-xl hover:bg-white/[0.04] transition-all cursor-pointer flex items-center justify-center"
            >
              WhatsApp
            </a>
            <button
              onClick={onReminder}
              className="flex-1 h-10 border border-white/[0.06] bg-white/[0.02] text-zinc-300 font-bold text-[9px] uppercase tracking-wider rounded-xl hover:bg-white/[0.04] transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              Enviar Lembrete
            </button>
            <button
              onClick={() =>
                navigate(
                  `/admin/agendar?client=${encodeURIComponent(client.name)}&phone=${encodeURIComponent(client.phone)}`
                )
              }
              className="flex-1 h-10 bg-[#C5A059] hover:bg-[#A68233] text-black font-bold text-[9px] uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Plus size={12} strokeWidth={3} />
              Agendar
            </button>
          </div>

          <button
            onClick={handleMensalistaClick}
            className={`w-full h-10 border rounded-xl font-bold text-[9px] uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              client.is_mensalista
                ? 'border-[#C5A059]/30 bg-[#C5A059]/10 text-[#C5A059] hover:bg-[#C5A059]/20'
                : 'border-white/[0.06] bg-white/[0.02] text-zinc-400 hover:bg-white/[0.04] hover:text-white'
            }`}
          >
            <Crown size={12} />
            {client.is_mensalista ? 'Remover Mensalista' : 'Tornar Mensalista'}
          </button>

          {client.is_mensalista && expiresAt && (
            <div className="flex items-center justify-between px-4 py-3 bg-[#121212] border border-white/[0.04] rounded-xl">
              <div>
                <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                  Válido até
                </p>
                <p
                  className={`text-[13px] font-bold mt-0.5 ${new Date(expiresAt) < new Date() ? 'text-red-400' : 'text-[#C5A059]'}`}
                >
                  {new Date(expiresAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRenewMensalidade?.();
                }}
                className={`px-4 py-2 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  new Date(expiresAt) < new Date()
                    ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                    : 'bg-[#C5A059]/10 text-[#C5A059] hover:bg-[#C5A059]/20'
                }`}
              >
                Renovar
              </button>
            </div>
          )}

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.04]">
              <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-[#C5A059]">
                Anotações
              </h3>
              <button
                onClick={onToggleEditNotes}
                className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 hover:text-white transition-colors cursor-pointer"
              >
                {isEditingNotes ? 'Cancelar' : notesText.trim() ? 'Editar' : '+ Adicionar'}
              </button>
            </div>

            {notesText.trim() ? (
              <div className="space-y-1.5 pl-3 border-l border-[#C5A059]/20 my-2 text-left">
                {notesText.split('\n').map((line, idx) => (
                  <p key={idx} className="text-xs text-zinc-300 leading-relaxed">
                    {line}
                  </p>
                ))}
              </div>
            ) : !isEditingNotes ? (
              <p className="text-[10px] text-zinc-600 italic">Nenhuma anotação registrada.</p>
            ) : null}

            <AnimatePresence>
              {isEditingNotes && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2 overflow-hidden"
                >
                  <textarea
                    value={notesText}
                    onChange={(e) => onNotesChange(e.target.value)}
                    placeholder="Ex: Prefere degradê baixo..."
                    className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-xs text-white placeholder:text-zinc-700 outline-none focus:border-[#C5A059]/30 resize-none h-20"
                    autoFocus
                  />
                  <button
                    onClick={async () => {
                      await onSaveNotes();
                    }}
                    disabled={savingNotes}
                    className="w-full py-2.5 bg-[#C5A059] text-black text-[10px] font-bold uppercase tracking-wider rounded-xl cursor-pointer active:scale-95 transition-all"
                  >
                    {savingNotes ? '...' : 'Salvar'}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* Mobile Full-Screen Notes Editor */}
      <AnimatePresence>
        {isEditingNotes && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-0 z-[300] bg-[#0A0A0A] lg:hidden flex flex-col"
          >
            <div className="flex items-center justify-between px-4 h-14 border-b border-white/[0.06]">
              <button
                onClick={onToggleEditNotes}
                className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
                aria-label="Cancelar"
              >
                <ArrowLeft size={20} />
              </button>
              <span className="text-[15px] font-bold text-white">Anotações</span>
              <button
                onClick={async () => {
                  await onSaveNotes();
                }}
                disabled={savingNotes}
                className="text-[#C5A059] font-bold text-[15px] transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Salvar"
              >
                {savingNotes ? '...' : <Check size={20} />}
              </button>
            </div>
            <div className="flex-1 p-4">
              <textarea
                value={notesText}
                onChange={(e) => onNotesChange(e.target.value)}
                placeholder="Ex: Prefere degradê baixo..."
                className="w-full h-full bg-transparent text-white text-[15px] placeholder:text-zinc-600 outline-none resize-none leading-relaxed"
                autoFocus
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Plan Selector Modal */}
      <AnimatePresence>
        {showPlanSelector && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[400] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
            onClick={() => {
              setShowPlanSelector(false);
              setSelectedPlanId('');
            }}
          >
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 400 }}
              className="w-full sm:max-w-sm bg-[#141414] sm:rounded-xl rounded-t-2xl overflow-hidden border border-white/[0.06]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 pt-5 pb-3">
                <p className="text-[14px] font-semibold text-white">Selecionar plano</p>
                <p className="text-[12px] text-zinc-500 mt-0.5">
                  Escolha o plano para este cliente.
                </p>
              </div>

              <div className="px-3 pb-3 space-y-1">
                {plans
                  .filter((p) => p.is_active)
                  .map((plan) => (
                    <button
                      key={plan.id}
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer ${
                        selectedPlanId === plan.id ? 'bg-[#C5A059]/[0.08]' : 'hover:bg-white/[0.04]'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full border-[1.5px] flex items-center justify-center transition-all shrink-0 ${
                          selectedPlanId === plan.id
                            ? 'border-[#C5A059] bg-[#C5A059]'
                            : 'border-white/20'
                        }`}
                      >
                        {selectedPlanId === plan.id && (
                          <Check size={9} className="text-white stroke-[3]" />
                        )}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <span
                          className={`text-[13px] font-medium ${selectedPlanId === plan.id ? 'text-[#C5A059]' : 'text-zinc-200'}`}
                        >
                          {plan.name}
                        </span>
                      </div>
                      <span className="text-[11px] text-zinc-500 tabular-nums">
                        R${' '}
                        {Number(plan.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        /mês
                      </span>
                    </button>
                  ))}
                {plans.filter((p) => p.is_active).length === 0 && (
                  <p className="text-[12px] text-zinc-600 text-center py-6">Nenhum plano ativo.</p>
                )}
              </div>

              <div className="flex border-t border-white/[0.06]">
                <button
                  onClick={() => {
                    setShowPlanSelector(false);
                    setSelectedPlanId('');
                  }}
                  className="flex-1 py-3 text-[12px] font-medium text-zinc-500 hover:text-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <div className="w-px bg-white/[0.06]" />
                <button
                  onClick={confirmToggleMensalista}
                  disabled={!selectedPlanId}
                  className="flex-1 py-3 text-[12px] font-semibold text-[#C5A059] hover:text-[#A68233] transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Confirmar
                </button>
              </div>

              <div className="sm:hidden flex justify-center pb-2 pt-1">
                <div className="w-8 h-1 rounded-full bg-white/10" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ClientPanel;
