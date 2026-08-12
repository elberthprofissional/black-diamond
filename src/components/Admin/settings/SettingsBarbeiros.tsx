import {
  useState,
  useEffect,
  useRef,
  type FC,
  type FormEvent,
  type Dispatch,
  type SetStateAction,
  type RefObject,
} from 'react';
import { supabase } from '../../../lib/supabase';
import { upsertBarber, deleteBarber } from '../../../lib/api/barbers';
import { useBarberContext } from '../../../contexts/BarberContext';
import { useToast } from '../../../hooks/useToast';
import ToastNotification from '../shared/ToastNotification';
import { useModalA11y } from '../../../hooks/useModalA11y';
import { useScrollLock } from '../../../hooks/useScrollLock';
import { logError } from '../../../lib/logger';
import type { Barber } from '../../../types';
import {
  User,
  Upload,
  X,
  Pencil,
  Trash2,
  Check,
  Crown,
  Lock,
  KeyRound,
  Scissors,
  RotateCcw,
  Clock,
} from 'lucide-react';
import { useBarberSettings } from '../../../hooks/useBarberSettings';
import { motion } from 'framer-motion';
import BarberHoursModal from './BarberHoursModal';

const EMPTY_FORM = {
  id: undefined as string | undefined,
  name: '',
  phone: '',
  photo_url: '',
  is_active: true,
  is_owner: false,
  sort_order: 0,
  login_email: '',
  login_password: '',
};

interface BarberFormModalProps {
  editingId: string;
  form: typeof EMPTY_FORM;
  setForm: Dispatch<SetStateAction<typeof EMPTY_FORM>>;
  uploading: boolean;
  saving: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onPhotoUpload: (file: File) => void;
  onSubmit: (e: FormEvent) => void;
  onClose: () => void;
}

/**
 * Modal do formulário de barbeiro.
 * - Desktop: modal centralizado (max-w-[460px], rounded, scroll interno)
 * - Mobile: tela cheia com header fixo, corpo rolável e rodapé fixo com ações
 */
