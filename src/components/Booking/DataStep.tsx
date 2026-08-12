import { memo, useState, useCallback, useEffect, useRef, type FC } from 'react';
import { useNavigate } from 'react-router';
import { User, Repeat, Tag, LogIn, UserPlus, CheckCircle2 } from 'lucide-react';
import { formatPricePublic } from '../../lib/utils';
import { getClientSession } from '../../lib/clientSession';
import { WhatsAppIcon } from '../WhatsAppIcon';
import CouponModal from './CouponModal';
import CouponBadge from './CouponBadge';
import { useForm } from '../../hooks/useForm';

interface DataStepProps {
  name: string;
  phone: string;
  onNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  layout: 'desktop' | 'mobile';
  isMensalista: boolean;
  clientLookupLoading: boolean;
  lastBooking?: { serviceIds: string[]; totalPrice: number } | null;
  onApplyLastBooking?: () => void;
  serviceNames?: Record<string, string>;
  coupon?: {
    coupon_id: string;
    code: string;
    discount_type: string;
    discount_amount: number;
  } | null;
  couponLoading?: boolean;
  couponError?: string;
  onCouponValidate?: (code: string) => void;
  onCouponRemove?: () => void;
}

function validateDataStep(values: { name: string; phone: string }) {
  const errors: { name?: string; phone?: string } = {};
  const digits = values.phone.replace(/\D/g, '');
  if (digits.length > 0 && digits.length < 10) {
    errors.phone = 'Informe DDD + número (mín. 10 dígitos)';
  }
  if (digits.length > 11) {
    errors.phone = 'Número muito longo (máx. 11 dígitos)';
  }
  if (values.name && values.name.trim().length < 3) {
    errors.name = 'Mínimo 3 caracteres';
  }
  return errors;
}

