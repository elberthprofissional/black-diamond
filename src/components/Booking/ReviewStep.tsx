import { memo, type FC } from 'react';
import { formatPhone } from '../../lib/utils';
import { Tag } from 'lucide-react';
import type { Service } from '../../types';
import CouponBadge from './CouponBadge';

const MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

function formatarDataBR(dataStr: string): string {
  const [ano, mes, dia] = dataStr.split('-');
  return `${Number(dia)} de ${MESES[Number(mes) - 1]}, ${ano}`;
}

interface ReviewStepProps {
  userName: string;
  userPhone: string;
  selectedDate: string;
  selectedTime: string;
  selectedServices: Service[];
  totalPrice: number;
  layout: 'desktop' | 'mobile';
  // Coupon props
  coupon?: {
    coupon_id: string;
    code: string;
    discount_type: string;
    discount_amount: number;
  } | null;
  couponLoading?: boolean;
  couponError?: string;
  originalPrice?: number;
  onCouponValidate?: (code: string) => Promise<void>;
  onCouponRemove?: () => void;
}

const ReviewStep: FC<ReviewStepProps> = memo(
  ({
    userName,
    userPhone,
    selectedDate,
    selectedTime,
    selectedServices,
    totalPrice,
    layout,
    coupon,
    originalPrice,
    onCouponRemove,
  }) => {
    const formattedDate = formatarDataBR(selectedDate);
    const hasCoupon = !!coupon;
    const hasDiscount = hasCoupon && originalPrice && originalPrice > totalPrice;

    if (layout === 'desktop') {
      return (
        <div className="flex-1 flex flex-col justify-center items-center">
          <div className="w-full max-w-[420px]">
            {/* Header */}
            <div className="text-center mb-6">
              <span className="text-[10px] font-bold tracking-[0.3em] text-[#C5A059] uppercase">
                Resumo do Agendamento
              </span>
            </div>

            {/* Single Unified Card */}
            <div className="bg-[#111111] border border-white/[0.06] rounded-2xl overflow-hidden">
              {/* Client Info */}
              <div className="p-6 pb-5">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-full bg-[#C5A059]/10 border border-[#C5A059]/20 flex items-center justify-center shrink-0">
                    <span className="text-base font-bold text-[#C5A059]">
                      {userName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-bold text-white truncate">{userName}</p>
                    <p className="text-[13px] text-zinc-500">{formatPhone(userPhone)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1.5 text-zinc-400">
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                        />
                      </svg>
                      <span className="text-[12px] font-semibold">{formattedDate}</span>
                    </div>
                    <p className="text-[13px] font-bold text-[#C5A059] mt-0.5">{selectedTime}</p>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-white/[0.06]" />

              {/* Services */}
              <div className="p-6 pt-5 space-y-3">
                {selectedServices.map((s) => (
                  <div key={`ticket-${s.id}`} className="flex justify-between items-center">
                    <span className="text-[13px] text-zinc-300">{s.name}</span>
                    <span className="text-[13px] font-bold text-white tabular-nums">
                      R$ {Number(s.price).toFixed(0)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Coupon Badge (only if applied) */}
              {hasCoupon && (
                <>
                  <div className="h-px bg-white/[0.06]" />
                  <div className="px-6 py-4">
                    <CouponBadge
                      code={coupon!.code}
                      discountAmount={coupon!.discount_amount}
                      onRemove={onCouponRemove!}
                      variant="compact"
                    />
                  </div>
                </>
              )}

              {/* Totals */}
              <div className="h-px bg-white/[0.06]" />
              <div className="p-6 pt-5 space-y-2">
                {hasDiscount && originalPrice && (
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-zinc-500">Subtotal</span>
                    <span className="text-[13px] font-bold text-zinc-500 tabular-nums line-through">
                      R$ {originalPrice.toFixed(0)}
                    </span>
                  </div>
                )}
                {hasDiscount && (
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-emerald-400 font-medium">Desconto</span>
                    <span className="text-[13px] font-bold text-emerald-400 tabular-nums">
                      -R$ {coupon!.discount_amount.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2">
                  <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">
                    Total
                  </span>
                  <span className="text-2xl font-black text-[#C5A059] tracking-tight tabular-nums">
                    R$ {totalPrice.toFixed(0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4 pb-4">
        <p className="text-[13px] text-zinc-400 px-1">Revise os dados do seu agendamento</p>

        <div className="w-full border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 space-y-0">
            {/* Cliente */}
            <div className="flex items-center gap-4 py-3.5 border-b border-white/[0.03]">
              <svg
                className="w-5 h-5 text-[#C5A059] shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-zinc-500 font-medium">Cliente</p>
                <p className="text-[14px] font-semibold text-white truncate">{userName}</p>
              </div>
            </div>

            {/* Telefone */}
            <div className="flex items-center gap-4 py-3.5 border-b border-white/[0.03]">
              <svg
                className="w-5 h-5 text-[#C5A059] shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
                />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-zinc-500 font-medium">Telefone</p>
                <p className="text-[14px] font-semibold text-white">{formatPhone(userPhone)}</p>
              </div>
            </div>

            {/* Serviço */}
            <div className="flex items-center gap-4 py-3.5 border-b border-white/[0.03]">
              <svg
                className="w-5 h-5 text-[#C5A059] shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7.848 8.25l1.536.887M7.848 8.25a3 3 0 11-5.196-3 3 3 0 015.196 3zm1.536.887a2.165 2.165 0 011.083 1.839c.005.351.054.695.14 1.024M9.384 9.137l2.077 1.199M7.848 15.75l1.536-.887m-1.536.887a3 3 0 01-5.196 3 3 3 0 015.196-3zm1.536-.887a2.165 2.165 0 001.083-1.838c.005-.352.054-.695.14-1.025m-1.223 2.863l2.077-1.199m0-3.328a4.323 4.323 0 012.068-1.379l5.325-1.628a4.542 4.542 0 012.48-.044l.803.215-7.794 4.5m-2.882-1.664A4.331 4.331 0 0010.607 12m3.736 0l7.794 4.5-.802.215a4.542 4.542 0 01-2.48-.043l-5.326-1.629a4.32 4.32 0 01-2.068-1.379M14.343 12l-2.882 1.664"
                />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-zinc-500 font-medium">Serviço</p>
                <p className="text-[14px] font-semibold text-white truncate">
                  {selectedServices.map((s) => s.name).join(', ')}
                </p>
              </div>
            </div>

            {/* Data */}
            <div className="flex items-center gap-4 py-3.5 border-b border-white/[0.03]">
              <svg
                className="w-5 h-5 text-[#C5A059] shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-zinc-500 font-medium">Data</p>
                <p className="text-[14px] font-semibold text-white">{formattedDate}</p>
              </div>
            </div>

            {/* Horário */}
            <div className="flex items-center gap-4 py-3.5 border-b border-white/[0.03]">
              <svg
                className="w-5 h-5 text-[#C5A059] shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-zinc-500 font-medium">Horário</p>
                <p className="text-[14px] font-semibold text-white">{selectedTime}</p>
              </div>
            </div>

            {/* Cupom (only if applied) */}
            {hasCoupon && (
              <div className="py-3.5 border-b border-white/[0.03]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-5 shrink-0 flex items-center justify-center">
                      <Tag size={18} className="text-[#C5A059]" />
                    </div>
                    <div>
                      <p className="text-[11px] text-zinc-500 font-medium">Cupom</p>
                      <div className="flex items-center gap-2">
                        <p className="text-[14px] font-bold text-[#C5A059] tracking-wider">
                          {coupon!.code}
                        </p>
                        {hasDiscount && (
                          <span className="text-[10px] text-[#C5A059]/70">
                            -R$ {coupon!.discount_amount.toFixed(2).replace('.', ',')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={onCouponRemove}
                    className="p-1.5 hover:bg-white/[0.06] rounded-lg cursor-pointer"
                    aria-label="Remover cupom"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Valor */}
            <div className="space-y-2 pt-3">
              {hasDiscount && originalPrice && (
                <div className="flex items-center gap-4 px-1">
                  <div className="w-5 shrink-0" />
                  <div className="flex-1 flex justify-between items-center">
                    <span className="text-[10px] text-zinc-500 line-through">Subtotal</span>
                    <span className="text-[13px] font-bold text-zinc-500 tabular-nums line-through">
                      R$ {originalPrice.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>
              )}
              {hasDiscount && (
                <div className="flex items-center gap-4 px-1">
                  <div className="w-5 shrink-0" />
                  <div className="flex-1 flex justify-between items-center">
                    <span className="text-[10px] text-emerald-400 font-medium">Desconto</span>
                    <span className="text-[13px] font-bold text-emerald-400 tabular-nums">
                      -R$ {coupon.discount_amount.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-4">
                <svg
                  className="w-5 h-5 text-[#C5A059] shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div className="flex-1 min-w-0 flex justify-between items-center">
                  <p className="text-[11px] text-zinc-500 font-medium">Valor</p>
                  <p className="text-[18px] font-black text-white tabular-nums">
                    R$ {totalPrice.toFixed(2).replace('.', ',')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

ReviewStep.displayName = 'ReviewStep';

export default ReviewStep;
