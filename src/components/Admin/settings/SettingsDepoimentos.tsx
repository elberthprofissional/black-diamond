import { useState, useEffect, useCallback, type FC } from 'react';
import { Star, Plus, Trash2, Pencil, Check, X, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getAllTestimonials,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
  MAX_TESTIMONIALS,
} from '../../../lib/api';
import { getErrorMessage } from '../../../lib/utils';
import ToastNotification from '../shared/ToastNotification';
import { useToast } from '../../../hooks/useToast';
import type { Testimonial } from '../../../types';

const SettingsDepoimentos: FC = () => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editText, setEditText] = useState('');
  const [editRating, setEditRating] = useState(5);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addName, setAddName] = useState('');
  const [addText, setAddText] = useState('');
  const [addRating, setAddRating] = useState(5);
  const [saving, setSaving] = useState(false);
  const { toast, showSuccess, showError } = useToast();

  const load = useCallback(async () => {
    try {
      const data = await getAllTestimonials();
      setTestimonials(data);
    } catch {
      showError('Erro ao carregar depoimentos');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async () => {
    if (!addName.trim() || !addText.trim()) return;
    setSaving(true);
    try {
      await createTestimonial({ name: addName.trim(), rating: addRating, text: addText.trim() });
      setAddName('');
      setAddText('');
      setAddRating(5);
      setShowAddForm(false);
      showSuccess('Depoimento adicionado!');
      await load();
    } catch (e) {
      showError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (id: string) => {
    setSaving(true);
    try {
      await updateTestimonial(id, {
        name: editName.trim(),
        text: editText.trim(),
        rating: editRating,
      });
      setEditingId(null);
      showSuccess('Depoimento atualizado!');
      await load();
    } catch (e) {
      showError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      await updateTestimonial(id, { is_active: !isActive });
      await load();
    } catch (e) {
      showError(getErrorMessage(e));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTestimonial(id);
      showSuccess('Depoimento removido!');
      await load();
    } catch (e) {
      showError(getErrorMessage(e));
    }
  };

  const startEdit = (t: Testimonial) => {
    setEditingId(t.id);
    setEditName(t.name);
    setEditText(t.text);
    setEditRating(t.rating);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-white/[0.03] rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ToastNotification toast={toast} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] text-zinc-400">
            {testimonials.length}/{MAX_TESTIMONIALS} depoimentos
          </p>
        </div>
        {testimonials.length < MAX_TESTIMONIALS && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#C5A059]/10 text-[#C5A059] text-[11px] font-semibold rounded-lg hover:bg-[#C5A059]/20 transition-all cursor-pointer"
          >
            <Plus size={14} />
            Adicionar
          </button>
        )}
      </div>

      {/* Add Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-[12px] font-semibold text-white">Novo Depoimento</h4>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
              <input
                type="text"
                placeholder="Nome do cliente"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-[13px] text-white outline-none focus:border-[#C5A059]/35 transition-colors"
              />
              <textarea
                placeholder="Depoimento do cliente..."
                value={addText}
                onChange={(e) => setAddText(e.target.value)}
                rows={3}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-[13px] text-white outline-none focus:border-[#C5A059]/35 transition-colors resize-none"
              />
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-zinc-500">Nota:</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((r) => (
                    <button key={r} onClick={() => setAddRating(r)} className="cursor-pointer">
                      <Star
                        size={16}
                        className={
                          r <= addRating ? 'text-[#D4AF37] fill-[#D4AF37]' : 'text-zinc-600'
                        }
                      />
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={handleAdd}
                disabled={saving || !addName.trim() || !addText.trim()}
                className="w-full py-2.5 bg-[#C5A059] text-black text-[11px] font-bold uppercase tracking-wider rounded-lg hover:bg-[#A68233] transition-all disabled:opacity-50 cursor-pointer"
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Testimonials List */}
      <div className="space-y-2">
        {testimonials.map((t) => (
          <div
            key={t.id}
            className={`bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 transition-all ${
              !t.is_active ? 'opacity-50' : ''
            }`}
          >
            {editingId === t.id ? (
              /* Edit Mode */
              <div className="space-y-3">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-white outline-none focus:border-[#C5A059]/35 transition-colors"
                />
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={2}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-white outline-none focus:border-[#C5A059]/35 transition-colors resize-none"
                />
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-zinc-500">Nota:</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((r) => (
                      <button key={r} onClick={() => setEditRating(r)} className="cursor-pointer">
                        <Star
                          size={14}
                          className={
                            r <= editRating ? 'text-[#D4AF37] fill-[#D4AF37]' : 'text-zinc-600'
                          }
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingId(null)}
                    className="flex-1 py-2 text-zinc-500 text-[11px] font-semibold hover:text-white transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleSave(t.id)}
                    disabled={saving}
                    className="flex-1 py-2 bg-[#C5A059] text-black text-[11px] font-bold rounded-lg hover:bg-[#A68233] transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {saving ? '...' : 'Salvar'}
                  </button>
                </div>
              </div>
            ) : (
              /* View Mode */
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <MessageSquare size={12} className="text-zinc-600 shrink-0" />
                      <span className="text-[12px] font-semibold text-white truncate">
                        {t.name}
                      </span>
                      <div className="flex gap-0.5 shrink-0">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            size={10}
                            className={
                              i < t.rating ? 'text-[#D4AF37] fill-[#D4AF37]' : 'text-zinc-700'
                            }
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-[12px] text-zinc-400 leading-relaxed line-clamp-2">
                      {t.text}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => startEdit(t)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer"
                      aria-label="Editar"
                    >
                      <Pencil size={13} className="text-zinc-500" />
                    </button>
                    <button
                      onClick={() => handleToggle(t.id, t.is_active)}
                      className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                        t.is_active ? 'hover:bg-white/[0.06]' : 'hover:bg-emerald-500/10'
                      }`}
                      aria-label={t.is_active ? 'Desativar' : 'Ativar'}
                    >
                      {t.is_active ? (
                        <Check size={13} className="text-emerald-400" />
                      ) : (
                        <Plus size={13} className="text-emerald-400" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
                      aria-label="Excluir"
                    >
                      <Trash2 size={13} className="text-zinc-500 hover:text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {testimonials.length === 0 && (
        <div className="text-center py-8">
          <MessageSquare size={32} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-[12px] text-zinc-500">Nenhum depoimento ainda.</p>
        </div>
      )}
    </div>
  );
};

export default SettingsDepoimentos;
