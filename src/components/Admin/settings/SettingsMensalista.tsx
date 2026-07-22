import { useState, useEffect, useRef, useCallback, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../../hooks/useToast';
import { useMensalistaDashboard } from '../../../hooks/useMensalistaDashboard';
import ToastNotification from '../shared/ToastNotification';
import {
  getMensalistaPlans,
  createMensalistaPlan,
  updateMensalistaPlan,
  deleteMensalistaPlan,
  getMensalistaEnabled,
  setMensalistaEnabled,
  getServices,
} from '../../../lib/api';

import { motion, AnimatePresence } from 'framer-motion';
import type { MensalistaPlan, Service } from '../../../types';
import MensalistaToggle from './MensalistaToggle';
import PlanListView from './PlanListView';
import MensalistaPlanForm from './MensalistaPlanForm';
import MensalistaDashboard from './MensalistaDashboard';
import { logError } from '../../../lib/logger';

const MAX_PLANS = 10;
const MAX_NAME_LENGTH = 30;

const SettingsMensalista: FC = () => {
  const { toast, showSuccess, showError } = useToast();
  const navigate = useNavigate();
  const dashboard = useMensalistaDashboard();
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
  const [allowedDays, setAllowedDays] = useState<number[]>([1, 2, 3, 4, 5]); // Seg-Sex por padrão
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
    } catch (e) {
      logError(e);
      showError('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    } catch (e) {
      logError(e);
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

  const toggleDay = (day: number) => {
    setAllowedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
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
    if (allowedDays.length === 0) {
      showError('Selecione pelo menos um dia');
      return;
    }
    if (plans.length >= MAX_PLANS) {
      showError(`Máximo ${MAX_PLANS} planos`);
      return;
    }

    try {
      await createMensalistaPlan({
        name,
        price,
        included_service_ids: selectedServiceIds,
        allowed_days: allowedDays,
      });
      showSuccess('Plano criado!');
      closeForm();
      loadData();
    } catch (e) {
      logError(e);
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
    if (allowedDays.length === 0) {
      showError('Selecione pelo menos um dia');
      return;
    }

    try {
      await updateMensalistaPlan(editingId, {
        name,
        price,
        included_service_ids: selectedServiceIds,
        allowed_days: allowedDays,
      });
      showSuccess('Plano atualizado!');
      closeForm();
      loadData();
    } catch (e) {
      logError(e);
      showError('Erro ao atualizar');
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await deleteMensalistaPlan(id);
      showSuccess('Plano removido!');
      setPlans((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      logError(e);
      showError('Erro ao remover');
    } finally {
      setDeleting(null);
      setConfirmDelete(null);
    }
  };

  const openAdd = () => {
    setNameInput('');
    setPriceInput('');
    setSelectedServiceIds([]);
    setAllowedDays([1, 2, 3, 4, 5]); // Seg-Sex por padrão
    setEditingId(null);
    setScreen('add');
  };

  const openEdit = (plan: MensalistaPlan) => {
    setNameInput(plan.name);
    setPriceInput(String(plan.price));
    setSelectedServiceIds(plan.included_service_ids || []);
    setAllowedDays(plan.allowed_days || [1, 2, 3, 4, 5]);
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
      <MensalistaDashboard
        data={dashboard}
        onSelectClient={(client) =>
          navigate(
            `/admin/clients?phone=${encodeURIComponent(client.phone)}&name=${encodeURIComponent(client.name)}`
          )
        }
      />

      <MensalistaToggle
        enabled={enabled}
        toggling={togglingEnabled}
        onToggle={handleToggleEnabled}
      />
      <PlanListView
        plans={plans}
        services={services}
        maxPlans={MAX_PLANS}
        enabled={enabled}
        onEdit={openEdit}
        onDelete={(id) => setConfirmDelete(id)}
        onAdd={openAdd}
      />

      <MensalistaPlanForm
        isOpen={screen === 'add' || screen === 'edit'}
        screen={screen}
        nameInput={nameInput}
        priceInput={priceInput}
        selectedServiceIds={selectedServiceIds}
        allowedDays={allowedDays}
        services={services}
        nameInputRef={nameInputRef}
        onNameChange={setNameInput}
        onPriceChange={setPriceInput}
        onToggleService={toggleService}
        onToggleDay={toggleDay}
        onSubmit={handleSubmit}
        onClose={closeForm}
      />

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