const BarberFormModal: FC<BarberFormModalProps> = ({
  editingId,
  form,
  setForm,
  uploading,
  saving,
  fileInputRef,
  onPhotoUpload,
  onSubmit,
  onClose,
}) => {
  useScrollLock();
  const { dialogRef } = useModalA11y(true, onClose, '#barber-name-input');
  const isNew = editingId === 'new';

  return (
    <div className="fixed inset-0 z-[120] sm:flex sm:items-center sm:justify-center sm:p-5">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="barber-form-title"
        className="relative flex flex-col w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-[460px] bg-[#0d0d0d] sm:border sm:border-gold/20 sm:rounded-2xl overflow-hidden sm:shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] shrink-0">
          <div>
            <h3
              id="barber-form-title"
              className="text-[13px] font-bold text-gold uppercase tracking-widest"
            >
              {isNew ? 'Novo barbeiro' : 'Editar barbeiro'}
            </h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              {isNew ? 'Adicione um profissional à equipe' : 'Atualize os dados do profissional'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer"
            aria-label="Fechar formulário"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form
          id="barber-form"
          onSubmit={onSubmit}
          className="flex-1 overflow-y-auto px-5 py-4 space-y-4 scrollbar-hide"
        >
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
                  if (file) onPhotoUpload(file);
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
                id="barber-name-input"
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

          {/* Login do barbeiro — só para barbeiro novo */}
          {isNew && (
            <div className="border border-white/[0.06] rounded-xl p-4 space-y-3 bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <KeyRound size={14} className="text-gold" />
                <p className="text-[11px] font-bold text-white uppercase tracking-widest">
                  Login do barbeiro (opcional)
                </p>
              </div>
              <p className="text-[10px] text-zinc-600 -mt-1">
                Preencha para o barbeiro entrar no painel dele. Se deixar vazio, você pode criar o
                acesso depois.
              </p>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  E-mail
                </label>
                <input
                  type="email"
                  value={form.login_email}
                  onChange={(e) => setForm({ ...form, login_email: e.target.value })}
                  placeholder="juninho@email.com"
                  className="w-full h-11 bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 text-[14px] text-white outline-none focus:border-gold transition-all placeholder:text-zinc-600"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  Senha (mín. 6 caracteres)
                </label>
                <input
                  type="password"
                  value={form.login_password}
                  onChange={(e) => setForm({ ...form, login_password: e.target.value })}
                  placeholder="••••••••"
                  minLength={6}
                  className="w-full h-11 bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 text-[14px] text-white outline-none focus:border-gold transition-all placeholder:text-zinc-600"
                />
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div
          className="flex gap-3 px-5 pt-3 border-t border-white/[0.06] shrink-0 bg-[#0d0d0d]/95 backdrop-blur"
          style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))' }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-5 h-11 border border-white/[0.08] text-zinc-400 hover:text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="barber-form"
            disabled={saving}
            className="flex-1 h-11 bg-gold text-black text-[10px] font-bold uppercase tracking-[0.15em] rounded-xl hover:bg-[#b8962e] transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? 'Salvando...' : isNew ? 'Adicionar barbeiro' : 'Salvar alterações'}
          </button>
        </div>
      </div>
    </div>
  );
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
  const { singleBarberMode, updateSingleBarberMode } = useBarberSettings();
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<typeof EMPTY_FORM>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [hoursBarberId, setHoursBarberId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadBarbers = async () => {
    try {
      // Exclui perfis ocultos (is_hidden — ex.: dono/dev que não atende) da lista.
      const { data, error } = await supabase
        .from('barbers')
        .select('*')
        .eq('is_hidden', false)
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
      is_active: barber.is_active,
      is_owner: barber.is_owner,
      sort_order: barber.sort_order ?? 0,
      login_email: '',
      login_password: '',
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
      const barberId = await upsertBarber({
        id: form.id,
        name: form.name.trim(),
        phone: form.phone.replace(/\D/g, '') || undefined,
        photo_url: form.photo_url || undefined,
        is_active: form.is_active,
        is_owner: form.is_owner,
        sort_order: form.sort_order,
      });

      // Cria o login do barbeiro pela edge function (dono autenticado)
      let loginCreated = false;
      let loginFailed = false;
      if (editingId === 'new' && form.login_email && form.login_password) {
        try {
          const { error: fnError } = await supabase.functions.invoke('criar-acesso-barbeiro', {
            body: {
              barberId,
              name: form.name.trim(),
              email: form.login_email.trim(),
              password: form.login_password,
              isOwner: form.is_owner,
            },
          });
          if (fnError) throw fnError;
          loginCreated = true;
        } catch (err) {
          logError(err, 'SettingsBarbeiros/login');
          loginFailed = true;
        }
      }

      if (loginFailed) {
        showError('Barbeiro salvo, mas falhou ao criar o login. Crie o acesso depois.');
      } else {
        showSuccess(
          editingId === 'new'
            ? loginCreated
              ? 'Barbeiro adicionado com acesso!'
              : 'Barbeiro adicionado!'
            : 'Barbeiro atualizado!'
        );
      }
      cancelEdit();
      await loadBarbers();
    } catch (err) {
      logError(err, 'SettingsBarbeiros/save');
      showError(err instanceof Error ? err.message : 'Erro ao salvar barbeiro.');
    } finally {
      setSaving(false);
    }
  };

  const handleReactivate = async (barber: Barber) => {
    setSaving(true);
    try {
      await upsertBarber({ id: barber.id, name: barber.name, is_active: true });
      showSuccess('Barbeiro reativado.');
      await loadBarbers();
    } catch (err) {
      logError(err, 'SettingsBarbeiros/reactivate');
      showError(err instanceof Error ? err.message : 'Erro ao reativar barbeiro.');
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

  const handleToggleSoloMode = async () => {
    const next = !singleBarberMode;
    const ok = await updateSingleBarberMode(next);
    if (ok) {
      showSuccess(next ? 'Modo barbeiro único ativado.' : 'Modo multi-barbeiro ativado.');
    } else {
      showError('Erro ao salvar a configuração.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Modo solo / multi-barbeiro */}
      <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-2xl px-5 py-4 flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-gold/10 border border-gold/25 flex items-center justify-center shrink-0">
          <Scissors size={18} className="text-gold" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold text-white">Barbeiro único (modo solo)</p>
          <p className="text-[12px] text-zinc-500 leading-snug mt-0.5">
            {singleBarberMode
              ? 'O cliente agenda direto com o barbeiro principal — sem escolher barbeiro.'
              : 'O cliente escolhe o barbeiro no agendamento (quando há mais de um ativo).'}
          </p>
        </div>
        <button
          type="button"
          onClick={handleToggleSoloMode}
          role="switch"
          aria-checked={singleBarberMode}
          aria-label="Modo barbeiro único"
          className={`relative w-12 h-7 rounded-full transition-colors shrink-0 cursor-pointer ${
            singleBarberMode ? 'bg-gold' : 'bg-zinc-700'
          }`}
        >
          <motion.div
            className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-md"
            animate={{ left: singleBarberMode ? 26 : 4 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        </button>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">Barbeiros</h2>
          <p className="text-[12px] text-zinc-500 mt-0.5">
            Adicione, edite e ative os profissionais da barbearia.
          </p>
        </div>
        <button
          type="button"
          onClick={startNew}
          className="px-4 py-2.5 bg-gold text-black text-[10px] font-bold uppercase tracking-[0.15em] rounded-xl hover:bg-[#b8962e] transition-all cursor-pointer"
        >
          + Novo barbeiro
        </button>
      </div>

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
                  {barber.barber_hours && (
                    <span className="text-[9px] font-bold uppercase tracking-wider text-gold/90 bg-gold/10 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                      <Clock size={9} /> Horário próprio
                    </span>
                  )}
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
                  onClick={() => setHoursBarberId(barber.id)}
                  className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                    barber.barber_hours
                      ? 'border-gold/25 text-gold hover:bg-gold/10 hover:border-gold/40'
                      : 'border-white/[0.08] text-zinc-500 hover:text-gold hover:border-gold/30'
                  }`}
                  aria-label={`Horários de ${barber.name}`}
                  title="Horários"
                >
                  <Clock size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => startEdit(barber)}
                  className="w-9 h-9 rounded-lg border border-white/[0.08] flex items-center justify-center text-zinc-400 hover:text-gold hover:border-gold/30 transition-all cursor-pointer"
                  aria-label={`Editar ${barber.name}`}
                >
                  <Pencil size={14} />
                </button>
                {!barber.is_active ? (
                  <button
                    type="button"
                    onClick={() => handleReactivate(barber)}
                    disabled={saving}
                    className="w-9 h-9 rounded-lg border border-emerald-500/20 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/40 transition-all cursor-pointer disabled:opacity-50"
                    aria-label={`Reativar ${barber.name}`}
                    title="Reativar"
                  >
                    <RotateCcw size={14} />
                  </button>
                ) : (
                  !barber.is_owner && (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(barber.id)}
                      className="w-9 h-9 rounded-lg border border-white/[0.08] flex items-center justify-center text-zinc-500 hover:text-red-400 hover:border-red-400/30 transition-all cursor-pointer"
                      aria-label={`Remover ${barber.name}`}
                      title="Desativar"
                    >
                      <Trash2 size={14} />
                    </button>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hint sobre login */}
      <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4">
        <p className="text-[11px] text-zinc-500 leading-relaxed">
          <span className="font-bold text-zinc-300">Login do barbeiro:</span> ao adicionar um
          barbeiro novo, você pode informar e-mail e senha no formulário para ele já entrar no
          painel dele. Cada barbeiro vê apenas os próprios agendamentos; o dono vê tudo. Quem ainda
          não tem login aparece com o selo <span className="text-amber-400">sem login</span>.
        </p>
      </div>

      {/* Modal de horários por barbeiro */}
      {hoursBarberId &&
        (() => {
          const target = barbers.find((b) => b.id === hoursBarberId);
          if (!target) return null;
          return (
            <BarberHoursModal
              barber={target}
              onClose={() => setHoursBarberId(null)}
              onSaved={loadBarbers}
            />
          );
        })()}

      {/* Modal do formulário (desktop: centralizado / mobile: tela cheia) */}
      {editingId && (
        <BarberFormModal
          editingId={editingId}
          form={form}
          setForm={setForm}
          uploading={uploading}
          saving={saving}
          fileInputRef={fileInputRef}
          onPhotoUpload={handlePhotoUpload}
          onSubmit={handleSubmit}
          onClose={cancelEdit}
        />
      )}

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
