import { useState, type FC } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown, User, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getErrorMessage } from '../../../lib/utils';
import { useBarbers } from '../../../hooks/useBarbers';
import { useToast } from '../../../hooks/useToast';
import ToastNotification from '../shared/ToastNotification';
import type { Barber } from '../../../types';

const SettingsBarbers: FC = () => {
  const { barbers, loading, createBarber, updateBarber, deleteBarber, loadBarbers } = useBarbers();
  const { toast, showSuccess, showError } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Barber>>({});
  const [showNewForm, setShowNewForm] = useState(false);
  const [newBarber, setNewBarber] = useState({
    name: '',
    phone: '',
    commission: 0,
    is_active: true,
    sort_order: barbers.length,
    working_days: {
      '0': { enabled: false },
      '1': { enabled: true },
      '2': { enabled: true },
      '3': { enabled: true },
      '4': { enabled: true },
      '5': { enabled: true },
      '6': { enabled: true },
    },
  });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const handleSave = async (id: string) => {
    setSaving(true);
    try {
      await updateBarber(id, editData);
      showSuccess('Barbeiro atualizado!');
      setEditingId(null);
      setEditData({});
    } catch (err) {
      showError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!newBarber.name.trim()) {
      showError('Informe o nome do barbeiro.');
      return;
    }
    setSaving(true);
    try {
      await createBarber({
        name: newBarber.name.trim(),
        phone: newBarber.phone || undefined,
        photo_url: undefined,
        commission: newBarber.commission,
        is_active: newBarber.is_active,
        sort_order: newBarber.sort_order,
        working_days: newBarber.working_days as Barber['working_days'],
      });
      showSuccess('Barbeiro cadastrado!');
      setShowNewForm(false);
      setNewBarber({
        name: '',
        phone: '',
        commission: 0,
        is_active: true,
        sort_order: barbers.length,
        working_days: {
          '0': { enabled: false },
          '1': { enabled: true },
          '2': { enabled: true },
          '3': { enabled: true },
          '4': { enabled: true },
          '5': { enabled: true },
          '6': { enabled: true },
        },
      });
    } catch (err) {
      showError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteBarber(id);
      showSuccess('Barbeiro removido!');
      setDeleteTarget(null);
    } catch (err) {
      showError(getErrorMessage(err));
    }
  };

  const moveOrder = async (id: string, direction: 'up' | 'down') => {
    const idx = barbers.findIndex((b) => b.id === id);
    if (idx < 0) return;
    const newBarbers = [...barbers];
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= newBarbers.length) return;
    [newBarbers[idx], newBarbers[swapIdx]] = [newBarbers[swapIdx], newBarbers[idx]];
    try {
      await updateBarber(newBarbers[idx].id, { sort_order: idx });
      await updateBarber(newBarbers[swapIdx].id, { sort_order: swapIdx });
      await loadBarbers();
    } catch {
      // handled
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-5 h-5 border-2 border-zinc-800 border-t-[#C5A059] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">Profissionais</h3>
        <button
          onClick={() => setShowNewForm(!showNewForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#C5A059]/10 text-[#C5A059] text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-[#C5A059]/20 transition-all cursor-pointer"
        >
          <Plus size={12} />
          {showNewForm ? 'Cancelar' : 'Adicionar'}
        </button>
      </div>

      {/* New barber form */}
      <AnimatePresence>
        {showNewForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-zinc-900/50 border border-white/[0.06] rounded-xl p-4 space-y-3 overflow-hidden"
          >
            <div>
              <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1">
                Nome
              </label>
              <input
                type="text"
                value={newBarber.name}
                onChange={(e) => setNewBarber({ ...newBarber, name: e.target.value })}
                placeholder="Nome do barbeiro"
                className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-[13px] text-white outline-none focus:border-[#C5A059]/40 transition-all"
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1">
                WhatsApp
              </label>
              <input
                type="text"
                value={newBarber.phone}
                onChange={(e) => setNewBarber({ ...newBarber, phone: e.target.value })}
                placeholder="11999999999"
                className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-[13px] text-white outline-none focus:border-[#C5A059]/40 transition-all"
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1">
                Comissão (%)
              </label>
              <input
                type="number"
                value={newBarber.commission}
                onChange={(e) => setNewBarber({ ...newBarber, commission: Number(e.target.value) })}
                min={0}
                max={100}
                className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-[13px] text-white outline-none focus:border-[#C5A059]/40 transition-all"
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={saving || !newBarber.name.trim()}
              className="w-full py-2.5 bg-[#C5A059] text-black font-bold text-[10px] uppercase tracking-widest rounded-lg hover:bg-[#A68233] transition-all disabled:opacity-50 cursor-pointer"
            >
              {saving ? 'Salvando...' : 'Salvar Barbeiro'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Barber list */}
      <div className="space-y-2">
        {barbers.length === 0 && (
          <p className="text-zinc-600 text-[10px] uppercase tracking-widest text-center py-8">
            Nenhum barbeiro cadastrado
          </p>
        )}
        {barbers.map((barber, idx) => (
          <div
            key={barber.id}
            className="bg-zinc-900/30 border border-white/[0.06] rounded-xl overflow-hidden"
          >
            {editingId === barber.id ? (
              <div className="p-4 space-y-3">
                <div>
                  <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1">
                    Nome
                  </label>
                  <input
                    type="text"
                    value={editData.name ?? barber.name}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-[13px] text-white outline-none focus:border-[#C5A059]/40 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1">
                    WhatsApp
                  </label>
                  <input
                    type="text"
                    value={editData.phone ?? barber.phone ?? ''}
                    onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                    className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-[13px] text-white outline-none focus:border-[#C5A059]/40 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1">
                    Comissão (%)
                  </label>
                  <input
                    type="number"
                    value={editData.commission ?? barber.commission}
                    onChange={(e) =>
                      setEditData({ ...editData, commission: Number(e.target.value) })
                    }
                    min={0}
                    max={100}
                    className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-[13px] text-white outline-none focus:border-[#C5A059]/40 transition-all"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => handleSave(barber.id)}
                    disabled={saving}
                    className="flex-1 py-2 bg-[#C5A059] text-black font-bold text-[10px] uppercase tracking-widest rounded-lg hover:bg-[#A68233] transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {saving ? 'Salvando...' : 'Salvar'}
                  </button>
                  <button
                    onClick={() => {
                      setEditingId(null);
                      setEditData({});
                    }}
                    className="px-4 py-2 text-zinc-400 text-[10px] font-bold uppercase tracking-widest hover:text-white transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                  <User size={14} className="text-zinc-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-white truncate">{barber.name}</span>
                    {!barber.is_active && (
                      <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider bg-zinc-800 px-1.5 py-0.5 rounded">
                        Inativo
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[10px] text-zinc-500">{barber.commission}% comissão</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveOrder(barber.id, 'up')}
                    disabled={idx === 0}
                    className="p-1 text-zinc-600 hover:text-white transition-colors disabled:opacity-30 cursor-pointer"
                    aria-label="Mover para cima"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    onClick={() => moveOrder(barber.id, 'down')}
                    disabled={idx === barbers.length - 1}
                    className="p-1 text-zinc-600 hover:text-white transition-colors disabled:opacity-30 cursor-pointer"
                    aria-label="Mover para baixo"
                  >
                    <ChevronDown size={14} />
                  </button>
                  <button
                    onClick={() => {
                      setEditingId(barber.id);
                      setEditData({
                        name: barber.name,
                        phone: barber.phone,
                        commission: barber.commission,
                      });
                    }}
                    className="p-1.5 text-zinc-500 hover:text-[#C5A059] transition-colors cursor-pointer"
                    aria-label="Editar"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setDeleteTarget({ id: barber.id, name: barber.name })}
                    className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
                    aria-label="Remover"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteTarget(null)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Remover barbeiro"
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="relative z-10 w-full sm:w-[320px] bg-[#111111] border-t sm:border border-white/[0.06] sm:rounded-2xl rounded-t-2xl overflow-hidden"
            >
              <div className="px-5 pt-5 pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-white">Remover {deleteTarget.name}?</h3>
                  <button
                    onClick={() => setDeleteTarget(null)}
                    aria-label="Fechar"
                    className="text-zinc-500 hover:text-white transition-all cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  {deleteTarget.name} será removido da lista de profissionais. Os agendamentos
                  existentes serão mantidos.
                </p>
              </div>
              <div className="flex border-t border-white/[0.04]">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider hover:text-white transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <div className="w-px bg-white/[0.04]" />
                <button
                  onClick={() => deleteTarget && handleDelete(deleteTarget.id)}
                  className="flex-1 py-3 text-[10px] font-bold text-red-500 uppercase tracking-wider hover:bg-red-500/10 transition-all cursor-pointer"
                >
                  Remover
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ToastNotification toast={toast} />
    </div>
  );
};

export default SettingsBarbers;
