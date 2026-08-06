import { useState, useEffect, useCallback, useRef, type FC } from 'react';
import {
  Crown,
  Plus,
  Trash2,
  X,
  Check,
  Pencil,
  DollarSign,
  CalendarDays,
  ArrowLeft,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../../../hooks/useToast';
import ToastNotification from '../../Admin/shared/ToastNotification';
import {
  getAllMensalistaPlans,
  createMensalistaPlan,
  updateMensalistaPlan,
  deleteMensalistaPlan,
  getServices,
} from '../../../lib/api';
import { formatPricePublic } from '../../../lib/utils';
import type { MensalistaPlan, Service } from '../../../types';
import { logError } from '../../../lib/logger';

/* ─── Gerenciamento de Planos Mensalistas ───
 * UI premium com glassmorphism, micro-interações, responsivo mobile/desktop.
 * CRUD completo com formulário em bottom sheet (mobile) e modal (desktop). */

const DAY_LABELS: Record<number, string> = {
  0: 'Dom',
  1: 'Seg',
  2: 'Ter',
  3: 'Qua',
  4: 'Qui',
  5: 'Sex',
  6: 'Sáb',
};

/* ─── Staggered animation variants ─── */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, damping: 25, stiffness: 300 },
  },
};

/* ─── Main Component ─── */

