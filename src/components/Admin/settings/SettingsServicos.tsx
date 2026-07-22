import { useState, useEffect, useRef, useCallback, type FC } from 'react';
import { useToast } from '../../../hooks/useToast';
import ToastNotification from '../shared/ToastNotification';
import { supabase } from '../../../lib/supabase';
import { Plus, Trash2, X, Check, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { logError } from '../../../lib/logger';
import { formatPrice } from '../../../lib/utils';

interface Service {
  id: string;
  name: string;
  price: number;
}

const MAX_SERVICES = 15;
const MAX_NAME_LENGTH = 30;
const MAX_PRICE_LENGTH = 6;

const SettingsServicos: FC = () => {
  const { toast, showSuccess, showError } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState<'list' | 'add' | 'edit'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [nameInput, setNameInput] = useState('');
  const [priceInput, setPriceInput] = useState('');
  const [durationInput, setDurationInput] = useState('60');
  const nameInputRef = useRef<HTMLInputElement>(null);

  const loadServices = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('id, name, price')
        .order('name', { ascending: true });
      if (error) throw error;
      if (data) setServices(data);
    } catch (e) {
      logError(e);
      showError('Erro ao carregar serviços');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadServices();
  }, [loadServices]);

  useEffect(() => {
    if ((screen === 'add' || screen === 'edit') && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [screen]);

  const handleAdd = async () => {
    const name = nameInput.trim();
    const price = parseFloat(priceInput.replace(',', '.'));
    if (!name) {
      showError('Digite o nome do serviço');
      return;
    }
    if (name.length > MAX_NAME_LENGTH) {
      showError(`Máximo de ${MAX_NAME_LENGTH} caracteres`);
      return;
    }
    if (!priceInput || isNaN(price) || price <= 0) {
      showError('Digite um preço válido');
      return;
    }
    if (price < 5) {
      showError('Preço mínimo é R$ 5,00');
      return;
    }
    if (services.length >= MAX_SERVICES) {
      showError(`Máximo de ${MAX_SERVICES} serviços`);
      return;
    }

    try {
      const duration = parseInt(durationInput, 10) || 60;
      const { error } = await supabase.from('services').insert({ name, price, duration });
      if (error) throw error;
      showSuccess('Serviço adicionado!');
      setNameInput('');
      setPriceInput('');
      setScreen('list');
      loadServices();
    } catch (e) {
      logError(e);
      showError('Erro ao adicionar serviço');
    }
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    const name = nameInput.trim();
    const price = parseFloat(priceInput.replace(',', '.'));
    if (!name || name.length > MAX_NAME_LENGTH) {
      showError(`Nome: 1-${MAX_NAME_LENGTH} caracteres`);
      return;
    }
    if (!priceInput || isNaN(price) || price <= 0) {
      showError('Preço inválido');
      return;
    }
    if (price < 5) {
      showError('Preço mínimo é R$ 5,00');
      return;
    }

    try {
      const duration = parseInt(durationInput, 10) || 60;
      const { error } = await supabase
        .from('services')
        .update({ name, price, duration })
        .eq('id', editingId);
      if (error) throw error;
      showSuccess('Serviço atualizado!');
      setScreen('list');
      loadServices();
    } catch (e) {
      logError(e);
      showError('Erro ao atualizar serviço');
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const { error } = await supabase.from('services').delete().eq('id', id);
      if (error) throw error;
      showSuccess('Serviço removido!');
      setServices((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      logError(e);
      showError('Erro ao remover serviço');
    } finally {
      setDeleting(null);
      setConfirmDelete(null);
    }
  };

  const openAdd = () => {
    setNameInput('');
    setPriceInput('');
    setDurationInput('60');
    setEditingId(null);
    setScreen('add');
  };
  const openEdit = (service: Service) => {
    setNameInput(service.name);
    setPriceInput(String(service.price));
    setDurationInput('60');
    setEditingId(service.id);
    setScreen('edit');
  };
  const closeForm = () => {
    setNameInput('');
    setPriceInput('');
    setDurationInput('60');
    setEditingId(null);
    setScreen('list');
  };
  const handleSubmit = () => {
    if (screen === 'add') handleAdd();
    else if (screen === 'edit') handleUpdate();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-white/[0.02] rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Desktop: Notion Style */}
      <div className="hidden lg:block max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-white text-[15px] font-semibold">Serviços cadastrados</h3>
            <p className="text-zinc-500 text-[12px] mt-0.5">
              {services.length} de {MAX_SERVICES}
            </p>
          </div>
          <button
            onClick={openAdd}
            disabled={services.length >= MAX_SERVICES}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#D4AF37] text-black font-semibold text-[12px] rounded-lg hover:bg-[#b8962e] transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Plus size={14} strokeWidth={2.5} />
            Adicionar
          </button>
        </div>

        {/* Empty State */}
        {services.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-zinc-600 text-[13px]">Nenhum serviço cadastrado</p>
          </div>
        )}

        {/* Services List */}
        {services.length > 0 && (
          <div className="border-t border-white/[0.06]">
            {services.map((service) => (
              <div
                key={service.id}
                className="flex items-center justify-between py-4 border-b border-white/[0.04] hover:bg-white/[0.02] transition-all duration-200 px-2 -mx-2 rounded-lg"
              >
                <div className="flex items-baseline gap-4">
                  <span className="text-[15px] font-semibold text-white">{service.name}</span>
                  <span className="text-[13px] text-[#D4AF37] font-medium">
                    {formatPrice(service.price)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(service)}
                    className="p-2 hover:bg-white/[0.06] rounded-lg transition-all cursor-pointer"
                    title="Editar"
                  >
                    <Pencil
                      size={14}
                      className="text-zinc-500 hover:text-white transition-colors"
                    />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(service.id)}
                    className="p-2 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                    title="Excluir"
                  >
                    <Trash2
                      size={14}
                      className="text-zinc-500 hover:text-red-400 transition-colors"
                    />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mobile: Card Layout */}
      <div className="lg:hidden">
        <div className="border border-white/[0.04] rounded-2xl overflow-hidden">
          <div className="px-5 py-3 bg-white/[0.02] flex items-center justify-between">
            <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
              {services.length}/{MAX_SERVICES} serviços
            </span>
            <button
              onClick={openAdd}
              disabled={services.length >= MAX_SERVICES}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#D4AF37]/20 text-[#D4AF37] text-[11px] font-medium rounded-lg transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Plus size={12} />
              Adicionar
            </button>
          </div>

          {services.length === 0 && (
            <div className="px-5 py-8 text-center">
              <p className="text-zinc-600 text-xs">Nenhum serviço cadastrado</p>
            </div>
          )}

          {services.map((service) => (
            <div
              key={service.id}
              className="px-5 py-4 flex items-center justify-between border-t border-white/[0.04]"
            >
              <div>
                <p className="text-[13px] text-white">{service.name}</p>
                <p className="text-[11px] text-[#D4AF37] font-medium">
                  {formatPrice(service.price)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEdit(service)}
                  className="px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.1] text-zinc-400 text-[10px] font-medium rounded-lg transition-all cursor-pointer"
                >
                  Editar
                </button>
                <button
                  onClick={() => setConfirmDelete(service.id)}
                  className="p-2 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                >
                  <Trash2 size={14} className="text-zinc-500 hover:text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add/Edit Full Screen */}
      <AnimatePresence>
        {(screen === 'add' || screen === 'edit') && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-0 z-[300] bg-[#0A0A0A]"
          >
            <div className="flex items-center justify-between px-4 h-14 border-b border-white/[0.06]">
              <button
                onClick={closeForm}
                className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
                aria-label="Cancelar"
              >
                <X size={24} />
              </button>
              <span className="text-[15px] font-bold text-white">
                {screen === 'add' ? 'Novo Serviço' : 'Editar Serviço'}
              </span>
              <button
                onClick={handleSubmit}
                className="text-[#D4AF37] font-bold text-[15px] transition-colors cursor-pointer"
                aria-label="Salvar"
              >
                <Check size={24} />
              </button>
            </div>

            <div className="p-5 space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
                    Nome do serviço
                  </span>
                  <span className="text-[10px] text-zinc-600">
                    {nameInput.length}/{MAX_NAME_LENGTH}
                  </span>
                </div>
                <input
                  ref={nameInputRef}
                  type="text"
                  value={nameInput}
                  onChange={(e) => {
                    if (e.target.value.length <= MAX_NAME_LENGTH) setNameInput(e.target.value);
                  }}
                  placeholder="Ex: Corte de Cabelo"
                  maxLength={MAX_NAME_LENGTH}
                  className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3.5 text-[15px] text-white outline-none focus:border-[#D4AF37]/40 transition-all placeholder:text-zinc-600"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSubmit();
                  }}
                />
              </div>

              <div className="space-y-2">
                <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.2em] block">
                  Duração (min)
                </span>
                <select
                  value={durationInput}
                  onChange={(e) => setDurationInput(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3.5 text-[15px] text-white outline-none focus:border-[#D4AF37]/40 transition-all"
                >
                  <option value="15">15 min</option>
                  <option value="30">30 min</option>
                  <option value="45">45 min</option>
                  <option value="60">60 min</option>
                  <option value="90">90 min</option>
                  <option value="120">120 min</option>
                </select>
              </div>

              <div className="space-y-2">
                <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.2em] block">
                  Preço
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 text-[15px] font-medium">R$</span>
                  <input
                    type="text"
                    value={priceInput}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^\d.,]/g, '');
                      if (val.replace('.', '').replace(',', '').length <= MAX_PRICE_LENGTH) {
                        setPriceInput(val);
                      }
                    }}
                    placeholder="0,00"
                    className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3.5 text-[15px] text-white outline-none focus:border-[#D4AF37]/40 transition-all placeholder:text-zinc-600"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSubmit();
                    }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[400] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
            onClick={() => setConfirmDelete(null)}
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
                <p className="text-[14px] font-semibold text-white">Excluir serviço?</p>
                <p className="text-[12px] text-zinc-500 mt-1">Essa ação não pode ser desfeita.</p>
              </div>
              <div className="flex border-t border-white/[0.06]">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-3 text-[12px] font-medium text-zinc-500 hover:text-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <div className="w-px bg-white/[0.06]" />
                <button
                  onClick={() => confirmDelete && handleDelete(confirmDelete)}
                  disabled={deleting !== null}
                  className="flex-1 py-3 text-[12px] font-semibold text-red-500 hover:text-red-400 transition-colors cursor-pointer"
                >
                  {deleting ? 'Excluindo...' : 'Excluir'}
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

export default SettingsServicos;
