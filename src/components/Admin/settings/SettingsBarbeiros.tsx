import { useState, useEffect, useRef, type FC, type FormEvent } from 'react';
import { supabase } from '../../../lib/supabase';
import { upsertBarber, deleteBarber } from '../../../lib/api/barbers';
import { useBarberContext } from '../../../contexts/BarberContext';
import { useToast } from '../../../hooks/useToast';
import ToastNotification from '../shared/ToastNotification';
import { logError } from '../../../lib/logger';
import type { Barber } from '../../../types';
import { User, Upload, X, Pencil, Trash2, Check, Crown, Lock, KeyRound } from 'lucide-react';

const EMPTY_FORM = {
  id: undefined as string | undefined,
  name: '',
  phone: '',
  photo_url: '',
  bio: '',
  quote: '',
  is_active: true,
  is_owner: false,
  sort_order: 0,
};

/**
 * Gestão de barbeiros (multi-barbeiro).
 * Somente DONOS (ex.: Tato) podem adicionar/editar/remover barbeiros.
 * O login de cada barbeiro é criado via script (scripts/criar-acesso-barbeiro.mjs)
 * e vinculado pela coluna barbers.user_id.
 */
const SettingsBarbeiros: FC = () => {
  const { isOwner } = useBarberContext();
  const { showError, showSuccess, toast } = useToast();
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<typeof EMPTY_FORM>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadBarbers = async () => {
    try {
      const { data, error } = await supabase
        .from('barbers')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      setBarbers((data || []) as Barber[]);
    } catch (e) {
      logError(e, 'SettingsBarbeiros/load');
      showError('Erro ao carregar barbeiros.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadBarbers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startEdit = (barber: Barber) => {
    setEditingId(barber.id);
    setForm({
      id: barber.id,
      name: barber.name || '',
      phone: barber.phone || '',
      photo_url: barber.photo_url || '',
      bio: barber.bio || '',
      quote: barber.quote || '',
      is_active: barber.is_active,
      is_owner: barber.is_owner,
      sort_order: barber.sort_order ?? 0,
    });
  };

  const startNew = () => {
    setEditingId('new');
    setForm(EMPTY_FORM);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handlePhotoUpload = async (file: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'webp';
      const path = `barbers/barber-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('avatars').upload(path, file, {
        cacheControl: '3600',
        upsert: true,
      });
      if (error) throw error;
      const { data: publicUrl } = supabase.storage.from('avatars').getPublicUrl(path);
      setForm((prev) => ({ ...prev, photo_url: publicUrl.publicUrl }));
      showSuccess('Foto enviada!');
    } catch (e) {
      logError(e, 'SettingsBarbeiros/upload');
      showError('Erro ao enviar a foto.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.name.trim().length < 2) {
      showError('Informe o nome do barbeiro.');
      return;
    }
    setSaving(true);
    try {
      await upsertBarber({
        id: form.id,
        name: form.name.trim(),
        phone: form.phone.replace(/\D/g, '') || undefined,
        photo_url: form.photo_url || undefined,
        bio: form.bio.trim() || undefined,
        quote: form.quote.trim() || undefined,
        is_active: form.is_active,
        is_owner: form.is_owner,
        sort_order: form.sort_order,
      });
      showSuccess(editingId === 'new' ? 'Barbeiro adicionado!' : 'Barbeiro atualizado!');
      cancelEdit();
      await loadBarbers();
    } catch (err) {
      logError(err, 'SettingsBarbeiros/save');
      showError(err instanceof Error ? err.message : 'Erro ao salvar barbeiro.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setSaving(true);
    try {
      await deleteBarber(id, false);
      showSuccess('Barbeiro desativado.');
      setConfirmDeleteId(null);
      await loadBarbers();
    } catch (err) {
      logError(err, 'SettingsBarbeiros/delete');
      showError(err instanceof Error ? err.message : 'Erro ao remover barbeiro.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOwner) {
    return (
      <div className="text-center py-16 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto">
          <Lock size={22} className="text-zinc-500" />
        </div>
        <p className="text-[14px] text-zinc-400">
          Apenas o barbeiro chefe (dono) pode gerenciar a equipe.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">Barbeiros</h2>
          <p className="text-[12px] text-zinc-500 mt-0.5">
            Adicione, edite e ative os profissionais da barbearia.
          </p>
        </div>
        {!editingId && (
          <button
            type="button"
            onClick={startNew}
            className="px-4 py-2.5 bg-gold text-black text-[10px] font-bold uppercase tracking-[0.15em] rounded-xl hover:bg-[#b8962e] transition-all cursor-pointer"
          >
            + Novo barbeiro
          </button>
        )}
      </div>

      {/* Form */}
      {editingId && (
        <form
          onSubmit={handleSubmit}
          className="bg-[#0d0d0d] border border-gold/20 rounded-2xl p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-[13px] font-bold text-gold uppercase tracking-widest">
              {editingId === 'new' ? 'Novo barbeiro' : 'Editar barbeiro'}
            </h3>
            <button
              type="button"
              onClick={cancelEdit}
              className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
              aria-label="Fechar formulário"
            >
              <X size={16} />
            </button>
          </div>

          {/* Foto */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white/[0.03] border border-white/[0.08] flex items-center justify-center shrink-0">
              {form.photo_url ? (
                <img
                  src={form.photo_url}
                  alt="Foto do barbeiro"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={22} className="text-zinc-600" />
              )}
            </div>
            <div className="flex-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="text-[10px] font-bold uppercase tracking-widest text-gold hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <Upload size={12} /> {uploading ? 'Enviando...' : 'Enviar foto'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handlePhotoUpload(file);
                  e.target.value = '';
                }}
              />
              <p className="text-[10px] text-zinc-600 mt-1">PNG, JPG ou WEBP</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Nome *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex.: Juninho"
                className="w-full h-11 bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 text-[14px] text-white outline-none focus:border-gold transition-all placeholder:text-zinc-600"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                WhatsApp (com DDD)
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })}
                placeholder="(44) 99999-9999"
                maxLength={11}
                className="w-full h-11 bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 text-[14px] text-white outline-none focus:border-gold transition-all placeholder:text-zinc-600"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Bio (sobre ele)
            </label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              rows={2}
              placeholder="Uma frase curta sobre o profissional..."
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-[14px] text-white outline-none focus:border-gold transition-all placeholder:text-zinc-600 resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Frase
            </label>
            <input
              type="text"
              value={form.quote}
              onChange={(e) => setForm({ ...form, quote: e.target.value })}
              placeholder="Ex.: Cortar cabelo é minha arte"
              className="w-full h-11 bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 text-[14px] text-white outline-none focus:border-gold transition-all placeholder:text-zinc-600"
            />
          </div>

          <div className="flex flex-wrap items-center gap-5">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="w-4 h-4 accent-[#D4AF37]"
              />
              <span className="text-[12px] text-zinc-400">Ativo para agendamento</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_owner}
                onChange={(e) => setForm({ ...form, is_owner: e.target.checked })}
                className="w-4 h-4 accent-[#D4AF37]"
              />
              <span className="text-[12px] text-zinc-400 flex items-center gap-1">
                <Crown size={12} className="text-gold" /> Dono (vê todos os agendamentos)
              </span>
            </label>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 h-11 bg-gold text-black text-[10px] font-bold uppercase tracking-[0.15em] rounded-xl hover:bg-[#b8962e] transition-all cursor-pointer disabled:opacity-50"
            >
              {saving
                ? 'Salvando...'
                : editingId === 'new'
                  ? 'Adicionar barbeiro'
                  : 'Salvar alterações'}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="px-5 h-11 border border-white/[0.08] text-zinc-400 hover:text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="skeleton-pulse h-20 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="divide-y divide-white/[0.05] bg-white/[0.02] rounded-2xl">
          {barbers.length === 0 && (
            <p className="text-center text-zinc-600 text-[12px] py-10">
              Nenhum barbeiro cadastrado ainda.
            </p>
          )}
          {barbers.map((barber) => (
            <div key={barber.id} className="flex items-center gap-4 px-4 py-4">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/[0.03] border border-white/[0.08] flex items-center justify-center shrink-0">
                {barber.photo_url ? (
                  <img src={barber.photo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User size={18} className="text-zinc-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold text-white truncate flex items-center gap-2">
                  {barber.name}
                  {barber.is_owner && <Crown size={13} className="text-gold shrink-0" />}
                  {!barber.is_active && (
                    <span className="text-[9px] font-bold uppercase tracking-wider text-red-400/80 bg-red-400/10 px-1.5 py-0.5 rounded">
                      Inativo
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-zinc-500 truncate flex items-center gap-1.5 mt-0.5">
                  {barber.phone
                    ? `(${barber.phone.slice(0, 2)}) ${barber.phone.slice(2)}`
                    : 'Sem WhatsApp'}
                  {barber.user_id ? (
                    <span className="inline-flex items-center gap-1 text-emerald-400">
                      <Check size={10} /> acesso
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-400/80">
                      <KeyRound size={10} /> sem login
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => startEdit(barber)}
                  className="w-9 h-9 rounded-lg border border-white/[0.08] flex items-center justify-center text-zinc-400 hover:text-gold hover:border-gold/30 transition-all cursor-pointer"
                  aria-label={`Editar ${barber.name}`}
                >
                  <Pencil size={14} />
                </button>
                {!barber.is_owner && (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(barber.id)}
                    className="w-9 h-9 rounded-lg border border-white/[0.08] flex items-center justify-center text-zinc-500 hover:text-red-400 hover:border-red-400/30 transition-all cursor-pointer"
                    aria-label={`Remover ${barber.name}`}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hint sobre login */}
      <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4">
        <p className="text-[11px] text-zinc-500 leading-relaxed">
          <span className="font-bold text-zinc-300">Criar o login do barbeiro:</span> rode o script{' '}
          <code className="text-gold">scripts/criar-acesso-barbeiro.mjs</code> (ou crie o usuário no
          Supabase) e o barbeiro aparecerá com o selo verde{' '}
          <span className="text-emerald-400">acesso</span>. Cada barbeiro vê apenas os próprios
          agendamentos; o dono vê tudo.
        </p>
      </div>

      {/* Delete confirm */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-5">
          <div className="bg-[#111] border border-white/[0.08] rounded-2xl p-5 w-full max-w-sm space-y-4">
            <p className="text-[14px] font-bold text-white">Desativar barbeiro?</p>
            <p className="text-[12px] text-zinc-500">
              O barbeiro deixa de aparecer no agendamento. Os históricos são mantidos.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 h-10 border border-white/[0.08] text-zinc-400 hover:text-white rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleDelete(confirmDeleteId)}
                disabled={saving}
                className="flex-1 h-10 bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
              >
                {saving ? '...' : 'Desativar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastNotification toast={toast} />
    </div>
  );
};

export default SettingsBarbeiros;
