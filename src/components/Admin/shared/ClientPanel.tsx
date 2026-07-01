import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Pencil, Trash2, Plus, Crown } from 'lucide-react';
import { formatPhone } from '../../../lib/utils';
import type { ClientWithStats, BookingWithClient } from '../../../types';

interface ClientPanelProps {
  client: ClientWithStats;
  panelBookings: BookingWithClient[];
  panelTotal: number;
  panelLast: Date | null;
  notesText: string;
  isEditingNotes: boolean;
  savingNotes: boolean;
  onNotesChange: (value: string) => void;
  onToggleEditNotes: () => void;
  onSaveNotes: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReminder: () => void;
  onClose: () => void;
  onToggleMensalista: () => void;
}

const ClientPanel: React.FC<ClientPanelProps> = ({
  client,
  panelBookings,
  panelTotal,
  panelLast,
  notesText,
  isEditingNotes,
  savingNotes,
  onNotesChange,
  onToggleEditNotes,
  onSaveNotes,
  onEdit,
  onDelete,
  onReminder,
  onClose,
  onToggleMensalista,
}) => {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-[200] flex justify-end flex-col sm:flex-row">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="relative w-full sm:w-[440px] h-[100dvh] sm:h-full mt-auto sm:mt-0 bg-[#0E0E0E] border-t sm:border-t-0 sm:border-l border-[#C5A059]/20 shadow-2xl overflow-y-auto scrollbar-hide flex flex-col text-left"
      >
        <div className="sticky top-0 bg-[#0E0E0E]/95 backdrop-blur-md z-10 px-6 py-4 border-b border-white/[0.04] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onClose} aria-label="Fechar painel" className="text-zinc-500 hover:text-white transition-colors cursor-pointer">
              <X size={16} />
            </button>
            <span className="text-[9px] font-black text-[#C5A059] uppercase tracking-[0.25em]">Dados do Cliente</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onEdit} aria-label="Editar cliente" className="text-zinc-400 hover:text-white transition-all cursor-pointer">
              <Pencil size={14} />
            </button>
            <button onClick={onDelete} aria-label="Excluir cliente" className="text-zinc-400 hover:text-red-400 transition-all cursor-pointer">
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
                <h2 className="text-base font-black text-white uppercase tracking-tight truncate">{client.name}</h2>
                {client.is_mensalista && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#C5A059]/10 border border-[#C5A059]/20 rounded-full shrink-0">
                    <Crown size={10} className="text-[#C5A059]" />
                    <span className="text-[8px] font-bold text-[#C5A059] uppercase">Mensalista</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">{formatPhone(client.phone)}</p>
              <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest mt-1">Membro desde {new Date(client.created_at).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}</p>
            </div>
          </div>

          <div className="bg-[#121212] border border-white/[0.03] rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center px-2 py-1">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Total de Visitas</span>
              <span className="text-sm font-black text-[#C5A059]">
                {panelBookings.length} {panelBookings.length === 1 ? 'visita' : 'visitas'}
              </span>
            </div>
            <div className="flex justify-between items-center px-2">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Valor Faturado</span>
              <span className="text-sm font-black text-white">R$ {panelTotal.toFixed(0)}</span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-white/[0.04] px-2">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Última Visita</span>
              <span className="text-xs font-bold text-white uppercase">
                {panelLast ? panelLast.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Nunca'}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <a
              href={`https://wa.me/${client.phone?.replace(/\D/g, '').startsWith('55') ? '' : '55'}${client.phone?.replace(/\D/g, '')}`}
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
              onClick={() => navigate(`/admin/agendar?client=${encodeURIComponent(client.name)}&phone=${encodeURIComponent(client.phone)}`)}
              className="flex-1 h-10 bg-[#C5A059] hover:bg-[#A68233] text-black font-bold text-[9px] uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Plus size={12} strokeWidth={3} />
              Agendar
            </button>
          </div>

          <button
            onClick={onToggleMensalista}
            className={`w-full h-10 border rounded-xl font-bold text-[9px] uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              client.is_mensalista
                ? 'border-[#C5A059]/30 bg-[#C5A059]/10 text-[#C5A059] hover:bg-[#C5A059]/20'
                : 'border-white/[0.06] bg-white/[0.02] text-zinc-400 hover:bg-white/[0.04] hover:text-white'
            }`}
          >
            <Crown size={12} />
            {client.is_mensalista ? 'Remover Mensalista' : 'Tornar Mensalista'}
          </button>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.04]">
              <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-[#C5A059]">Anotações</h3>
              <button onClick={onToggleEditNotes} className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 hover:text-white transition-colors cursor-pointer">
                {isEditingNotes ? 'Cancelar' : notesText.trim() ? 'Editar' : '+ Adicionar'}
              </button>
            </div>

            {notesText.trim() ? (
              <div className="space-y-1.5 pl-3 border-l border-[#C5A059]/20 my-2 text-left">
                {notesText.split('\n').map((line, idx) => (
                  <p key={idx} className="text-xs text-zinc-300 leading-relaxed">{line}</p>
                ))}
              </div>
            ) : !isEditingNotes ? (
              <p className="text-[10px] text-zinc-600 italic">Nenhuma anotação registrada.</p>
            ) : null}

            <AnimatePresence>
              {isEditingNotes && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-2 overflow-hidden">
                  <textarea value={notesText} onChange={(e) => onNotesChange(e.target.value)} placeholder="Ex: Prefere degradê baixo..." className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-xs text-white placeholder:text-zinc-700 outline-none focus:border-[#C5A059]/30 resize-none h-20" autoFocus />
                  <button onClick={async () => { await onSaveNotes(); }} disabled={savingNotes} className="w-full py-2.5 bg-[#C5A059] text-black text-[10px] font-bold uppercase tracking-wider rounded-xl cursor-pointer active:scale-95 transition-all">
                    {savingNotes ? '...' : 'Salvar'}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ClientPanel;
