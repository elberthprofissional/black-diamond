import { useState, type FC } from 'react';
import { Users, Plus, X, Check, Pencil, Trash2, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { upsertBarber, deleteBarber } from '../../../lib/api/barbers';
import { useToast } from '../../../hooks/useToast';
import ToastNotification from '../shared/ToastNotification';
import { useBarberContext } from '../../../contexts/BarberContext';
import { logError } from '../../../lib/logger';
import type { Barber } from '../../../types';

interface BarberForm {
  name: string;
  phone: string;
  bio: string;
  quote: string;
  is_owner: boolean;
  sort_order: number;
}

const emptyForm: BarberForm = {
  name: '',
  phone: '',
  bio: '',
  quote: '',
  is_owner: false,
  sort_order: 0,
};

const SettingsBarbeiros: FC = () => {
  const { barbers, refreshBarbers, loading } = useBarberContext();
  const { toast, showSuccess, showError } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BarberForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const startCreate = () => {
    setForm({ ...emptyForm, sort_order: barbers.length });
    setEditingId('new');
  };

  const startEdit = (barber: Barber) => {
    setForm({
      name: barber.name,
      phone: barber.phone || '',
      bio: barber.bio || '',
      quote: barber.quote || '',
      is_owner: barber.is_owner,
      sort_order: barber.sort_order,
    });
    setEditingId(barber.id);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      showError('Informe o nome do barbeiro.');
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<Barber> & { id?: string } = {
        name: form.name.trim(),
        phone: form.phone.replace(/\D/g, '') || undefined,
        bio: form.bio.trim() || undefined,
        quote: form.quote.trim() || undefined,
        is_owner: form.is_owner,
        sort_order: form.sort_order,
      };

      if (editingId && editingId !== 'new') {
        payload.id = editingId;
      }

      await upsertBarber(payload);
      showSuccess(editingId === 'new' ? 'Barbeiro adicionado!' : 'Barbeiro atualizado!');
      cancelEdit();
      await refreshBarbers();
    } catch (e) {
      logError(e);
      showError('Erro ao salvar barbeiro.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setSaving(true);
    try {
      await deleteBarber(id, false);
      showSuccess('Barbeiro removido!');
      setConfirmDelete(null);
      await refreshBarbers();
    } catch (e) {
      logError(e);
      showError('Erro ao remover barbeiro.');
    } finally {
      setSaving(false);
    }
  };

  const sortedBarbers = [...barbers].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Barbeiros</h3>
          <p className="text-sm text-zinc-500 mt-1">Gerencie os barbeiros da sua barbearia.</p>
        </div>
        {editingId !== 'new' && (
          <button
            onClick={startCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] text-[11px] font-bold uppercase tracking-wider hover:bg-[#D4AF37]/20 transition-all cursor-pointer"
          >
            <Plus size={14} />
            Adicionar
          </button>
        )}
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-white/[0.03] animate-pulse" />
            ))}
          </div>
        ) : sortedBarbers.length === 0 && editingId !== 'new' ? (
          <div className="text-center py-12">
            <Users size={32} className="mx-auto text-zinc-600 mb-3" />
            <p className="text-sm text-zinc-500">Nenhum barbeiro cadastrado.</p>
            <button
              onClick={startCreate}
              className="mt-3 text-[11px] font-bold text-[#D4AF37] uppercase tracking-wider hover:text-white transition-colors cursor-pointer"
            >
              Adicionar barbeiro
            </button>
          </div>
        ) : (
          sortedBarbers.map((barber) => (
            <div
              key={barber.id}
              className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] transition-all"
            >
              <div className="w-10 h-10 rounded-full bg-white/[0.04] flex items-center justify-center ring-1 ring-white/[0.08] shrink-0 overflow-hidden">
                {barber.photo_url ? (
                  <img
                    src={barber.photo_url}
                    alt={barber.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Users size={16} className="text-zinc-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-white truncate">{barber.name}</p>
                  {barber.is_owner && <Star size={12} className="text-[#D4AF37] fill-[#D4AF37]" />}
                  {!barber.is_active && (
                    <span className="text-[9px] text-red-400 font-bold uppercase tracking-wider">
                      Inativo
                    </span>
                  )}
                </div>
                {barber.phone && <p className="text-xs text-zinc-500 mt-0.5">{barber.phone}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => startEdit(barber)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer"
                  aria-label={`Editar ${barber.name}`}
                >
                  <Pencil size={14} />
                </button>
                {!barber.is_owner && (
                  <button
                    onClick={() => setConfirmDelete(barber.id)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-500/[0.06] transition-all cursor-pointer"
                    aria-label={`Remover ${barber.name}`}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <AnimatePresence>
        {editingId && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white">
                  {editingId === 'new' ? 'Novo Barbeiro' : 'Editar Barbeiro'}
                </h4>
                <button
                  onClick={cancelEdit}
                  className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
                  aria-label="Cancelar"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Nome
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Nome do barbeiro"
                    maxLength={30}
                    className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#D4AF37]/40 transition-all placeholder:text-zinc-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                    WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="(11) 99999-9999"
                    maxLength={15}
                    className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#D4AF37]/40 transition-all placeholder:text-zinc-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Bio
                  </label>
                  <textarea
                    value={form.bio}
                    onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
                    placeholder="Pequena descrição do barbeiro..."
                    maxLength={200}
                    rows={2}
                    className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#D4AF37]/40 transition-all placeholder:text-zinc-600 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Frase
                  </label>
                  <input
                    type="text"
                    value={form.quote}
                    onChange={(e) => setForm((p) => ({ ...p, quote: e.target.value }))}
                    placeholder='"Frase do barbeiro..."'
                    maxLength={80}
                    className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#D4AF37]/40 transition-all placeholder:text-zinc-600"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={cancelEdit}
                  className="px-4 py-2 rounded-xl border border-white/[0.06] text-zinc-400 text-[11px] font-bold uppercase tracking-wider hover:text-white transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !form.name.trim()}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#D4AF37] text-black text-[11px] font-bold uppercase tracking-wider hover:bg-[#b8962e] transition-all cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}
                  {editingId === 'new' ? 'Adicionar' : 'Salvar'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center p-4"
          >
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setConfirmDelete(null)}
            />
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="relative bg-[#151515] border border-white/[0.08] rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            >
              <h4 className="text-sm font-bold text-white mb-2">Remover Barbeiro</h4>
              <p className="text-sm text-zinc-400">
                Tem certeza? O barbeiro será desativado. Agendamentos passados serão preservados.
              </p>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-2.5 rounded-xl border border-white/[0.06] text-zinc-400 text-[11px] font-bold uppercase tracking-wider hover:text-white transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDelete(confirmDelete)}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-[11px] font-bold uppercase tracking-wider hover:bg-red-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Removendo...' : 'Remover'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ToastNotification toast={toast} />
    </div>
  );
};

export default SettingsBarbeiros;
