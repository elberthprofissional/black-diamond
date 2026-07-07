import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '../../../hooks/useToast';
import ToastNotification from '../shared/ToastNotification';
import {
  getMensalistaPlans,
  createMensalistaPlan,
  updateMensalistaPlan,
  deleteMensalistaPlan,
  toggleMensalistaPlan,
  getMensalistaEnabled,
  setMensalistaEnabled,
  getServices,
} from '../../../lib/api';
import { Plus, Trash2, X, Check, Pencil, Crown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { MensalistaPlan, Service } from '../../../types';

const MAX_PLANS = 10;
const MAX_NAME_LENGTH = 30;
const MAX_PRICE_LENGTH = 6;

interface PlanFormFieldsProps {
  nameInput: string;
  setNameInput: (v: string) => void;
  priceInput: string;
  setPriceInput: (v: string) => void;
  selectedServiceIds: string[];
  toggleService: (id: string) => void;
  services: Service[];
  nameInputRef: React.RefObject<HTMLInputElement | null>;
  onSubmit: () => void;
}

const PlanFormFields: React.FC<PlanFormFieldsProps> = ({
  nameInput,
  setNameInput,
  priceInput,
  setPriceInput,
  selectedServiceIds,
  toggleService,
  services,
  nameInputRef,
  onSubmit,
}) => (
  <>
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
          Nome do plano
        </span>
        <span className="text-[11px] text-zinc-600 tabular-nums">
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
        placeholder="Ex: Plano Black"
        maxLength={MAX_NAME_LENGTH}
        className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3.5 text-[15px] text-white outline-none focus:border-[#C5A059]/50 focus:ring-1 focus:ring-[#C5A059]/20 transition-all placeholder:text-zinc-600"
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSubmit();
        }}
      />
    </div>

    <div className="space-y-2">
      <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
        Preço mensal
      </span>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-[15px] font-medium">
          R$
        </span>
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
          className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3.5 text-[15px] text-white outline-none focus:border-[#C5A059]/50 focus:ring-1 focus:ring-[#C5A059]/20 transition-all placeholder:text-zinc-600"
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSubmit();
          }}
        />
      </div>
    </div>

    <div className="space-y-3">
      <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
        Serviços inclusos
      </span>
      <p className="text-[12px] text-zinc-500 -mt-1">
        O que o mensalista pode usar sem pagar à parte.
      </p>
      <div className="space-y-1">
        {services.map((service) => {
          const selected = selectedServiceIds.includes(service.id);
          return (
            <button
              key={service.id}
              onClick={() => toggleService(service.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all cursor-pointer rounded-xl border ${
                selected
                  ? 'bg-[#C5A059]/[0.08] border-[#C5A059]/30'
                  : 'bg-white/[0.02] border-transparent hover:bg-white/[0.04]'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-md border-[1.5px] flex items-center justify-center transition-all shrink-0 ${
                  selected ? 'border-[#C5A059] bg-[#C5A059]' : 'border-white/20'
                }`}
              >
                {selected && <Check size={11} className="text-white stroke-[3]" />}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-[13px] font-medium ${selected ? 'text-[#C5A059]' : 'text-zinc-200'}`}
                >
                  {service.name}
                </p>
              </div>
              <span
                className={`text-[12px] font-semibold tabular-nums ${selected ? 'text-[#C5A059]' : 'text-zinc-500'}`}
              >
                R$ {Number(service.price).toFixed(0)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  </>
);

const SettingsMensalista: React.FC = () => {
  const { toast, showSuccess, showError } = useToast();
  const [plans, setPlans] = useState<MensalistaPlan[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(true);
  const [togglingEnabled, setTogglingEnabled] = useState(false);
  const [screen, setScreen] = useState<'list' | 'add' | 'edit'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [nameInput, setNameInput] = useState('');
  const [priceInput, setPriceInput] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    try {
      const [plansData, servicesData, enabledData] = await Promise.all([
        getMensalistaPlans(),
        getServices(),
        getMensalistaEnabled(),
      ]);
      setPlans(plansData);
      setServices(servicesData);
      setEnabled(enabledData);
    } catch {
      showError('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if ((screen === 'add' || screen === 'edit') && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [screen]);

  const handleToggleEnabled = async () => {
    setTogglingEnabled(true);
    try {
      const newValue = !enabled;
      await setMensalistaEnabled(newValue);
      setEnabled(newValue);
      showSuccess(newValue ? 'Sistema ativado' : 'Sistema desativado');
    } catch {
      showError('Erro ao alterar');
    } finally {
      setTogglingEnabled(false);
    }
  };

  const toggleService = (id: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleAdd = async () => {
    const name = nameInput.trim();
    const price = parseFloat(priceInput.replace(',', '.'));
    if (!name) {
      showError('Nome obrigatório');
      return;
    }
    if (name.length > MAX_NAME_LENGTH) {
      showError(`Máximo ${MAX_NAME_LENGTH} caracteres`);
      return;
    }
    if (!priceInput || isNaN(price) || price <= 0) {
      showError('Preço inválido');
      return;
    }
    if (price < 5) {
      showError('Mínimo R$ 5,00');
      return;
    }
    if (selectedServiceIds.length === 0) {
      showError('Selecione um serviço');
      return;
    }
    if (plans.length >= MAX_PLANS) {
      showError(`Máximo ${MAX_PLANS} planos`);
      return;
    }

    try {
      await createMensalistaPlan({ name, price, included_service_ids: selectedServiceIds });
      showSuccess('Plano criado!');
      closeForm();
      loadData();
    } catch {
      showError('Erro ao criar');
    }
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    const name = nameInput.trim();
    const price = parseFloat(priceInput.replace(',', '.'));
    if (!name || name.length > MAX_NAME_LENGTH) {
      showError('Nome inválido');
      return;
    }
    if (!priceInput || isNaN(price) || price <= 0) {
      showError('Preço inválido');
      return;
    }
    if (price < 5) {
      showError('Mínimo R$ 5,00');
      return;
    }
    if (selectedServiceIds.length === 0) {
      showError('Selecione um serviço');
      return;
    }

    try {
      await updateMensalistaPlan(editingId, {
        name,
        price,
        included_service_ids: selectedServiceIds,
      });
      showSuccess('Plano atualizado!');
      closeForm();
      loadData();
    } catch {
      showError('Erro ao atualizar');
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await deleteMensalistaPlan(id);
      showSuccess('Plano removido!');
      setPlans((prev) => prev.filter((p) => p.id !== id));
    } catch {
      showError('Erro ao remover');
    } finally {
      setDeleting(null);
      setConfirmDelete(null);
    }
  };

  const handleToggleActive = async (plan: MensalistaPlan) => {
    try {
      await toggleMensalistaPlan(plan.id, !plan.is_active);
      setPlans((prev) =>
        prev.map((p) => (p.id === plan.id ? { ...p, is_active: !p.is_active } : p))
      );
    } catch {
      showError('Erro ao alterar');
    }
  };

  const openAdd = () => {
    setNameInput('');
    setPriceInput('');
    setSelectedServiceIds([]);
    setEditingId(null);
    setScreen('add');
  };

  const openEdit = (plan: MensalistaPlan) => {
    setNameInput(plan.name);
    setPriceInput(String(plan.price));
    setSelectedServiceIds(plan.included_service_ids || []);
    setEditingId(plan.id);
    setScreen('edit');
  };

  const closeForm = () => {
    setNameInput('');
    setPriceInput('');
    setSelectedServiceIds([]);
    setEditingId(null);
    setScreen('list');
  };

  const handleSubmit = () => {
    if (screen === 'add') handleAdd();
    else if (screen === 'edit') handleUpdate();
  };

  const getServiceName = (id: string) => services.find((s) => s.id === id)?.name || '?';

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-20 bg-white/[0.02] rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto lg:mx-0">
      {/* Toggle */}
      <div className="hidden lg:flex items-center justify-between py-2">
        <div>
          <h3 className="text-[14px] font-semibold text-white">Sistema de Mensalista</h3>
          <p className="text-[12px] text-zinc-500 mt-0.5">
            {enabled ? 'Planos visíveis para clientes' : 'Oculto na página e no agendamento'}
          </p>
        </div>
        <button
          onClick={handleToggleEnabled}
          disabled={togglingEnabled}
          className={`relative w-12 h-7 rounded-full transition-colors cursor-pointer disabled:opacity-50 ${
            enabled ? 'bg-[#C5A059]' : 'bg-zinc-700'
          }`}
        >
          <motion.div
            className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-md"
            animate={{ left: enabled ? 26 : 4 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        </button>
      </div>

      {/* Toggle Mobile */}
      <div className="lg:hidden border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                enabled ? 'bg-[#C5A059]/15' : 'bg-white/[0.04]'
              }`}
            >
              <Crown size={18} className={enabled ? 'text-[#C5A059]' : 'text-zinc-600'} />
            </div>
            <h3 className="text-[14px] font-semibold text-white">Sistema de Mensalista</h3>
          </div>
          <button
            onClick={handleToggleEnabled}
            disabled={togglingEnabled}
            className={`relative w-12 h-7 rounded-full transition-colors cursor-pointer disabled:opacity-50 ${
              enabled ? 'bg-[#C5A059]' : 'bg-zinc-700'
            }`}
          >
            <motion.div
              className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-md"
              animate={{ left: enabled ? 26 : 4 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </button>
        </div>
      </div>

      {/* Plans */}
      <div
        className={`space-y-4 transition-opacity ${enabled ? '' : 'opacity-30 pointer-events-none'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white text-[15px] font-semibold">Planos cadastrados</h3>
            <p className="text-zinc-500 text-[12px] mt-0.5">
              {plans.length} de {MAX_PLANS}
            </p>
          </div>
          <button
            onClick={openAdd}
            disabled={plans.length >= MAX_PLANS}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#C5A059] text-black font-semibold text-[12px] rounded-lg hover:bg-[#A68233] transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Plus size={14} strokeWidth={2.5} />
            Adicionar
          </button>
        </div>

        {/* Empty State */}
        {plans.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-zinc-600 text-[13px]">Nenhum plano cadastrado</p>
          </div>
        )}

        {/* Desktop List */}
        {plans.length > 0 && (
          <div className="hidden lg:block border-t border-white/[0.06]">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`flex items-center justify-between py-4 border-b border-white/[0.04] hover:bg-white/[0.02] transition-all duration-200 px-2 -mx-2 rounded-lg ${
                  !plan.is_active ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      plan.is_active ? 'bg-[#C5A059]/10' : 'bg-white/[0.04]'
                    }`}
                  >
                    <Crown
                      size={14}
                      className={plan.is_active ? 'text-[#C5A059]' : 'text-zinc-600'}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-semibold text-white truncate">
                        {plan.name}
                      </span>
                      {plan.is_default && (
                        <span className="text-[8px] font-bold text-[#C5A059] bg-[#C5A059]/10 px-1.5 py-0.5 rounded uppercase">
                          Default
                        </span>
                      )}
                      {!plan.is_active && (
                        <span className="text-[8px] font-bold text-zinc-500 bg-white/[0.04] px-1.5 py-0.5 rounded uppercase">
                          Inativo
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[12px] text-[#C5A059] font-medium">
                        R${' '}
                        {Number(plan.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        /mês
                      </span>
                      {plan.included_service_ids && plan.included_service_ids.length > 0 && (
                        <span className="text-[10px] text-zinc-500">
                          {plan.included_service_ids.map((sid) => getServiceName(sid)).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleToggleActive(plan)}
                    className="px-2 py-1 text-[10px] font-medium rounded-lg transition-all cursor-pointer hover:bg-white/[0.06]"
                    title={plan.is_active ? 'Desativar' : 'Ativar'}
                  >
                    {plan.is_active ? (
                      <span className="text-[#C5A059]">●</span>
                    ) : (
                      <span className="text-zinc-600">○</span>
                    )}
                  </button>
                  <button
                    onClick={() => openEdit(plan)}
                    className="p-2 hover:bg-white/[0.06] rounded-lg transition-all cursor-pointer"
                    title="Editar"
                  >
                    <Pencil
                      size={14}
                      className="text-zinc-500 hover:text-white transition-colors"
                    />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(plan.id)}
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

        {/* Mobile Cards */}
        {plans.length > 0 && (
          <div className="lg:hidden border border-white/[0.04] rounded-2xl overflow-hidden">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`px-5 py-4 border-t border-white/[0.04] ${!plan.is_active ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        plan.is_active ? 'bg-[#C5A059]/10' : 'bg-white/[0.04]'
                      }`}
                    >
                      <Crown
                        size={14}
                        className={plan.is_active ? 'text-[#C5A059]' : 'text-zinc-600'}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[13px] text-white font-medium truncate">{plan.name}</p>
                        {plan.is_default && (
                          <span className="text-[7px] font-bold text-[#C5A059] bg-[#C5A059]/10 px-1 py-0.5 rounded uppercase shrink-0">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#C5A059] font-medium">
                        R${' '}
                        {Number(plan.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        /mês
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleActive(plan)}
                      className="p-1.5 hover:bg-white/[0.06] rounded-lg transition-all cursor-pointer"
                    >
                      {plan.is_active ? (
                        <span className="text-[#C5A059] text-[10px]">●</span>
                      ) : (
                        <span className="text-zinc-600 text-[10px]">○</span>
                      )}
                    </button>
                    <button
                      onClick={() => openEdit(plan)}
                      className="px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.1] text-zinc-400 text-[10px] font-medium rounded-lg transition-all cursor-pointer"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => setConfirmDelete(plan.id)}
                      className="p-2 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                    >
                      <Trash2 size={14} className="text-zinc-500 hover:text-red-400" />
                    </button>
                  </div>
                </div>
                {plan.included_service_ids && plan.included_service_ids.length > 0 && (
                  <div className="mt-2 ml-11 flex flex-wrap gap-1">
                    {plan.included_service_ids.map((sid) => (
                      <span
                        key={sid}
                        className="text-[9px] font-medium text-zinc-500 bg-white/[0.04] px-1.5 py-0.5 rounded"
                      >
                        {getServiceName(sid)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit - Mobile: Full Screen / Desktop: Modal */}
      <AnimatePresence>
        {(screen === 'add' || screen === 'edit') && (
          <>
            {/* Mobile */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-0 z-[300] bg-[#0A0A0A] lg:hidden"
            >
              <div className="flex items-center justify-between px-4 h-14 border-b border-white/[0.06]">
                <button
                  onClick={closeForm}
                  className="text-zinc-400 hover:text-white cursor-pointer"
                >
                  <X size={22} />
                </button>
                <span className="text-[15px] font-bold text-white">
                  {screen === 'add' ? 'Novo Plano' : 'Editar Plano'}
                </span>
                <button
                  onClick={handleSubmit}
                  className="text-[#C5A059] font-bold text-[15px] cursor-pointer"
                >
                  <Check size={22} />
                </button>
              </div>
              <div className="p-5 space-y-5 overflow-y-auto max-h-[calc(100vh-56px)]">
                <PlanFormFields
                  nameInput={nameInput}
                  setNameInput={setNameInput}
                  priceInput={priceInput}
                  setPriceInput={setPriceInput}
                  selectedServiceIds={selectedServiceIds}
                  toggleService={toggleService}
                  services={services}
                  nameInputRef={nameInputRef}
                  onSubmit={handleSubmit}
                />
              </div>
            </motion.div>

            {/* Desktop Modal */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="hidden lg:flex fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm items-center justify-center p-4"
              onClick={closeForm}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                className="w-full max-w-lg bg-[#141414] border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-5 h-14 border-b border-white/[0.06]">
                  <button
                    onClick={closeForm}
                    className="text-zinc-400 hover:text-white cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                  <span className="text-[14px] font-semibold text-white">
                    {screen === 'add' ? 'Novo Plano' : 'Editar Plano'}
                  </span>
                  <button
                    onClick={handleSubmit}
                    className="text-[#C5A059] font-semibold text-[14px] cursor-pointer"
                  >
                    Salvar
                  </button>
                </div>
                <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
                  <PlanFormFields
                    nameInput={nameInput}
                    setNameInput={setNameInput}
                    priceInput={priceInput}
                    setPriceInput={setPriceInput}
                    selectedServiceIds={selectedServiceIds}
                    toggleService={toggleService}
                    services={services}
                    nameInputRef={nameInputRef}
                    onSubmit={handleSubmit}
                  />
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
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
                <p className="text-[14px] font-semibold text-white">Excluir plano?</p>
                <p className="text-[12px] text-zinc-500 mt-1">
                  Clientes vinculados perderão o plano.
                </p>
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

export default SettingsMensalista;
