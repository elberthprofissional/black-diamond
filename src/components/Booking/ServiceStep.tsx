import { memo, type FC } from 'react';
import { Check, Tag } from 'lucide-react';
import type { Service } from '../../types';

interface CouponInfo {
  coupon_id: string;
  code: string;
  discount_type: string;
  discount_amount: number;
}

interface ServiceStepProps {
  services: Service[];
  selectedServices: Service[];
  isMensalista?: boolean;
  planName?: string;
  onToggle: (service: Service) => void;
  onSkip?: () => void;
  layout: 'desktop' | 'mobile';
  coupon?: CouponInfo | null;
  originalPrice?: number;
}

function getServiceDiscount(service: Service, coupon: CouponInfo, originalPrice: number): number {
  const servicePrice = Number(service.price);
  if (coupon.discount_type === 'percentage') {
    return Math.round(((servicePrice * coupon.discount_amount) / originalPrice) * 100) / 100;
  }
  // Fixed: distribute proportionally
  if (originalPrice > 0) {
    return Math.round(coupon.discount_amount * (servicePrice / originalPrice) * 100) / 100;
  }
  return 0;
}

function getDiscountLabel(service: Service, coupon: CouponInfo, originalPrice: number): string {
  if (coupon.discount_type === 'percentage') {
    return `${coupon.discount_amount}% OFF`;
  }
  const discount = getServiceDiscount(service, coupon, originalPrice);
  if (discount >= 1) {
    return `-R$ ${discount.toFixed(0)} OFF`;
  }
  return `${coupon.discount_amount > 0 ? 'COM DESCONTO' : ''}`;
}