const SettingsMensalista: FC = () => {
  const { toast, showSuccess, showError } = useToast();
  const [plans, setPlans] = useState<MensalistaPlan[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState<'list' | 'add' | 'edit'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [includedServiceIds, setIncludedServiceIds] = useState<string[]>([]);
  const [durationDays, setDurationDays] = useState('30');
  const [allowedDays, setAllowedDays] = useState<number[]>([1, 2, 3, 4, 5, 6]);

  const loadData = useCallback(async () => {
    try {
      const [plansData, servicesData] = await Promise.all([getAllMensalistaPlans(), getServices()]);
      setPlans(plansData);
      setServices(servicesData);
    } catch (e) {
      logError(e);
      showError('Erro ao carregar planos.');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  // Focus name input when form opens
  useEffect(() => {
    if ((screen === 'add' || screen === 'edit') && nameInputRef.current) {
      setTimeout(() => nameInputRef.current?.focus(), 300);
    }
  }, [screen]);

  const resetForm = () => {
    setName('');
    setPrice('');
    setIncludedServiceIds([]);
    setDurationDays('30');
    setAllowedDays([1, 2, 3, 4, 5, 6]);
    setEditingId(null);
  };

  const openAdd = () => {
    resetForm();
    setScreen('add');
  };

  const closeForm = () => {
    resetForm();
    setScreen('list');
  };

  const toggleService = (id: string) => {
    setIncludedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const toggleDay = (day: number) => {
    setAllowedDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  };

  const openEdit = (plan: MensalistaPlan) => {
    setName(plan.name);
    setPrice(String(plan.price));
    setIncludedServiceIds(plan.included_service_ids || []);
    setDurationDays(String(plan.duration_days || 30));
    setAllowedDays(plan.allowed_days || [1, 2, 3, 4, 5, 6]);
    setEditingId(plan.id);
    setScreen('edit');
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      showError('Informe o nome do plano.');
      return;
    }
    const priceVal = parseFloat(price.replace(',', '.'));
    if (isNaN(priceVal) || priceVal < 0) {
      showError('Informe um preço válido.');
      return;
    }
    const daysVal = parseInt(durationDays, 10);
    if (isNaN(daysVal) || daysVal < 1) {
      showError('Informe uma duração válida em dias.');
      return;
    }
    if (includedServiceIds.length === 0) {
      showError('Selecione pelo menos um serviço incluso.');
      return;
    }

    const payload = {
      name: trimmedName,
      price: priceVal,
      included_service_ids: includedServiceIds,
      duration_days: daysVal,
      allowed_days: allowedDays,
      is_active: true,
    };

    try {
      if (screen === 'add') {
        await createMensalistaPlan(payload);
        showSuccess('Plano criado!');
      } else if (screen === 'edit' && editingId) {
        await updateMensalistaPlan(editingId, payload);
        showSuccess('Plano atualizado!');
      }
      closeForm();
      loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar.';
      showError(msg);
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
      showError('Erro ao remover plano.');
    } finally {
      setDeleting(null);
      setConfirmDelete(null);
    }
  };

  const getServiceNames = (ids: string[]) => {
    return ids
      .map((id) => services.find((s) => s.id === id)?.name)
      .filter(Boolean)
      .join(', ');
  };

  const hasPrice = price.replace(',', '.').length > 0;

  // ── Loading Skeleton ──
  if (loading) {
    return (
      <div className="space-y-3 max-w-3xl">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-white/[0.02] rounded-2xl overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent animate-shimmer" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto lg:mx-0">
      {/* ── Premium Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between py-2"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold/20 to-gold/5 border border-gold/20 flex items-center justify-center">
              <Crown size={18} className="text-gold" />
            </div>
            <div>
              <h3 className="text-[18px] font-bold text-white tracking-tight">
                Planos Mensalistas
              </h3>
              <p className="text-[11px] text-zinc-500 flex items-center gap-1.5">
                {plans.length > 0 ? (
                  <>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gold/10 text-gold text-[10px] font-bold">
                      {plans.length} {plans.length === 1 ? 'plano' : 'planos'}
                    </span>
                    <span className="text-zinc-600">•</span>
                    <span>
                      {plans.reduce((s, p) => s + (p.included_service_ids?.length || 0), 0)}{' '}
                      serviços no total
                    </span>
                  </>
                ) : (
                  'Nenhum plano cadastrado'
                )}
              </p>
            </div>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={openAdd}
          className="btn-gold flex items-center gap-1.5 px-4 py-2.5 text-[12px] rounded-xl shadow-lg shadow-gold/10"
        >
          <Plus size={14} strokeWidth={2.5} />
          <span className="hidden sm:inline">Novo Plano</span>
          <span className="sm:hidden">Criar</span>
        </motion.button>
      </motion.div>

      {/* ── Empty State ── */}
      {plans.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="relative p-8 sm:p-12"
        >
          <div className="text-center max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-gold/10 border border-gold/15 flex items-center justify-center mx-auto mb-5">
              <Crown size={24} className="text-gold" />
            </div>
            <h4 className="text-[16px] font-bold text-white mb-1.5">Nenhum plano cadastrado</h4>
            <p className="text-[13px] text-zinc-500 leading-relaxed mb-6">
              Crie planos de assinatura mensal com serviços inclusos e preço fixo para seus clientes
              frequentes.
            </p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={openAdd}
              className="btn-gold inline-flex items-center gap-2 px-5 py-2.5 text-[12px] rounded-xl"
            >
              <Plus size={14} strokeWidth={2.5} />
              Criar primeiro plano
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* ── Plan Cards (Unified Mobile + Desktop) ── */}
      {plans.length > 0 && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-2"
        >
          {plans.map((plan) => {
            const inactive = !plan.is_active;
            const serviceCoverage = plan.included_service_ids?.length || 0;
            const serviceNames = getServiceNames(plan.included_service_ids || []);
            const showExtra = serviceNames.length > 40;

            return (
              <motion.div
                key={plan.id}
                variants={itemVariants}
                layout
                className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 ${
                  inactive
                    ? 'border-white/[0.04] bg-white/[0.01] opacity-60'
                    : 'border-white/[0.06] bg-gradient-to-b from-[#111] to-[#0D0D0D] hover:border-gold/20 hover:shadow-lg hover:shadow-gold/[0.03]'
                }`}
              >
                {/* Hover glow */}
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-gold/[0.02] rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="relative p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    {/* Left: Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gold/15 to-gold/5 border border-gold/15 flex items-center justify-center shrink-0">
                          <Crown size={15} className="text-gold" />
                        </div>
                        <h4 className="text-[15px] font-bold text-white tracking-tight truncate">
                          {plan.name}
                        </h4>
                        {plan.is_active ? (
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold uppercase tracking-wider border border-emerald-500/10">
                            Ativo
                          </span>
                        ) : (
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-zinc-500/10 text-zinc-500 font-bold uppercase tracking-wider">
                            Inativo
                          </span>
                        )}
                      </div>

                      {/* Price + Duration row */}
                      <div className="flex items-baseline gap-3 mt-2.5">
                        <span className="text-[22px] font-black text-gold tracking-tight">
                          {formatPricePublic(plan.price)}
                        </span>
                        <span className="text-[11px] text-zinc-600 font-medium">/mês</span>
                        <span className="text-[10px] text-zinc-600 flex items-center gap-1">
                          <Calendar size={10} />
                          {plan.duration_days} dias
                        </span>
                      </div>

                      {/* Services preview */}
                      <div className="mt-2.5 flex items-center gap-2">
                        <div className="flex -space-x-1.5">
                          {(plan.included_service_ids || []).slice(0, 4).map((sid) => {
                            const svc = services.find((s) => s.id === sid);
                            return (
                              <div
                                key={sid}
                                className="w-5 h-5 rounded-md bg-gold/10 border border-gold/20 flex items-center justify-center"
                                title={svc?.name || ''}
                              >
                                <span className="text-[7px] font-black text-gold uppercase">
                                  {svc?.name?.charAt(0) || '?'}
                                </span>
                              </div>
                            );
                          })}
                          {serviceCoverage > 4 && (
                            <div className="w-5 h-5 rounded-md bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                              <span className="text-[7px] font-bold text-zinc-500">
                                +{serviceCoverage - 4}
                              </span>
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] text-zinc-600 truncate">
                          {serviceCoverage > 0
                            ? `${showExtra ? serviceNames.substring(0, 40) + '...' : serviceNames}`
                            : 'Nenhum serviço incluso'}
                        </span>
                      </div>

                      {/* Days */}
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        {[0, 1, 2, 3, 4, 5, 6].map((day) => {
                          const active = plan.allowed_days?.includes(day);
                          return (
                            <span
                              key={day}
                              className={`text-[8px] font-bold px-1.5 py-0.5 rounded transition-all ${
                                active
                                  ? 'bg-gold/10 text-gold border border-gold/15'
                                  : 'bg-white/[0.02] text-zinc-700 border border-white/[0.03]'
                              }`}
                            >
                              {DAY_LABELS[day]}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-start gap-0.5 shrink-0 pt-0.5">
                      <IconButton
                        onClick={() => openEdit(plan)}
                        icon={<Pencil size={13} />}
                        label="Editar"
                      />
                      <IconButton
                        onClick={() => setConfirmDelete(plan.id)}
                        icon={<Trash2 size={13} />}
                        label="Excluir"
                        danger
                      />
                    </div>
                  </div>
                </div>

                {/* Bottom gold accent line */}
                {plan.is_active && (
                  <div className="absolute bottom-0 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
                )}
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* ── Form (Bottom Sheet Mobile / Modal Desktop) ── */}
      <PlanFormModal
        screen={screen}
        onClose={closeForm}
        onSave={handleSave}
        name={name}
        setName={setName}
        price={price}
        setPrice={setPrice}
        includedServiceIds={includedServiceIds}
        toggleService={toggleService}
        services={services}
        durationDays={durationDays}
        setDurationDays={setDurationDays}
        allowedDays={allowedDays}
        toggleDay={toggleDay}
        DAY_LABELS={DAY_LABELS}
        nameInputRef={nameInputRef}
        editingId={editingId}
        hasPrice={hasPrice}
      />

      {/* ── Delete Confirmation ── */}
      <DeleteModal
        confirmDelete={confirmDelete}
        deleting={deleting}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        planName={plans.find((p) => p.id === confirmDelete)?.name || ''}
      />

      <ToastNotification toast={toast} />
    </div>
  );
};

/* ─── Sub-components ─── */

/** Icon button with hover effect */
const IconButton: FC<{
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
}> = ({ onClick, icon, label, danger }) => (
  <motion.button
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.9 }}
    onClick={onClick}
    className={`p-2 rounded-lg transition-colors cursor-pointer ${
      danger
        ? 'text-zinc-500 hover:text-red-400 hover:bg-red-500/10'
        : 'text-zinc-500 hover:text-white hover:bg-white/[0.06]'
    }`}
    title={label}
    aria-label={label}
  >
    {icon}
  </motion.button>
);

/* ─── Form Fields ─── */

interface PlanFormFieldsProps {
  name: string;
  setName: (v: string) => void;
  price: string;
  setPrice: (v: string) => void;
  includedServiceIds: string[];
  toggleService: (id: string) => void;
  services: Service[];
  durationDays: string;
  setDurationDays: (v: string) => void;
  allowedDays: number[];
  toggleDay: (day: number) => void;
  DAY_LABELS: Record<number, string>;
  nameInputRef: React.RefObject<HTMLInputElement | null>;
  editingId: string | null;
  hasPrice: boolean;
}

const PlanFormFields: FC<PlanFormFieldsProps> = ({
  name,
  setName,
  price,
  setPrice,
  includedServiceIds,
  toggleService,
  services,
  durationDays,
  setDurationDays,
  allowedDays,
  toggleDay,
  DAY_LABELS: labels,
  nameInputRef,
  editingId,
  hasPrice,
}) => (
  <div className="space-y-5">
    {/* Nome do plano */}
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
        <Crown size={12} className="text-gold" />
        Nome do Plano
      </label>
      <input
        ref={nameInputRef}
        type="text"
        placeholder="Ex: Corte Black Premium"
        className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-zinc-700 outline-none focus:border-gold/30 focus:bg-white/[0.05] transition-all duration-200"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
    </div>

    {/* Preço + Duração */}
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
          <DollarSign size={11} className="text-gold" />
          Preço Mensal
        </label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 text-sm font-medium">
            R$
          </span>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl pl-9 pr-4 py-3.5 text-sm text-white placeholder:text-zinc-700 outline-none focus:border-gold/30 focus:bg-white/[0.05] transition-all duration-200"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
          <Calendar size={11} className="text-gold" />
          Duração
        </label>
        <div className="relative">
          <input
            type="number"
            min="1"
            max="365"
            placeholder="30"
            className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-zinc-700 outline-none focus:border-gold/30 focus:bg-white/[0.05] transition-all duration-200"
            value={durationDays}
            onChange={(e) => setDurationDays(e.target.value)}
          />
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-600 text-[10px] font-medium">
            dias
          </span>
        </div>
      </div>
    </div>

    {/* Price preview */}
    {hasPrice && name.trim() && (
      <div className="px-4 py-3 bg-gold/[0.04] border border-gold/10 rounded-xl">
        <p className="text-[11px] text-zinc-500">
          {editingId ? 'Plano atualizado' : 'Novo plano'}:{' '}
          <span className="text-white font-bold">{name.trim()}</span>
        </p>
        <p className="text-[20px] font-black text-gold mt-0.5">
          {formatPricePublic(parseFloat(price.replace(',', '.')) || 0)}
          <span className="text-[11px] font-medium text-zinc-500">/mês · {durationDays} dias</span>
        </p>
      </div>
    )}

    {/* Dias permitidos */}
    <div className="space-y-2">
      <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
        <CalendarDays size={11} className="text-gold" />
        Dias Permitidos
      </label>
      <p className="text-[10px] text-zinc-600 -mt-1">
        Dias da semana que o mensalista pode agendar
      </p>
      <div className="grid grid-cols-7 gap-1.5">
        {[0, 1, 2, 3, 4, 5, 6].map((day) => {
          const active = allowedDays.includes(day);
          return (
            <motion.button
              key={day}
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={() => toggleDay(day)}
              className={`py-2.5 rounded-xl text-[11px] font-bold transition-all duration-200 cursor-pointer ${
                active
                  ? 'bg-gradient-to-b from-gold/20 to-gold/10 text-gold border border-gold/25 shadow-sm shadow-gold/5'
                  : 'bg-white/[0.02] text-zinc-500 border border-white/[0.04] hover:border-white/[0.08] hover:text-zinc-300'
              }`}
            >
              {labels[day]}
            </motion.button>
          );
        })}
      </div>
    </div>

    {/* Serviços inclusos */}
    <div className="space-y-2">
      <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
        <Check size={11} className="text-gold" />
        Serviços Inclusos
      </label>
      <p className="text-[10px] text-zinc-600 -mt-1">
        Selecione os serviços que o mensalista agenda sem pagar
      </p>
      <div className="space-y-1 max-h-52 overflow-y-auto rounded-xl border border-white/[0.04] bg-white/[0.01] p-1.5 scrollbar-thin">
        {services.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-[12px] text-zinc-600">Nenhum serviço cadastrado</p>
            <p className="text-[10px] text-zinc-700 mt-1">
              Crie serviços nas Configurações &gt; Serviços
            </p>
          </div>
        ) : (
          services.map((service) => {
            const selected = includedServiceIds.includes(service.id);
            return (
              <motion.button
                key={service.id}
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => toggleService(service.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-lg transition-all duration-200 cursor-pointer ${
                  selected
                    ? 'bg-gold/10 text-gold border border-gold/15'
                    : 'hover:bg-white/[0.03] text-zinc-400 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0 ${
                      selected
                        ? 'bg-gold border-gold shadow-sm shadow-gold/20'
                        : 'border-white/15 group-hover:border-white/30'
                    }`}
                  >
                    {selected && <Check size={11} className="text-black" strokeWidth={3} />}
                  </div>
                  <span className="text-[13px] font-medium truncate">{service.name}</span>
                </div>
                <span className="text-[12px] font-semibold tabular-nums shrink-0 ml-2">
                  {formatPricePublic(service.price)}
                </span>
              </motion.button>
            );
          })
        )}
      </div>
    </div>
  </div>
);

/* ─── Form Modal ─── */

const PlanFormModal: FC<
  PlanFormFieldsProps & {
    screen: string;
    onClose: () => void;
    onSave: () => void;
  }
> = ({ screen, onClose, onSave, ...fields }) => {
  const { name, editingId, hasPrice } = fields;
  const isValid = name.trim().length >= 2 && hasPrice && fields.includedServiceIds.length > 0;

  return (
    <AnimatePresence>
      {(screen === 'add' || screen === 'edit') && (
        <>
          {/* Mobile: Bottom Sheet */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-sm lg:hidden"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[301] bg-[#0A0A0A] border-t border-white/[0.06] rounded-t-3xl lg:hidden max-h-[92vh] flex flex-col"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-zinc-600" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 h-12 shrink-0">
              <button
                onClick={onClose}
                className="text-zinc-400 hover:text-white transition-colors cursor-pointer p-1"
                aria-label="Cancelar"
              >
                <ArrowLeft size={20} />
              </button>
              <span className="text-[15px] font-bold text-white">
                {screen === 'add' ? 'Novo Plano' : 'Editar Plano'}
              </span>
              <motion.button
                whileTap={isValid ? { scale: 0.9 } : {}}
                onClick={onSave}
                disabled={!isValid}
                className={`p-1 transition-colors cursor-pointer ${
                  isValid ? 'text-gold' : 'text-zinc-600'
                }`}
                aria-label="Salvar"
              >
                <Check size={22} strokeWidth={2.5} />
              </motion.button>
            </div>

            {/* Scrollable form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (isValid) onSave();
              }}
              className="flex-1 overflow-y-auto px-5 pb-8 space-y-4 scrollbar-hide"
            >
              <PlanFormFields {...fields} />
            </form>
          </motion.div>

          {/* Desktop: Centered Modal */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="hidden lg:flex fixed inset-0 z-[300] bg-black/70 backdrop-blur-sm items-center justify-center p-4"
            onClick={onClose}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 10 }}
              transition={{ type: 'spring', damping: 28, stiffness: 350 }}
              className="w-full max-w-lg bg-gradient-to-b from-[#141414] to-[#0F0F0F] border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl shadow-black/50"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 h-14 border-b border-white/[0.06]">
                <button
                  onClick={onClose}
                  className="text-zinc-400 hover:text-white transition-colors cursor-pointer p-1"
                >
                  <X size={18} />
                </button>
                <div className="flex items-center gap-2">
                  <Crown size={14} className="text-gold" />
                  <span className="text-[14px] font-semibold text-white">
                    {screen === 'add' ? 'Novo Plano Mensalista' : 'Editar Plano'}
                  </span>
                </div>
                <button
                  onClick={onSave}
                  disabled={!isValid}
                  className={`text-[13px] font-bold transition-all cursor-pointer px-4 py-1.5 rounded-lg ${
                    isValid
                      ? 'bg-gold text-black hover:bg-[#b8962e]'
                      : 'bg-white/[0.04] text-zinc-600 cursor-not-allowed'
                  }`}
                >
                  {editingId ? 'Salvar' : 'Criar'}
                </button>
              </div>

              {/* Form body */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (isValid) onSave();
                }}
                className="p-6 space-y-4 max-h-[70vh] overflow-y-auto scrollbar-hide"
              >
                <PlanFormFields {...fields} />
              </form>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

/* ─── Delete Confirmation Modal ─── */

const DeleteModal: FC<{
  confirmDelete: string | null;
  deleting: string | null;
  onCancel: () => void;
  onConfirm: () => void;
  planName: string;
}> = ({ confirmDelete, deleting, onCancel, onConfirm, planName }) => (
  <AnimatePresence>
    {confirmDelete && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[400] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center"
        onClick={onCancel}
      >
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 350 }}
          className="w-full sm:max-w-sm bg-gradient-to-b from-[#141414] to-[#0F0F0F] sm:rounded-xl rounded-t-2xl overflow-hidden border border-white/[0.06] shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Icon area */}
          <div className="px-6 pt-6 pb-4 text-center sm:text-left">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto sm:mx-0 mb-4">
              <AlertTriangle size={22} className="text-red-400" />
            </div>
            <p className="text-[15px] font-bold text-white text-center sm:text-left">
              Excluir plano?
            </p>
            <p className="text-[12px] text-zinc-500 mt-1.5 text-center sm:text-left leading-relaxed">
              O plano <span className="text-zinc-300 font-semibold">{planName}</span> será removido
              permanentemente. Clientes vinculados perderão o status de mensalista.
            </p>
          </div>

          {/* Actions */}
          <div className="flex border-t border-white/[0.06]">
            <button
              onClick={onCancel}
              className="flex-1 py-3.5 text-[12px] font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer active:bg-white/[0.02]"
            >
              Cancelar
            </button>
            <div className="w-px bg-white/[0.06]" />
            <button
              onClick={onConfirm}
              disabled={deleting !== null}
              className="flex-1 py-3.5 text-[12px] font-semibold text-red-400 hover:text-red-300 transition-colors cursor-pointer active:bg-red-500/5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting ? (
                <span className="flex items-center justify-center gap-1.5">
                  <span className="w-3 h-3 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                  Excluindo...
                </span>
              ) : (
                'Sim, excluir'
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

export default SettingsMensalista;
