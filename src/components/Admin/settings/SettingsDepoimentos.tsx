import { useState, type FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Star,
  Plus,
  Trash2,
  X,
  AlertTriangle,
  Quote,
  RefreshCw,
} from 'lucide-react';
import { useTestimonials } from '../../../hooks/useTestimonials';
import { syncGoogleReviews } from '../../../lib/api';
import ToastNotification from '../shared/ToastNotification';
import { useToast } from '../../../hooks/useToast';

interface SettingsDepoimentosProps {
  onBack?: () => void;
}

const SettingsDepoimentos: FC<SettingsDepoimentosProps> = () => {
  const {
    testimonials,
    loading,
    error: loadError,
    toggleActive,
    addTestimonial,
    deleteTestimonial,
    refresh,
  } = useTestimonials();
  const { toast, showSuccess, showError } = useToast();
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRating, setNewRating] = useState(5);
  const [newText, setNewText] = useState('');
  const [adding, setAdding] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const activeCount = testimonials.filter((t) => t.is_active).length;
  const inactiveCount = testimonials.length - activeCount;

  const handleAdd = async () => {
    if (!newName.trim() || !newText.trim()) {
      showError('Preencha nome e texto do depoimento');
      return;
    }
    setAdding(true);
    try {
      await addTestimonial({ name: newName.trim(), rating: newRating, text: newText.trim() });
      showSuccess('Depoimento adicionado!');
      setNewName('');
      setNewRating(5);
      setNewText('');
      setShowAddForm(false);
    } catch {
      showError('Erro ao adicionar depoimento');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTestimonial(id);
      showSuccess('Depoimento removido');
      setDeleteConfirmId(null);
    } catch {
      showError('Erro ao remover depoimento');
    }
  };

  const renderStars = (rating: number, interactive = false) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type={interactive ? 'button' : 'button'}
          disabled={!interactive}
          onClick={interactive ? () => setNewRating(i) : undefined}
          className={`${interactive ? 'cursor-pointer' : 'cursor-default'} transition-colors`}
        >
          <Star
            size={interactive ? 18 : 12}
            className={`${
              i <= rating ? 'fill-[#D4AF37] text-[#D4AF37]' : 'text-zinc-700'
            } ${interactive ? 'hover:scale-110' : ''}`}
          />
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header info */}
      <div className="flex items-center gap-3 px-1">
        <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center shrink-0">
          <MessageSquare size={16} className="text-[#D4AF37]" />
        </div>
        <div className="flex-1">
          <span className="text-[13px] text-white block font-medium">Depoimentos</span>
          <span className="text-[11px] text-zinc-500 block mt-0.5">
            {activeCount} ativos • {inactiveCount} inativos
          </span>
        </div>
      </div>

      {/* Error banner */}
      {loadError && (
        <div className="w-full px-5 py-4 border border-red-500/20 bg-red-500/[0.04] rounded-2xl">
          <p className="text-[12px] text-red-400">{loadError}</p>
        </div>
      )}

      {/* Sync with Google */}
      <div className="border border-[#D4AF37]/15 bg-[#D4AF37]/[0.02] rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[13px] text-white block font-medium">Google Reviews</span>
            <span className="text-[11px] text-zinc-500 block mt-0.5">
              Busca avaliações do Google e adiciona automaticamente
            </span>
          </div>
          <button
            onClick={async () => {
              setSyncing(true);
              setSyncResult(null);
              try {
                const result = await syncGoogleReviews();
                setSyncResult(result.message);
                showSuccess(result.message);
                refresh();
              } catch (e) {
                const msg = e instanceof Error ? e.message : 'Erro ao sincronizar';
                setSyncResult(msg);
                showError(msg);
              } finally {
                setSyncing(false);
              }
            }}
            disabled={syncing}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-xl text-[10px] font-bold text-[#D4AF37] hover:bg-[#D4AF37]/20 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Sincronizando...' : 'Sincronizar'}
          </button>
        </div>
        {syncResult && <p className="text-[11px] text-zinc-500 mt-2 ml-12">{syncResult}</p>}
      </div>

      {/* Add button */}
      <button
        onClick={() => setShowAddForm(true)}
        className="w-full flex items-center justify-center gap-2 py-4 border border-dashed border-white/[0.12] rounded-2xl text-[12px] font-bold text-zinc-400 hover:text-white hover:border-[#D4AF37]/30 hover:bg-[#D4AF37]/[0.02] transition-all cursor-pointer"
      >
        <Plus size={14} />
        Adicionar depoimento manual
      </button>

      {/* Add form modal */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="border border-white/[0.06] rounded-2xl p-5 space-y-4 bg-white/[0.02]">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold text-white">Novo depoimento</span>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.15em] block mb-1.5">
                  Nome do cliente
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: João Silva"
                  className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 text-[13px] text-white outline-none focus:border-[#D4AF37]/30 transition-all placeholder:text-zinc-600"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.15em] block mb-1.5">
                  Avaliação
                </label>
                {renderStars(newRating, true)}
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.15em] block mb-1.5">
                  Depoimento
                </label>
                <textarea
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  placeholder="Ex: Melhor barbearia da cidade!"
                  rows={3}
                  className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 text-[13px] text-white outline-none focus:border-[#D4AF37]/30 transition-all placeholder:text-zinc-600 resize-none"
                />
              </div>

              <button
                onClick={handleAdd}
                disabled={adding || !newName.trim() || !newText.trim()}
                className="w-full py-3 bg-[#D4AF37] text-black font-bold text-[11px] uppercase tracking-[0.15em] rounded-xl hover:bg-[#b8962e] transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {adding ? 'Adicionando...' : 'Adicionar depoimento'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Testimonials list */}
      <div className="space-y-2">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-white/[0.02] rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : testimonials.length === 0 ? (
          <div className="text-center py-8">
            <Quote size={24} className="text-zinc-700 mx-auto mb-3" />
            <p className="text-[13px] text-zinc-500">Nenhum depoimento cadastrado</p>
            <p className="text-[11px] text-zinc-600 mt-1">
              Adicione manualmente ou integre com Google Reviews
            </p>
          </div>
        ) : (
          testimonials.map((t) => (
            <div
              key={t.id}
              className={`border rounded-2xl overflow-hidden transition-all ${
                t.is_active
                  ? 'border-white/[0.06] hover:border-[#D4AF37]/20'
                  : 'border-white/[0.03] opacity-50 hover:opacity-80'
              }`}
            >
              <div className="flex items-start gap-3 p-4">
                {/* Toggle */}
                <button
                  onClick={() => toggleActive(t.id, t.is_active)}
                  className={`mt-0.5 w-10 h-6 rounded-full transition-all relative shrink-0 cursor-pointer ${
                    t.is_active ? 'bg-[#D4AF37]' : 'bg-zinc-700'
                  }`}
                  role="switch"
                  aria-checked={t.is_active}
                  aria-label={t.is_active ? 'Desativar depoimento' : 'Ativar depoimento'}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${
                      t.is_active ? 'left-5' : 'left-1'
                    }`}
                  />
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[13px] font-bold text-white truncate">{t.name}</span>
                    {t.source === 'google' && (
                      <span className="text-[9px] px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded font-bold uppercase">
                        Google
                      </span>
                    )}
                    <span className="text-[10px] text-zinc-600 shrink-0">
                      {t.publish_time
                        ? new Date(t.publish_time).toLocaleDateString('pt-BR')
                        : new Date(t.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <div className="mb-1.5">{renderStars(t.rating)}</div>
                  <p className="text-[12px] text-zinc-400 leading-relaxed line-clamp-2">{t.text}</p>
                </div>

                {/* Delete button */}
                <div className="shrink-0">
                  {deleteConfirmId === t.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="px-2.5 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] font-bold rounded-lg hover:bg-red-500/20 transition-all cursor-pointer"
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(t.id)}
                      className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors cursor-pointer"
                      aria-label="Excluir depoimento"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Info banner */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white/[0.02] border border-white/[0.04] rounded-2xl">
        <AlertTriangle size={14} className="text-zinc-600 shrink-0" />
        <p className="text-[11px] text-zinc-500 leading-relaxed">
          Depoimentos inativos não aparecem no site. Use o toggle ao lado para ativar/desativar.
        </p>
      </div>

      <ToastNotification toast={toast} />
    </div>
  );
};

export default SettingsDepoimentos;
