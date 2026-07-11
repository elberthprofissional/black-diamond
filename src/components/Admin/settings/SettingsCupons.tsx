import { useState, useEffect, useRef, type FC } from 'react';
import {
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getServices,
} from '../../../lib/api';
import { useToast } from '../../../hooks/useToast';
import ToastNotification from '../shared/ToastNotification';
import { Tag, Plus, Trash2, X, Check, Pencil, DollarSign, Gift, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Coupon, Service } from '../../../types';

const MAX_CODE_LENGTH = 20;

const DISCOUNT_TYPES = [
  { value: 'fixed', label: 'Valor (R$)', icon: DollarSign },
  { value: 'free', label: 'Serviço Grátis', icon: Gift },
] as const;

const SettingsCupons: FC = () => {
  const { toast, showSuccess, showError } = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState<'list' | 'add' | 'edit'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);

  // Form state — simplificado
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'fixed' | 'free'>('fixed');
  const [discountValue, setDiscountValue] = useState('');
  const [applicableServiceIds, setApplicableServiceIds] = useState<string[]>([]);

  const loadData = async () => {
    try {
      const [couponsData, servicesData] = await Promise.all([getCoupons(), getServices()]);
      setCoupons(couponsData);
      setServices(servicesData);
    } catch {
      showError('Erro ao carregar cupons.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if ((screen === 'add' || screen === 'edit') && codeInputRef.current) {
      codeInputRef.current.focus();
    }
  }, [screen]);

  const resetForm = () => {
    setCode('');
    setDiscountType('fixed');
    setDiscountValue('');
    setApplicableServiceIds([]);
    setEditingId(null);
  };

  const openAdd = () => {
    resetForm();
    setScreen('add');
  };

  const openEdit = (coupon: Coupon) => {
    setCode(coupon.code);
    setDiscountType(coupon.discount_type === 'percentage' ? 'fixed' : coupon.discount_type);
    setDiscountValue(coupon.discount_type === 'free' ? '' : String(coupon.discount_value));
    setApplicableServiceIds(coupon.applicable_service_ids || []);
    setEditingId(coupon.id);
    setScreen('edit');
  };

  const closeForm = () => {
    resetForm();
    setScreen('list');
  };

  const toggleService = (id: string) => {
    setApplicableServiceIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedCode) {
      showError('Informe o código do cupom.');
      return;
    }
    if (trimmedCode.length > MAX_CODE_LENGTH) {
      showError(`Máximo ${MAX_CODE_LENGTH} caracteres.`);
      return;
    }
    if (discountType === 'fixed') {
      const val = parseFloat(discountValue.replace(',', '.'));
      if (isNaN(val) || val <= 0) {
        showError('Informe um valor de desconto válido.');
        return;
      }
    }

    const payload = {
      code: trimmedCode,
      description: '',
      discount_type: discountType,
      discount_value: discountType === 'free' ? 0 : parseFloat(discountValue.replace(',', '.')),
      valid_from: new Date().toISOString().split('T')[0],
      valid_until: null,
      max_uses: null,
      is_active: true,
      applicable_service_ids: applicableServiceIds,
    };

    try {
      if (screen === 'add') {
        await createCoupon(payload);
        showSuccess('Cupom criado!');
      } else if (screen === 'edit' && editingId) {
        await updateCoupon(editingId, payload);
        showSuccess('Cupom atualizado!');
      }
      closeForm();
      loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar.';
      if (msg.includes('duplicate') || msg.includes('unique')) {
        showError('Já existe um cupom com esse código.');
      } else {
        showError(msg);
      }
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await deleteCoupon(id);
      showSuccess('Cupom removido!');
      setCoupons((prev) => prev.filter((c) => c.id !== id));
    } catch {
      showError('Erro ao remover cupom.');
    } finally {
      setDeleting(null);
      setConfirmDelete(null);
    }
  };

  const copyCode = (couponCode: string) => {
    navigator.clipboard.writeText(couponCode).then(() => {
      showSuccess(`Código "${couponCode}" copiado!`);
    });
  };

  const isExpired = (coupon: Coupon) =>
    coupon.valid_until && new Date(coupon.valid_until) < new Date();

  const isMaxed = (coupon: Coupon) =>
    coupon.max_uses !== null && coupon.current_uses >= coupon.max_uses;

  const formatDiscount = (coupon: Coupon) => {
    if (coupon.discount_type === 'fixed') {
      return `R$ ${Number(coupon.discount_value).toFixed(2).replace('.', ',')}`;
    }
    if (coupon.discount_type === 'percentage') {
      return `${coupon.discount_value}%`; // fallback pra cupons antigos
    }
    return 'Grátis';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-white/[0.02] rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto lg:mx-0">
      {/* Header — Desktop */}
      <div className="hidden lg:flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C5A059]/10 border border-[#C5A059]/20 flex items-center justify-center shrink-0">
            <Tag size={18} className="text-[#C5A059]" />
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-white">Cupons e Promoções</h3>
            <p className="text-[12px] text-zinc-500 mt-0.5">
              {coupons.length > 0
                ? `${coupons.length} cupom(ns) cadastrado(s)`
                : 'Nenhum cupom criado'}
            </p>
          </div>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#C5A059] text-black font-semibold text-[12px] rounded-lg hover:bg-[#A68233] transition-all cursor-pointer"
        >
          <Plus size={14} strokeWidth={2.5} />
          Novo Cupom
        </button>
      </div>

      {/* Header — Mobile */}
      <div className="lg:hidden">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#C5A059]/10 border border-[#C5A059]/20 flex items-center justify-center shrink-0">
            <Tag size={18} className="text-[#C5A059]" />
          </div>
          <div className="flex-1">
            <h3 className="text-[15px] font-bold text-white">Cupons e Promoções</h3>
            <p className="text-[11px] text-zinc-500">Gerencie cupons de desconto</p>
          </div>
        </div>
        <button
          onClick={openAdd}
          className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#C5A059] text-black font-semibold text-[12px] rounded-xl hover:bg-[#A68233] transition-all cursor-pointer"
        >
          <Plus size={14} strokeWidth={2.5} />
          Novo Cupom
        </button>
      </div>

      {/* List */}
      {coupons.length === 0 && (
        <div className="py-16 text-center">
          <Tag size={32} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 text-[13px]">Nenhum cupom cadastrado</p>
          <p className="text-zinc-600 text-[11px] mt-1">
            Crie cupons para oferecer descontos aos clientes
          </p>
        </div>
      )}

      {coupons.length > 0 && (
        <div className="hidden lg:block border-t border-white/[0.06]">
          {coupons.map((coupon) => {
            const expired = isExpired(coupon);
            const maxed = isMaxed(coupon);
            const inactive = !coupon.is_active || expired || maxed;

            return (
              <div
                key={coupon.id}
                className={`flex items-center justify-between py-4 border-b border-white/[0.04] hover:bg-white/[0.02] transition-all duration-200 px-2 -mx-2 rounded-lg ${
                  inactive ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#C5A059]/10 flex items-center justify-center shrink-0">
                    <Tag size={16} className="text-[#C5A059]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-bold text-white tracking-wider">
                        {coupon.code}
                      </span>
                      <button
                        onClick={() => copyCode(coupon.code)}
                        className="p-1 hover:bg-white/[0.06] rounded transition-all cursor-pointer"
                        title="Copiar código"
                      >
                        <Copy size={11} className="text-zinc-500 hover:text-white" />
                      </button>
                      {expired && (
                        <span className="text-[8px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded uppercase">
                          Expirado
                        </span>
                      )}
                      {maxed && !expired && (
                        <span className="text-[8px] font-bold text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded uppercase">
                          Esgotado
                        </span>
                      )}
                      {!coupon.is_active && !expired && !maxed && (
                        <span className="text-[8px] font-bold text-zinc-500 bg-white/[0.04] px-1.5 py-0.5 rounded uppercase">
                          Inativo
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[13px] text-[#C5A059] font-bold">
                        {formatDiscount(coupon)}
                      </span>
                      {coupon.description && (
                        <span className="text-[10px] text-zinc-500 truncate max-w-[200px]">
                          {coupon.description}
                        </span>
                      )}
                      <span className="text-[10px] text-zinc-600">
                        {coupon.current_uses}/{coupon.max_uses ?? '∞'} usos
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(coupon)}
                    className="p-2 hover:bg-white/[0.06] rounded-lg transition-all cursor-pointer"
                    title="Editar"
                  >
                    <Pencil
                      size={14}
                      className="text-zinc-500 hover:text-white transition-colors"
                    />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(coupon.id)}
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
            );
          })}
        </div>
      )}

      {/* Mobile Cards */}
      {coupons.length > 0 && (
        <div className="lg:hidden space-y-2">
          {coupons.map((coupon) => {
            const expired = isExpired(coupon);
            const maxed = isMaxed(coupon);
            const inactive = !coupon.is_active || expired || maxed;

            return (
              <div
                key={coupon.id}
                className={`bg-[#111111] border border-white/5 rounded-2xl p-4 ${
                  inactive ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-[#C5A059]/10 flex items-center justify-center shrink-0">
                      <Tag size={14} className="text-[#C5A059]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-bold text-white tracking-wider">
                          {coupon.code}
                        </span>
                        {expired && (
                          <span className="text-[8px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded uppercase">
                            Expirado
                          </span>
                        )}
                        {maxed && !expired && (
                          <span className="text-[8px] font-bold text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded uppercase">
                            Esgotado
                          </span>
                        )}
                      </div>
                      <span className="text-[12px] text-[#C5A059] font-bold">
                        {formatDiscount(coupon)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(coupon)}
                      className="p-2 hover:bg-white/[0.06] rounded-lg transition-all cursor-pointer"
                    >
                      <Pencil size={14} className="text-zinc-500" />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(coupon.id)}
                      className="p-2 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                    >
                      <Trash2 size={14} className="text-zinc-500 hover:text-red-400" />
                    </button>
                  </div>
                </div>
                {coupon.description && (
                  <p className="text-[11px] text-zinc-500 mt-2 ml-12">{coupon.description}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit — Mobile Full Screen / Desktop Modal */}
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
                  {screen === 'add' ? 'Novo Cupom' : 'Editar Cupom'}
                </span>
                <button
                  onClick={handleSave}
                  className="text-[#C5A059] font-bold text-[15px] cursor-pointer"
                >
                  <Check size={22} />
                </button>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSave();
                }}
                className="p-5 space-y-5 overflow-y-auto max-h-[calc(100vh-56px)]"
              >
                <CouponFormFields
                  code={code}
                  setCode={setCode}
                  discountType={discountType}
                  setDiscountType={setDiscountType}
                  discountValue={discountValue}
                  setDiscountValue={setDiscountValue}
                  applicableServiceIds={applicableServiceIds}
                  toggleService={toggleService}
                  services={services}
                  codeInputRef={codeInputRef}
                />
              </form>
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
                    {screen === 'add' ? 'Novo Cupom' : 'Editar Cupom'}
                  </span>
                  <button
                    onClick={handleSave}
                    className="text-[#C5A059] font-semibold text-[14px] cursor-pointer"
                  >
                    Salvar
                  </button>
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSave();
                  }}
                  className="p-5 space-y-5 max-h-[70vh] overflow-y-auto"
                >
                  <CouponFormFields
                    code={code}
                    setCode={setCode}
                    discountType={discountType}
                    setDiscountType={setDiscountType}
                    discountValue={discountValue}
                    setDiscountValue={setDiscountValue}
                    applicableServiceIds={applicableServiceIds}
                    toggleService={toggleService}
                    services={services}
                    codeInputRef={codeInputRef}
                  />
                </form>
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
                <p className="text-[14px] font-semibold text-white">Excluir cupom?</p>
                <p className="text-[12px] text-zinc-500 mt-1">
                  O cupom será removido permanentemente.
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

/* ────── Form Fields (shared between mobile/desktop) ────── */

interface CouponFormFieldsProps {
  code: string;
  setCode: (v: string) => void;
  discountType: 'fixed' | 'free';
  setDiscountType: (v: 'fixed' | 'free') => void;
  discountValue: string;
  setDiscountValue: (v: string) => void;
  applicableServiceIds: string[];
  toggleService: (id: string) => void;
  services: Service[];
  codeInputRef: React.RefObject<HTMLInputElement | null>;
}

const CouponFormFields: FC<CouponFormFieldsProps> = ({
  code,
  setCode,
  discountType,
  setDiscountType,
  discountValue,
  setDiscountValue,
  applicableServiceIds,
  toggleService,
  services,
  codeInputRef,
}) => (
  <>
    {/* Code */}
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
          Nome do cupom
        </span>
        <span className="text-[11px] text-zinc-600 tabular-nums">
          {code.length}/{MAX_CODE_LENGTH}
        </span>
      </div>
      <input
        ref={codeInputRef}
        type="text"
        value={code}
        onChange={(e) => {
          if (e.target.value.length <= MAX_CODE_LENGTH) setCode(e.target.value.toUpperCase());
        }}
        placeholder="Ex: NATAL10"
        maxLength={MAX_CODE_LENGTH}
        className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3.5 text-[15px] text-white font-bold tracking-wider outline-none focus:border-[#C5A059]/50 focus:ring-1 focus:ring-[#C5A059]/20 transition-all placeholder:text-zinc-600 placeholder:font-normal placeholder:tracking-normal uppercase"
      />
    </div>

    {/* Discount Type - simplified */}
    <div className="space-y-3">
      <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
        Tipo de desconto
      </span>
      <div className="flex gap-2">
        {DISCOUNT_TYPES.map((dt) => {
          const Icon = dt.icon;
          const selected = discountType === dt.value;
          return (
            <button
              key={dt.value}
              onClick={() => {
                setDiscountType(dt.value);
                if (dt.value === 'free') setDiscountValue('');
              }}
              className={`flex-1 py-3 rounded-xl text-[12px] font-semibold transition-all cursor-pointer border flex items-center justify-center gap-1.5 ${
                selected
                  ? 'bg-[#C5A059]/[0.1] border-[#C5A059]/30 text-[#C5A059]'
                  : 'bg-white/[0.02] border-white/[0.06] text-zinc-500 hover:bg-white/[0.04]'
              }`}
            >
              <Icon size={14} />
              {dt.label}
            </button>
          );
        })}
      </div>
    </div>

    {/* Discount Value (only for 'fixed') */}
    {discountType === 'fixed' && (
      <div className="space-y-2">
        <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
          Valor do desconto
        </span>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-[15px] font-medium">
            R$
          </span>
          <input
            type="text"
            value={discountValue}
            onChange={(e) => {
              const val = e.target.value.replace(/[^\d.,]/g, '');
              setDiscountValue(val);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder="15,00"
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3.5 text-[15px] text-white outline-none focus:border-[#C5A059]/50 focus:ring-1 focus:ring-[#C5A059]/20 transition-all placeholder:text-zinc-600"
          />
        </div>
      </div>
    )}

    {/* Services selector (only for 'free') */}
    {discountType === 'free' && (
      <div className="space-y-3">
        <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
          Selecione o(s) serviço(s) do prêmio
        </span>
        <div className="space-y-1">
          {services.map((service) => {
            const selected = applicableServiceIds.includes(service.id);
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
                <span
                  className={`text-[13px] font-medium flex-1 ${selected ? 'text-[#C5A059]' : 'text-zinc-200'}`}
                >
                  {service.name}
                </span>
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
    )}
  </>
);

export default SettingsCupons;
