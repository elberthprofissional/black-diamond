import { memo, useState, type FC } from 'react';
import { User, Repeat, Tag } from 'lucide-react';
import { WhatsAppIcon } from '../WhatsAppIcon';
import CouponModal from './CouponModal';

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

function getPhoneError(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 0) return null;
  if (digits.length < 10) return 'Informe DDD + número (mín. 10 dígitos)';
  if (digits.length > 11) return 'Número muito longo (máx. 11 dígitos)';
  return null;
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
    const [couponModalOpen, setCouponModalOpen] = useState(false);

    if (layout === 'desktop') {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-lg space-y-10">
            {/* Header */}
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-white">Seus dados</h2>
              <p className="text-[14px] text-zinc-400">Preencha suas informações para continuar.</p>
            </div>

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
                    <span className="text-[11px] text-zinc-600 animate-pulse">Verificando...</span>
                  )}
                  {isMensalista && !clientLookupLoading && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#C5A059]/10 border border-[#C5A059]/20 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C5A059]" />
                      <span className="text-[10px] font-bold text-[#C5A059] uppercase">
                        Mensalista
                      </span>
                    </span>
                  )}
                </div>
                <input
                  id="phone-desktop"
                  type="tel"
                  placeholder="(00) 00000-0000"
                  data-testid="input-phone"
                  aria-label="Seu número de WhatsApp com DDD"
                  aria-describedby={getPhoneError(phone) ? 'phone-error-desktop' : undefined}
                  aria-invalid={!!getPhoneError(phone)}
                  className="w-full bg-transparent border-b-2 border-white/10 focus:border-[#C5A059] py-4 px-0 text-[16px] text-white outline-none transition-all placeholder:text-zinc-600 font-medium"
                  value={phone}
                  onChange={(e) => onPhoneChange(e.target.value)}
                  autoFocus
                />
                {getPhoneError(phone) && (
                  <p id="phone-error-desktop" className="text-[11px] text-red-400/80" role="alert">
                    {getPhoneError(phone)}
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
                    name && name.trim().length < 3 ? 'name-error-desktop' : undefined
                  }
                  aria-invalid={!!(name && name.trim().length < 3)}
                  className="w-full bg-transparent border-b-2 border-white/10 focus:border-[#C5A059] py-4 px-0 text-[16px] text-white outline-none transition-all placeholder:text-zinc-600 font-medium"
                  value={name}
                  onChange={(e) => onNameChange(e.target.value)}
                />
                {name && name.trim().length < 3 && (
                  <p id="name-error-desktop" className="text-[11px] text-red-400/80" role="alert">
                    Mínimo 3 caracteres
                  </p>
                )}
              </div>
            </div>

            {/* Coupon Section */}
            <div className="pt-2">
              {coupon ? (
                <div className="flex items-center justify-between bg-[#C5A059]/10 border border-[#C5A059]/20 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Tag size={14} className="text-[#C5A059]" />
                    <span className="text-[12px] font-semibold text-[#C5A059]">{coupon.code}</span>
                    <span className="text-[11px] text-zinc-400">
                      -R$ {coupon.discount_amount.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  <button
                    onClick={onCouponRemove}
                    className="text-[10px] text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
                  >
                    Remover
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setCouponModalOpen(true)}
                  className="flex items-center gap-2 group cursor-pointer justify-end w-full"
                >
                  <Tag
                    size={13}
                    className="text-zinc-600 group-hover:text-[#C5A059] transition-colors"
                  />
                  <span className="text-[12px] text-zinc-500 group-hover:text-[#C5A059] transition-colors">
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
      <div className="space-y-5 pb-4">
        {/* Banner */}
        <div className="relative h-28 rounded-2xl overflow-hidden border border-white/[0.04] bg-[#0E0E0E] flex items-center px-5">
          <img
            src="/assets/login.webp"
            alt=""
            className="absolute inset-0 w-full h-full object-cover grayscale opacity-20 pointer-events-none"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
          <div className="relative z-10">
            <span className="text-[8px] font-black tracking-[0.4em] text-[#C5A059] uppercase block mb-0.5">
              BLACK DIAMOND
            </span>
            <h2 className="text-xl font-black text-white tracking-tight">Preencha seus dados</h2>
            <p className="text-[10px] text-zinc-400">Precisamos do seu nome e WhatsApp</p>
          </div>
        </div>

        {/* Fields — WhatsApp primeiro, Nome depois (auto-preenchimento) */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="phone-mobile"
                className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1.5"
              >
                <WhatsAppIcon className="w-3 h-3 text-[#C5A059]" />
                WhatsApp
              </label>
              {isMensalista && !clientLookupLoading && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#C5A059]/10 border border-[#C5A059]/20 rounded-full">
                  <span className="w-1 h-1 rounded-full bg-[#C5A059]" />
                  <span className="text-[8px] font-bold text-[#C5A059] uppercase">Mensalista</span>
                </span>
              )}
              {clientLookupLoading && (
                <span className="text-[9px] text-zinc-600 animate-pulse">Verificando...</span>
              )}
            </div>
            <input
              id="phone-mobile"
              type="tel"
              placeholder="(00) 90000-0000"
              data-testid="input-phone"
              aria-label="Seu número de WhatsApp com DDD"
              autoFocus
              aria-describedby={getPhoneError(phone) ? 'phone-error-mobile' : undefined}
              aria-invalid={!!getPhoneError(phone)}
              className="w-full bg-transparent border border-white/[0.06] focus:border-[#C5A059] rounded-xl px-4 py-3.5 text-sm text-white outline-none transition-all duration-300 placeholder:text-zinc-600"
              value={phone}
              onChange={(e) => onPhoneChange(e.target.value)}
            />
            {getPhoneError(phone) && (
              <p id="phone-error-mobile" className="text-[10px] text-red-400/80" role="alert">
                {getPhoneError(phone)}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label
              htmlFor="name-mobile"
              className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1.5"
            >
              <User size={12} className="text-[#C5A059]/60" />
              Nome
            </label>
            <input
              id="name-mobile"
              type="text"
              placeholder="Digite seu nome..."
              data-testid="input-name"
              aria-label="Seu nome"
              aria-describedby={name && name.trim().length < 3 ? 'name-error-mobile' : undefined}
              aria-invalid={!!(name && name.trim().length < 3)}
              className="w-full bg-transparent border border-white/[0.06] focus:border-[#C5A059] rounded-xl px-4 py-3.5 text-sm text-white outline-none transition-all duration-300 placeholder:text-zinc-600"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
            />
            {name && name.trim().length < 3 && (
              <p id="name-error-mobile" className="text-[10px] text-red-400/80" role="alert">
                Mínimo 3 caracteres
              </p>
            )}
          </div>

          {/* Coupon Section */}
          <div className="space-y-2">
            {coupon ? (
              <div className="flex items-center justify-between bg-[#C5A059]/10 border border-[#C5A059]/20 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <Tag size={14} className="text-[#C5A059]" />
                  <span className="text-[12px] font-semibold text-[#C5A059]">{coupon.code}</span>
                  <span className="text-[11px] text-zinc-400">
                    -R$ {coupon.discount_amount.toFixed(2).replace('.', ',')}
                  </span>
                </div>
                <button
                  onClick={onCouponRemove}
                  className="text-[10px] text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
                >
                  Remover
                </button>
              </div>
            ) : (
              <button
                onClick={() => setCouponModalOpen(true)}
                className="flex items-center gap-2 group cursor-pointer w-full justify-end"
              >
                <Tag
                  size={12}
                  className="text-zinc-600 group-hover:text-[#C5A059] transition-colors"
                />
                <span className="text-[11px] text-zinc-500 group-hover:text-[#C5A059] transition-colors">
                  Adicionar cupom de desconto
                </span>
              </button>
            )}
            {couponError && <p className="text-[10px] text-red-400">{couponError}</p>}
          </div>

          {/* Last Booking Suggestion */}
          {lastBooking?.serviceIds && onApplyLastBooking && serviceNames && (
            <div className="bg-[#C5A059]/[0.08] border border-[#C5A059]/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Repeat size={14} className="text-[#C5A059]" />
                <span className="text-[11px] font-semibold text-[#C5A059]">
                  Seu último agendamento
                </span>
              </div>
              <p className="text-[12px] text-zinc-300 mb-3">
                {lastBooking.serviceIds.map((id) => serviceNames[id] || 'Serviço').join(' + ')}
              </p>
              <button
                onClick={onApplyLastBooking}
                className="w-full py-2.5 bg-[#C5A059]/15 hover:bg-[#C5A059]/25 text-[#C5A059] text-[11px] font-semibold rounded-lg transition-all cursor-pointer"
              >
                Manter mesmo agendamento
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