const ServiceStep: FC<ServiceStepProps> = memo(
  ({
    services,
    selectedServices,
    isMensalista = false,
    planName,
    onToggle,
    onSkip,
    layout,
    coupon,
    originalPrice = 0,
  }) => {
    const isSelected = (id: string) => selectedServices.some((s) => s.id === id);
    const hasCoupon = !!coupon && coupon.discount_amount > 0;

    if (layout === 'desktop') {
      return (
        <div className="space-y-6">
          {isMensalista && (
            <div className="px-4 py-3 bg-[#D4AF37]/[0.06] border border-[#D4AF37]/20 rounded-xl">
              <p className="text-[13px] text-[#D4AF37] font-medium">
                {planName || 'Corte de Cabelo incluso no plano mensal'}
              </p>
            </div>
          )}

          {hasCoupon && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <Tag size={13} className="text-emerald-400" />
              <p className="text-[11px] text-emerald-400 font-bold">
                Cupom {coupon.code} aplicado —{' '}
                {coupon.discount_type === 'percentage'
                  ? `${coupon.discount_amount}% de desconto`
                  : `R$ ${coupon.discount_amount.toFixed(0)} de desconto`}
              </p>
            </div>
          )}

          <div className="space-y-2" role="group" aria-label="Serviços disponíveis">
            {services.map((service) => {
              const selected = isSelected(service.id);
              const discount = hasCoupon ? getServiceDiscount(service, coupon!, originalPrice) : 0;
              const discountedPrice = Math.max(0, Number(service.price) - discount);
              return (
                <button
                  key={service.id}
                  onClick={() => onToggle(service)}
                  data-testid="service-card"
                  data-selected={selected}
                  aria-pressed={selected}
                  aria-label={`Serviço ${service.name}. Preço: R$ ${Number(service.price).toFixed(0)}. Duração: ${service.duration} minutos. ${selected ? 'Selecionado' : 'Não selecionado'}`}
                  className={`w-full flex items-center gap-5 px-6 py-5 rounded-xl transition-all duration-200 text-left group relative overflow-hidden ${
                    selected ? '' : 'hover:bg-white/[0.03]'
                  }`}
                >
                  {/* Discount badge */}
                  {hasCoupon && discount > 0 && (
                    <div className="absolute top-0 right-0">
                      <div className="bg-emerald-500 text-white text-[8px] font-black px-2 py-0.5 rounded-bl-lg tracking-wider">
                        {getDiscountLabel(service, coupon!, originalPrice)}
                      </div>
                    </div>
                  )}

                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all shrink-0 ${
                      selected ? 'border-[#D4AF37] bg-[#D4AF37]' : 'border-white/20'
                    }`}
                  >
                    {selected && <Check size={11} className="text-white stroke-[3px]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-[14px] font-medium text-white`}>{service.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasCoupon && discount > 0 && (
                      <span className="text-[12px] text-zinc-600 line-through tabular-nums">
                        R$ {Number(service.price).toFixed(0)}
                      </span>
                    )}
                    <span
                      className={`text-[14px] font-semibold tabular-nums w-16 text-right ${
                        hasCoupon && discount > 0 ? 'text-emerald-400' : 'text-zinc-400'
                      }`}
                    >
                      R$ {discountedPrice.toFixed(0)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {isMensalista && onSkip && (
            <div className="pt-4">
              <button
                type="button"
                onClick={onSkip}
                className="w-full py-3 bg-white/[0.04] border border-white/[0.08] text-zinc-400 text-[13px] font-medium rounded-xl hover:bg-white/[0.06] hover:text-white transition-all cursor-pointer"
              >
                Pular sem adicionar
              </button>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {isMensalista && (
          <div className="px-4 py-3 bg-[#D4AF37]/[0.06] border border-[#D4AF37]/20 rounded-xl">
            <p className="text-[12px] text-[#D4AF37] font-medium">
              {planName || 'Corte de Cabelo incluso no plano mensal'}
            </p>
          </div>
        )}

        {hasCoupon && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <Tag size={13} className="text-emerald-400" />
            <p className="text-[11px] text-emerald-400 font-bold">
              Cupom {coupon.code} —{' '}
              {coupon.discount_type === 'percentage'
                ? `${coupon.discount_amount}% OFF`
                : `R$ ${coupon.discount_amount.toFixed(0)} OFF`}
            </p>
          </div>
        )}

        <div className="space-y-3" role="group" aria-label="Serviços disponíveis">
          {services.map((service) => {
            const selected = isSelected(service.id);
            const discount = hasCoupon ? getServiceDiscount(service, coupon!, originalPrice) : 0;
            const discountedPrice = Math.max(0, Number(service.price) - discount);
            return (
              <button
                key={service.id}
                onClick={() => onToggle(service)}
                data-testid="service-card"
                data-selected={selected}
                aria-pressed={selected}
                className="w-full text-left transition-all cursor-pointer rounded-xl p-4 bg-white/[0.02] border border-white/[0.04] relative overflow-hidden"
              >
                {/* Discount badge */}
                {hasCoupon && discount > 0 && (
                  <div className="absolute top-0 right-0">
                    <div className="bg-emerald-500 text-white text-[8px] font-black px-2 py-0.5 rounded-bl-lg tracking-wider">
                      {getDiscountLabel(service, coupon!, originalPrice)}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p
                        className="text-[15px] font-extrabold tracking-tight text-white"
                        style={{ fontFamily: 'var(--font-montserrat)' }}
                      >
                        {service.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {hasCoupon && discount > 0 && (
                        <span className="text-[11px] text-zinc-600 line-through tabular-nums">
                          R$ {Number(service.price).toFixed(2).replace('.', ',')}
                        </span>
                      )}
                      <span
                        className={`text-[12px] font-medium tabular-nums ${hasCoupon && discount > 0 ? 'text-emerald-400' : 'text-zinc-500'}`}
                      >
                        R$ {discountedPrice.toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  </div>
                  <div
                    className={`w-11 h-6 rounded-full transition-all relative ${
                      selected ? 'bg-[#D4AF37]' : 'bg-zinc-700'
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                        selected ? 'left-[22px]' : 'left-0.5'
                      }`}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {isMensalista && onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="w-full py-3 bg-white/[0.04] border border-white/[0.08] text-zinc-400 text-[13px] font-medium rounded-xl hover:bg-white/[0.06] hover:text-white transition-all cursor-pointer"
          >
            Pular sem adicionar
          </button>
        )}
      </div>
    );
  }
);

ServiceStep.displayName = 'ServiceStep';

export default ServiceStep;
