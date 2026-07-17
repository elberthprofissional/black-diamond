import { useState, useEffect, useRef, useCallback, type FC } from 'react';
import {
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getServices,
} from '../../../lib/api';
import { useToast } from '../../../hooks/useToast';
import ToastNotification from '../shared/ToastNotification';
import { Tag, Plus, Trash2, X, Check, Pencil, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Coupon, Service } from '../../../types';
import CouponFormFields, { type CouponFormFieldsProps } from './cupons/CouponFormFields';
import { logError } from '../../../lib/logger';

/* ─── Gerenciamento de Cupons ───
 * CRUD completo: lista, cria, edita e exclui cupons de desconto.
 * Mobile: formulario em tela cheia. Desktop: modal centralizado.
 * Valida: codigo unico, valor positivo, data de validade, limite de usos. */

/** Retorna a data de hoje no formato YYYY-MM-DD */
function getTodayStr(): string {
  return new Date().toISOString().split('T')[0] ?? '';
}

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

  // Form state
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'fixed' | 'free'>('fixed');
  const [discountValue, setDiscountValue] = useState('');
  const [applicableServiceIds, setApplicableServiceIds] = useState<string[]>([]);
  const [validFrom, setValidFrom] = useState(getTodayStr);
  const [validUntil, setValidUntil] = useState('');
  const [maxUses, setMaxUses] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [couponsData, servicesData] = await Promise.all([getCoupons(), getServices()]);
      setCoupons(couponsData);
      setServices(servicesData);
    } catch (e) {
      logError(e);
      showError('Erro ao carregar cupons.');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadData();
  }, [loadData]);
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
    setValidFrom(getTodayStr());
    setValidUntil('');
    setMaxUses('');
  };
  const openAdd = () => {
    resetForm();
    setScreen('add');
  };
  const closeForm = () => {
    resetForm();
    setScreen('list');
  };
  const toggleService = (id: string) =>
    setApplicableServiceIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );

  const openEdit = (coupon: Coupon) => {
    setCode(coupon.code);
    setDiscountType(coupon.discount_type === 'percentage' ? 'fixed' : coupon.discount_type);
    setDiscountValue(coupon.discount_type === 'free' ? '' : String(coupon.discount_value));
    setApplicableServiceIds(coupon.applicable_service_ids || []);
    setEditingId(coupon.id);
    setScreen('edit');
    setValidFrom(coupon.valid_from || getTodayStr());
    setValidUntil(coupon.valid_until || '');
    setMaxUses(coupon.max_uses ? String(coupon.max_uses) : '');
  };

  // Valida e salva cupom (cria ou atualiza)
  const handleSave = async () => {
    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedCode) {
      showError('Informe o código do cupom.');
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
      valid_from: validFrom || getTodayStr(),
      valid_until: validUntil || null,
      max_uses: maxUses ? parseInt(maxUses, 10) : null,
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
      showError(
        msg.includes('duplicate') || msg.includes('unique')
          ? 'Já existe um cupom com esse código.'
          : msg
      );
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await deleteCoupon(id);
      showSuccess('Cupom removido!');
      setCoupons((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      logError(e);
      showError('Erro ao remover cupom.');
    } finally {
      setDeleting(null);
      setConfirmDelete(null);
    }
  };

  const copyCode = (couponCode: string) =>
    navigator.clipboard
      .writeText(couponCode)
      .then(() => showSuccess(`Código "${couponCode}" copiado!`));

  // Utilitarios de status do cupom
  const isExpired = (c: Coupon) => c.valid_until && new Date(c.valid_until) < new Date();
  const isMaxed = (c: Coupon) => c.max_uses !== null && c.current_uses >= c.max_uses;
  const formatDiscount = (c: Coupon) => {
    if (c.discount_type === 'fixed') {
      return `R$ ${Number(c.discount_value).toFixed(2).replace('.', ',')}`;
    }
    if (c.discount_type === 'percentage') {
      return `${c.discount_value}%`;
    }
    return 'Grátis';
  };

  /* Renders a badge for coupon status (expired, maxed, inactive) */
  const statusBadge = (coupon: Coupon) => {
    if (isExpired(coupon)) {
      return (
        <span className="text-[8px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded uppercase">
          Expirado
        </span>
      );
    }
    if (isMaxed(coupon)) {
      return (
        <span className="text-[8px] font-bold text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded uppercase">
          Esgotado
        </span>
      );
    }
    if (!coupon.is_active) {
      return (
        <span className="text-[8px] font-bold text-zinc-500 bg-white/[0.04] px-1.5 py-0.5 rounded uppercase">
          Inativo
        </span>
      );
    }
    return null;
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
      {/* Header */}
      <HeaderSection couponCount={coupons.length} onAdd={openAdd} />

      {/* Empty state */}
      {coupons.length === 0 && (
        <div className="py-16 text-center">
          <Tag size={32} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 text-[13px]">Nenhum cupom cadastrado</p>
          <p className="text-zinc-600 text-[11px] mt-1">
            Crie cupons para oferecer descontos aos clientes
          </p>
        </div>
      )}

      {/* Desktop list */}
      {coupons.length > 0 && (
        <div className="hidden lg:block border-t border-white/[0.06]">
          {coupons.map((coupon) => {
            const inactive = !coupon.is_active || isExpired(coupon) || isMaxed(coupon);
            return (
              <div
                key={coupon.id}
                className={`flex items-center justify-between py-4 border-b border-white/[0.04] hover:bg-white/[0.02] transition-all duration-200 px-2 -mx-2 rounded-lg ${inactive ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center shrink-0">
                    <Tag size={16} className="text-[#D4AF37]" />
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
                      {statusBadge(coupon)}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[13px] text-[#D4AF37] font-bold">
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
                    <ValidityDates validFrom={coupon.valid_from} validUntil={coupon.valid_until} />
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <ActionBtn
                    onClick={() => openEdit(coupon)}
                    icon={<Pencil size={14} />}
                    title="Editar"
                  />
                  <ActionBtn
                    onClick={() => setConfirmDelete(coupon.id)}
                    icon={<Trash2 size={14} />}
                    title="Excluir"
                    danger
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Mobile cards */}
      {coupons.length > 0 && (
        <div className="lg:hidden space-y-2">
          {coupons.map((coupon) => {
            const inactive = !coupon.is_active || isExpired(coupon) || isMaxed(coupon);
            return (
              <div
                key={coupon.id}
                className={`bg-[#111111] border border-white/5 rounded-2xl p-4 ${inactive ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center shrink-0">
                      <Tag size={14} className="text-[#D4AF37]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-bold text-white tracking-wider">
                          {coupon.code}
                        </span>
                        {statusBadge(coupon)}
                      </div>
                      <span className="text-[12px] text-[#D4AF37] font-bold">
                        {formatDiscount(coupon)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <ActionBtn onClick={() => openEdit(coupon)} icon={<Pencil size={14} />} />
                    <ActionBtn
                      onClick={() => setConfirmDelete(coupon.id)}
                      icon={<Trash2 size={14} />}
                      danger
                    />
                  </div>
                </div>
                {coupon.description && (
                  <p className="text-[11px] text-zinc-500 mt-2 ml-12">{coupon.description}</p>
                )}
                <div className="ml-12">
                  <ValidityDates validFrom={coupon.valid_from} validUntil={coupon.valid_until} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Form - Mobile full screen / Desktop modal */}
      <CouponFormModal
        screen={screen}
        onClose={closeForm}
        onSave={handleSave}
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
        validFrom={validFrom}
        setValidFrom={setValidFrom}
        validUntil={validUntil}
        setValidUntil={setValidUntil}
        maxUses={maxUses}
        setMaxUses={setMaxUses}
      />

      {/* Delete confirmation modal */}
      <DeleteModal
        confirmDelete={confirmDelete}
        deleting={deleting}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
      />

      <ToastNotification toast={toast} />
    </div>
  );
};

/* ─── Sub-components ─── */

/** Header da pagina de cupons */
const HeaderSection: FC<{ couponCount: number; onAdd: () => void }> = ({ couponCount, onAdd }) => (
  <>
    <div className="hidden lg:flex items-center justify-between py-2">
      <div>
        <h3 className="text-[15px] font-bold text-white">Cupons</h3>
        <p className="text-[12px] text-zinc-500 mt-0.5">
          {couponCount > 0 ? `${couponCount} cupom(ns) cadastrado(s)` : 'Nenhum cupom criado'}
        </p>
      </div>
      <button
        onClick={onAdd}
        className="flex items-center gap-1.5 px-4 py-2 bg-[#D4AF37] text-black font-semibold text-[12px] rounded-lg hover:bg-[#b8962e] transition-all cursor-pointer"
      >
        <Plus size={14} strokeWidth={2.5} /> Novo Cupom
      </button>
    </div>
    <div className="lg:hidden flex items-center justify-between py-2">
      <div>
        <h3 className="text-[15px] font-bold text-white">Cupons</h3>
        <p className="text-[12px] text-zinc-500 mt-0.5">
          {couponCount > 0 ? `${couponCount} cupom(ns) cadastrado(s)` : 'Nenhum cupom criado'}
        </p>
      </div>
      <button
        onClick={onAdd}
        className="flex items-center gap-1.5 px-3 py-2 bg-[#D4AF37] text-black font-semibold text-[11px] rounded-lg hover:bg-[#b8962e] transition-all cursor-pointer"
      >
        <Plus size={13} strokeWidth={2.5} /> Novo Cupom
      </button>
    </div>
  </>
);

/** Datas de validade do cupom */
const ValidityDates: FC<{ validFrom?: string | null; validUntil?: string | null }> = ({
  validFrom,
  validUntil,
}) => (
  <div className="flex items-center gap-2 mt-0.5">
    {validFrom && (
      <span className="text-[9px] text-zinc-600">
        De {new Date(validFrom).toLocaleDateString('pt-BR')}
      </span>
    )}
    {validUntil && (
      <span className="text-[9px] text-zinc-600">
        até {new Date(validUntil).toLocaleDateString('pt-BR')}
      </span>
    )}
    {!validUntil && <span className="text-[9px] text-zinc-700">Sem expiração</span>}
  </div>
);

/** Botao de acao (editar/excluir) */
const ActionBtn: FC<{
  onClick: () => void;
  icon: React.ReactNode;
  title?: string;
  danger?: boolean;
}> = ({ onClick, icon, title, danger }) => (
  <button
    onClick={onClick}
    className={`p-2 hover:bg-white/[0.06] rounded-lg transition-all cursor-pointer ${danger ? 'hover:bg-red-500/10' : ''}`}
    title={title}
  >
    <span
      className={
        danger
          ? 'text-zinc-500 hover:text-red-400 transition-colors'
          : 'text-zinc-500 hover:text-white transition-colors'
      }
    >
      {icon}
    </span>
  </button>
);

/** Modal de formulario de cupom (mobile full screen / desktop centered) */
const CouponFormModal: FC<
  CouponFormFieldsProps & {
    screen: string;
    onClose: () => void;
    onSave: () => void;
  }
> = ({ screen, onClose, onSave, ...fields }) => (
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
            <button onClick={onClose} className="text-zinc-400 hover:text-white cursor-pointer">
              <X size={22} />
            </button>
            <span className="text-[15px] font-bold text-white">
              {screen === 'add' ? 'Novo Cupom' : 'Editar Cupom'}
            </span>
            <button
              onClick={onSave}
              className="text-[#D4AF37] font-bold text-[15px] cursor-pointer"
            >
              <Check size={22} />
            </button>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSave();
            }}
            className="p-5 space-y-5 overflow-y-auto max-h-[calc(100vh-56px)]"
          >
            <CouponFormFields {...fields} />
          </form>
        </motion.div>

        {/* Desktop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="hidden lg:flex fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm items-center justify-center p-4"
          onClick={onClose}
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
              <button onClick={onClose} className="text-zinc-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
              <span className="text-[14px] font-semibold text-white">
                {screen === 'add' ? 'Novo Cupom' : 'Editar Cupom'}
              </span>
              <button
                onClick={onSave}
                className="text-[#D4AF37] font-semibold text-[14px] cursor-pointer"
              >
                Salvar
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onSave();
              }}
              className="p-5 space-y-5 max-h-[70vh] overflow-y-auto"
            >
              <CouponFormFields {...fields} />
            </form>
          </motion.div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

/** Modal de confirmacao de exclusao */
const DeleteModal: FC<{
  confirmDelete: string | null;
  deleting: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}> = ({ confirmDelete, deleting, onCancel, onConfirm }) => (
  <AnimatePresence>
    {confirmDelete && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[400] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
        onClick={onCancel}
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
            <p className="text-[12px] text-zinc-500 mt-1">O cupom será removido permanentemente.</p>
          </div>
          <div className="flex border-t border-white/[0.06]">
            <button
              onClick={onCancel}
              className="flex-1 py-3 text-[12px] font-medium text-zinc-500 hover:text-white transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <div className="w-px bg-white/[0.06]" />
            <button
              onClick={onConfirm}
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
);

export default SettingsCupons;