const DataStep: FC<DataStepProps> = memo(
  ({
    name,
    phone,
    onNameChange,
    onPhoneChange,
    layout,
    isMensalista,
    clientLookupLoading,
    lastBooking,
    onApplyLastBooking,
    serviceNames,
    coupon,
    couponLoading,
    couponError,
    onCouponValidate,
    onCouponRemove,
  }) => {
    const navigate = useNavigate();
    const session = getClientSession();
    const [couponModalOpen, setCouponModalOpen] = useState(false);

    // Form validation state (touched tracking + validation via useForm)
    const form = useForm({
      initialValues: { name, phone },
      validate: validateDataStep,
    });

    // Keep form values in sync with parent props
    const prevRef = useRef({ name, phone });
    useEffect(() => {
      const prev = prevRef.current;
      if (name !== prev.name || phone !== prev.phone) {
        form.setValues({ name, phone });
      }
      prevRef.current = { name, phone };
    }, [name, phone]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleNameChange = useCallback(
      (value: string) => {
        form.setValue('name', value);
        onNameChange(value);
      },
      [onNameChange] // eslint-disable-line react-hooks/exhaustive-deps
    );

    const handlePhoneChange = useCallback(
      (value: string) => {
        form.setValue('phone', value);
        onPhoneChange(value);
      },
      [onPhoneChange] // eslint-disable-line react-hooks/exhaustive-deps
    );

    const renderLoginBanner = () => {
      if (session) {
        return (
          <div className="bg-gold/10 border border-gold/30 rounded-xl p-3.5 flex items-center justify-between text-left gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-gold/20 flex items-center justify-center shrink-0">
                <CheckCircle2 size={14} className="text-gold" />
              </div>
              <div>
                <p className="text-[13px] font-medium text-white">
                  Conectado como <span className="text-gold font-bold">{session.name}</span>
                </p>
                <p className="text-[11px] text-zinc-400">
                  Seus dados foram preenchidos automaticamente.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/cliente')}
              className="text-[11px] font-semibold text-gold hover:underline shrink-0"
            >
              Minha conta →
            </button>
          </div>
        );
      }

      return (
        <div className="bg-zinc-900/80 border border-white/10 rounded-xl p-4 space-y-3 text-left">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0 mt-0.5">
              <User size={16} className="text-gold" />
            </div>
            <div className="space-y-0.5">
              <p className="text-[13px] font-semibold text-white">Já possui uma conta?</p>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Entre para agendar mais rápido, acompanhar seus horários e não precisar digitar seus
                dados novamente.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => navigate('/entrar')}
              className="flex-1 sm:flex-none px-3.5 py-1.5 bg-gold hover:bg-gold/90 text-black text-[12px] font-bold rounded-lg transition-all cursor-pointer text-center flex items-center justify-center gap-1.5"
            >
              <LogIn size={13} />
              Entrar
            </button>
            <button
              type="button"
              onClick={() => navigate('/entrar?mode=create')}
              className="flex-1 sm:flex-none px-3.5 py-1.5 bg-white/10 hover:bg-white/15 text-white text-[12px] font-semibold rounded-lg transition-all cursor-pointer text-center flex items-center justify-center gap-1.5"
            >
              <UserPlus size={13} />
              Criar conta
            </button>
          </div>
        </div>
      );
    };

    if (layout === 'desktop') {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-lg space-y-6">
            {/* Header */}
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-white">Seus dados</h2>
              <p className="text-[14px] text-zinc-400">Preencha suas informações para continuar.</p>
            </div>

            {/* Banner de Login Opcional */}
            {renderLoginBanner()}

            {/* Form — WhatsApp primeiro, Nome depois (auto-preenchimento) */}
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="phone-desktop"
                    className="text-[12px] font-medium text-zinc-400 uppercase tracking-wider"
                  >
                    WhatsApp
                  </label>
                  {clientLookupLoading && (
                    <span className="text-[12px] text-zinc-600 animate-pulse">Verificando...</span>
                  )}
                  {isMensalista && !clientLookupLoading && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gold/10 border border-gold/20 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                      <span className="text-[10px] font-bold text-gold uppercase">Mensalista</span>
                    </span>
                  )}
                </div>
                <input
                  id="phone-desktop"
                  type="tel"
                  placeholder="(00) 00000-0000"
                  data-testid="input-phone"
                  aria-label="Seu número de WhatsApp com DDD"
                  aria-describedby={form.errors.phone ? 'phone-error-desktop' : undefined}
                  aria-invalid={!!form.errors.phone}
                  className="w-full bg-transparent border-b-2 border-white/10 focus:border-gold py-4 px-0 text-[16px] text-white outline-none transition-all placeholder:text-zinc-600 font-medium"
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  onBlur={form.handleBlur('phone')}
                  autoFocus
                />
                {form.errors.phone && form.touched.phone && (
                  <p id="phone-error-desktop" className="text-[12px] text-red-400/80" role="alert">
                    {form.errors.phone}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="name-desktop"
                  className="text-[12px] font-medium text-zinc-400 uppercase tracking-wider"
                >
                  Nome
                </label>
                <input
                  id="name-desktop"
                  type="text"
                  placeholder="Digite seu nome completo"
                  data-testid="input-name"
                  aria-label="Seu nome"
                  aria-describedby={
                    form.errors.name && form.touched.name ? 'name-error-desktop' : undefined
                  }
                  aria-invalid={!!(form.errors.name && form.touched.name)}
                  className="w-full bg-transparent border-b-2 border-white/10 focus:border-gold py-4 px-0 text-[16px] text-white outline-none transition-all placeholder:text-zinc-600 font-medium"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  onBlur={form.handleBlur('name')}
                />
                {form.errors.name && form.touched.name && (
                  <p id="name-error-desktop" className="text-[12px] text-red-400/80" role="alert">
                    {form.errors.name}
                  </p>
                )}
              </div>
            </div>

            {/* Last Booking Suggestion - Desktop */}
            {lastBooking?.serviceIds && onApplyLastBooking && serviceNames && (
              <div className="bg-gold/[0.06] border border-gold/20 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Repeat size={16} className="text-gold" />
                  <span className="text-[12px] font-semibold text-gold uppercase tracking-wider">
                    Seu último agendamento
                  </span>
                </div>
                <p className="text-[14px] text-zinc-300 mb-4">
                  {lastBooking.serviceIds.map((id) => serviceNames[id] || 'Serviço').join(' + ')} —{' '}
                  <span className="text-gold">{formatPricePublic(lastBooking.totalPrice)}</span>
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={onApplyLastBooking}
                    className="flex-1 py-2.5 bg-gold/15 hover:bg-gold/25 text-gold text-[12px] font-semibold rounded-lg transition-all cursor-pointer"
                  >
                    Repetir este agendamento
                  </button>
                  <span className="text-[12px] text-zinc-500 self-center">ou escolha abaixo ↓</span>
                </div>
              </div>
            )}

            {/* Coupon Section */}
            <div className="pt-2">
              {coupon ? (
                <CouponBadge
                  code={coupon.code}
                  discountAmount={coupon.discount_amount}
                  onRemove={onCouponRemove!}
                />
              ) : (
                <button
                  onClick={() => setCouponModalOpen(true)}
                  className="flex items-center gap-2 group cursor-pointer justify-end w-full"
                >
                  <Tag
                    size={13}
                    className="text-zinc-600 group-hover:text-gold transition-colors"
                  />
                  <span className="text-[12px] text-zinc-500 group-hover:text-gold transition-colors">
                    Adicionar cupom de desconto
                  </span>
                </button>
              )}
              {couponError && <p className="text-[10px] text-red-400 mt-1.5">{couponError}</p>}
            </div>
          </div>

          <CouponModal
            open={couponModalOpen}
            onClose={() => setCouponModalOpen(false)}
            onApply={(code) => {
              onCouponValidate?.(code);
              setCouponModalOpen(false);
            }}
            loading={couponLoading}
          />
        </div>
      );
    }

    // Mobile layout
    return (
      <div className="space-y-4 pb-4">
        {/* Banner */}
        <div className="relative h-28 rounded-2xl overflow-hidden border border-white/[0.04] bg-[#0E0E0E] flex items-center px-5">
          <img
            src="/assets/login.webp"
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover grayscale opacity-20 pointer-events-none"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
          <div className="relative z-10">
            <span className="text-[10px] font-black tracking-[0.4em] text-gold uppercase block mb-0.5">
              BLACK DIAMOND
            </span>
            <h2 className="text-xl font-black text-white tracking-tight">Preencha seus dados</h2>
            <p className="text-[10px] text-zinc-400">Precisamos do seu nome e WhatsApp</p>
          </div>
        </div>

        {/* Login Banner (opcional) */}
        {renderLoginBanner()}

        {/* Fields — WhatsApp primeiro, Nome depois (auto-preenchimento) */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="phone-mobile"
                className="text-[12px] font-semibold text-zinc-400 flex items-center gap-1.5"
              >
                <WhatsAppIcon className="w-3 h-3 text-gold" />
                WhatsApp
              </label>
              {isMensalista && !clientLookupLoading && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gold/10 border border-gold/20 rounded-full">
                  <span className="w-1 h-1 rounded-full bg-gold" />
                  <span className="text-[10px] font-bold text-gold uppercase">Mensalista</span>
                </span>
              )}
              {clientLookupLoading && (
                <span className="text-[10px] text-zinc-600 animate-pulse">Verificando...</span>
              )}
            </div>
            <input
              id="phone-mobile"
              type="tel"
              placeholder="(00) 90000-0000"
              data-testid="input-phone"
              aria-label="Seu número de WhatsApp com DDD"
              autoFocus
              aria-describedby={
                form.errors.phone && form.touched.phone ? 'phone-error-mobile' : undefined
              }
              aria-invalid={!!(form.errors.phone && form.touched.phone)}
              className="w-full bg-transparent border border-white/[0.06] focus:border-gold rounded-xl px-4 py-3.5 text-sm text-white outline-none transition-all duration-300 placeholder:text-zinc-600"
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              onBlur={form.handleBlur('phone')}
            />
            {form.errors.phone && form.touched.phone && (
              <p id="phone-error-mobile" className="text-[10px] text-red-400/80" role="alert">
                {form.errors.phone}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label
              htmlFor="name-mobile"
              className="text-[12px] font-semibold text-zinc-400 flex items-center gap-1.5"
            >
              <User size={12} className="text-gold/60" />
              Nome
            </label>
            <input
              id="name-mobile"
              type="text"
              placeholder="Digite seu nome..."
              data-testid="input-name"
              aria-label="Seu nome"
              aria-describedby={
                form.errors.name && form.touched.name ? 'name-error-mobile' : undefined
              }
              aria-invalid={!!(form.errors.name && form.touched.name)}
              className="w-full bg-transparent border border-white/[0.06] focus:border-gold rounded-xl px-4 py-3.5 text-sm text-white outline-none transition-all duration-300 placeholder:text-zinc-600"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              onBlur={form.handleBlur('name')}
            />
            {form.errors.name && form.touched.name && (
              <p id="name-error-mobile" className="text-[10px] text-red-400/80" role="alert">
                {form.errors.name}
              </p>
            )}
          </div>

          {/* Coupon Section */}
          <div className="space-y-2">
            {coupon ? (
              <CouponBadge
                code={coupon.code}
                discountAmount={coupon.discount_amount}
                onRemove={onCouponRemove!}
              />
            ) : (
              <button
                onClick={() => setCouponModalOpen(true)}
                className="flex items-center gap-2 group cursor-pointer w-full justify-end"
              >
                <Tag size={12} className="text-zinc-600 group-hover:text-gold transition-colors" />
                <span className="text-[12px] text-zinc-500 group-hover:text-gold transition-colors">
                  Adicionar cupom de desconto
                </span>
              </button>
            )}
            {couponError && <p className="text-[10px] text-red-400">{couponError}</p>}
          </div>

          {/* Last Booking Suggestion */}
          {lastBooking?.serviceIds && onApplyLastBooking && serviceNames && (
            <div className="bg-gold/[0.08] border border-gold/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Repeat size={14} className="text-gold" />
                <span className="text-[12px] font-semibold text-gold">Seu último agendamento</span>
              </div>
              <p className="text-[12px] text-zinc-300 mb-3">
                {lastBooking.serviceIds.map((id) => serviceNames[id] || 'Serviço').join(' + ')}
              </p>
              <button
                onClick={onApplyLastBooking}
                className="w-full py-2.5 bg-gold/15 hover:bg-gold/25 text-gold text-[12px] font-semibold rounded-lg transition-all cursor-pointer"
              >
                Repetir este agendamento
              </button>
            </div>
          )}
        </div>

        <CouponModal
          open={couponModalOpen}
          onClose={() => setCouponModalOpen(false)}
          onApply={(code) => {
            onCouponValidate?.(code);
            setCouponModalOpen(false);
          }}
          loading={couponLoading}
        />
      </div>
    );
  }
);

DataStep.displayName = 'DataStep';

export default DataStep;
