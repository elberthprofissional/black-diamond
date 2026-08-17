import { useState, type FC } from 'react';
import { useNavigate } from 'react-router';
import { CalendarCheck, Check, ChevronDown, Loader2, Tag } from 'lucide-react';
import type { Coupon, RedeemedCoupon } from '../types';

interface ClientProfileCouponsProps {
  coupons: Coupon[];
  couponsError: string;
  redeemedCoupons: RedeemedCoupon[];
  redeemingCode: string;
  onRedeem: (code: string) => Promise<string | null>;
}

/** Formata o destaque do desconto: R$ 11 OFF / 10% OFF / GRÁTIS. */
function formatDiscount(c: { discount_type: string; discount_value: number }): string {
  if (c.discount_type === 'percentage') return `${c.discount_value}% OFF`;
  if (c.discount_type === 'fixed') {
    // Formato monetário brasileiro: milhar com ponto (1.500) e centavos com
    // vírgula (10,50). Inteiros sem ",00" — ex.: 111 → "R$ 111 OFF".
    const v = Number(c.discount_value);
    const formatted = Number.isInteger(v)
      ? v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
      : v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `R$ ${formatted} OFF`;
  }
  return 'GRÁTIS';
}

function formatDateBR(date: string): string {
  return new Date(date).toLocaleDateString('pt-BR');
}

const goldButtonClass =
  'text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-black bg-[#d4af37] hover:brightness-110 px-2.5 py-1 rounded-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap';

/* ─── Card ticket — oferta disponível (estilo Shopee) ─── */

interface CouponTicketProps {
  coupon: Coupon;
  redeemed: boolean;
  isRedeeming: boolean;
  onRedeem: (code: string) => void;
}

function CouponTicket({ coupon, redeemed, isRedeeming, onRedeem }: CouponTicketProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="coupon-ticket relative bg-[#141414] border border-white/[0.06] hover:border-gold/20 rounded-2xl px-3 pt-2.5 pb-2.5 flex flex-col transition-colors">
      {/* Parte superior — ícone + status + texto auxiliar */}
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-md bg-gold/10 flex items-center justify-center shrink-0">
          <Tag size={10} className="text-gold" />
        </div>
        <div className="min-w-0">
          <p className="text-[7px] sm:text-[8px] font-bold uppercase tracking-[0.12em] text-emerald-400 leading-none">
            Oferta disponível
          </p>
          <p className="text-[7px] text-zinc-500 mt-0.5 truncate">
            {coupon.valid_until
              ? `Válido até ${formatDateBR(coupon.valid_until)}`
              : 'Sem expiração'}
          </p>
        </div>
      </div>

      {/* Parte central — código à esquerda, desconto em destaque à direita */}
      <div className="mt-2 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] sm:text-[11px] font-bold text-white uppercase tracking-wider truncate">
            {coupon.code}
          </p>
          <p className="text-[7px] sm:text-[8px] text-zinc-500 mt-0.5 truncate">
            {coupon.description}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[13px] sm:text-[14px] font-black text-gold leading-none whitespace-nowrap">
            {formatDiscount(coupon)}
          </p>
          <p className="text-[7px] text-zinc-500 mt-0.5">Em serviços selecionados</p>
        </div>
      </div>

      {/* Rodapé — divisão tracejada + condições + resgatar */}
      <div className="mt-2 pt-2 border-t border-dashed border-white/10 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-[7px] sm:text-[8px] text-zinc-500 hover:text-white transition-colors cursor-pointer flex items-center gap-0.5"
        >
          {expanded ? 'Ocultar' : 'Ver condições'}
          <ChevronDown
            size={9}
            className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </button>
        {redeemed ? (
          <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-wider inline-flex items-center gap-1 whitespace-nowrap">
            <Check size={9} /> Resgatado
          </span>
        ) : (
          <button
            type="button"
            onClick={() => onRedeem(coupon.code)}
            disabled={isRedeeming}
            className={goldButtonClass}
          >
            {isRedeeming ? <Loader2 size={9} className="animate-spin" /> : 'RESGATAR'}
          </button>
        )}
      </div>

      {/* Condições expandidas */}
      {expanded && (
        <div className="mt-2 pt-1.5 border-t border-white/[0.04] text-[7px] sm:text-[8px] text-zinc-500 space-y-1">
          <p>
            Validade:{' '}
            {coupon.valid_until ? `até ${formatDateBR(coupon.valid_until)}` : 'sem data limite'}
          </p>
          <p>
            Usos:{' '}
            {coupon.max_uses ? `${coupon.current_uses}/${coupon.max_uses} utilizados` : 'ilimitado'}
          </p>
          {coupon.applicable_service_ids.length > 0 && (
            <p>Aplicável apenas aos serviços selecionados</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Card ticket — cupom resgatado ─── */

interface RedeemedCouponTicketProps {
  coupon: RedeemedCoupon;
  isValid: boolean;
}

function RedeemedCouponTicket({ coupon, isValid }: RedeemedCouponTicketProps) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const status = coupon.used_at
    ? { label: 'Usado', className: 'text-zinc-500' }
    : isValid
      ? { label: 'Disponível', className: 'text-emerald-400' }
      : { label: 'Expirado', className: 'text-zinc-500' };

  return (
    <div className="coupon-ticket relative bg-[#141414] border border-white/[0.06] hover:border-gold/20 rounded-2xl px-3 pt-2.5 pb-2.5 flex flex-col transition-colors">
      {/* Parte superior */}
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-md bg-emerald-500/10 flex items-center justify-center shrink-0">
          <Check size={10} className="text-emerald-500" />
        </div>
        <div className="min-w-0">
          <p
            className={`text-[7px] sm:text-[8px] font-bold uppercase tracking-[0.12em] leading-none ${status.className}`}
          >
            {status.label}
          </p>
          <p className="text-[7px] text-zinc-500 mt-0.5 truncate">
            Resgatado em {formatDateBR(coupon.redeemed_at)}
          </p>
        </div>
      </div>

      {/* Parte central */}
      <div className="mt-2 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] sm:text-[11px] font-bold text-white uppercase tracking-wider truncate">
            {coupon.code}
          </p>
          <p className="text-[7px] sm:text-[8px] text-zinc-500 mt-0.5 truncate">
            {coupon.description}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[13px] sm:text-[14px] font-black text-gold leading-none whitespace-nowrap">
            {formatDiscount(coupon)}
          </p>
          <p className="text-[7px] text-zinc-500 mt-0.5">Em serviços selecionados</p>
        </div>
      </div>

      {/* Rodapé */}
      <div className="mt-2 pt-2 border-t border-dashed border-white/10 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-[7px] sm:text-[8px] text-zinc-500 hover:text-white transition-colors cursor-pointer flex items-center gap-0.5"
        >
          {expanded ? 'Ocultar' : 'Ver condições'}
          <ChevronDown
            size={9}
            className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </button>
        {isValid && (
          <button
            type="button"
            onClick={() => navigate(`/agendar?coupon=${encodeURIComponent(coupon.code)}`)}
            className={goldButtonClass}
          >
            USAR CUPOM
          </button>
        )}
      </div>

      {/* Condições expandidas */}
      {expanded && (
        <div className="mt-2 pt-1.5 border-t border-white/[0.04] text-[7px] sm:text-[8px] text-zinc-500 space-y-1">
          <p>
            Validade:{' '}
            {coupon.valid_until ? `até ${formatDateBR(coupon.valid_until)}` : 'sem data limite'}
          </p>
          <p>
            Usos:{' '}
            {coupon.max_uses ? `${coupon.current_uses}/${coupon.max_uses} utilizados` : 'ilimitado'}
          </p>
          {coupon.used_at && <p>Utilizado em {formatDateBR(coupon.used_at)}</p>}
        </div>
      )}
    </div>
  );
}

/* ─── Tela Meus Cupons ─── */

const ClientProfileCoupons: FC<ClientProfileCouponsProps> = ({
  coupons,
  couponsError,
  redeemedCoupons,
  redeemingCode,
  onRedeem,
}) => {
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const hasContent = coupons.length > 0 || redeemedCoupons.length > 0;

  const handleRedeemClick = async (code: string) => {
    const errorMsg = await onRedeem(code);
    setFeedback(
      errorMsg
        ? { type: 'error', text: errorMsg }
        : { type: 'ok', text: 'Cupom resgatado! Use no agendamento.' }
    );
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="pb-4 border-b border-white/[0.06]">
        <h1 className="text-lg lg:text-2xl font-bold tracking-tight text-white uppercase">
          MEUS CUPONS
        </h1>
        <p className="text-[13px] text-zinc-500 mt-1">
          Resgate ofertas com 1 clique e use no seu agendamento.
        </p>
      </div>

      {/* Erro ao carregar a vitrine (ex.: migrations não aplicadas) */}
      {couponsError && !hasContent && (
        <div className="rounded-2xl p-3.5 text-[12px] font-medium border bg-red-500/10 border-red-500/20 text-red-400">
          {couponsError}
        </div>
      )}

      {/* Feedback inline do resgate */}
      {feedback && (
        <div
          className={`rounded-2xl p-3.5 text-[12px] font-medium border ${
            feedback.type === 'ok'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {!hasContent ? (
        /* ── Estado vazio — barbeiro ainda não publicou cupons ── */
        <div className="bg-[#111111] border border-white/[0.06] rounded-2xl p-10 sm:p-12 lg:p-16 text-center">
          <div className="w-20 h-20 rounded-2xl bg-emerald-500/[0.04] border border-emerald-500/10 flex items-center justify-center mx-auto mb-5">
            <CalendarCheck size={32} className="text-emerald-500/70" />
          </div>
          <p className="text-[16px] sm:text-[18px] font-bold text-zinc-300 mb-2">
            Nenhum cupom disponível no momento
          </p>
          <p className="text-[13px] sm:text-[14px] text-zinc-600 mb-6">
            Fique de olho — as ofertas da Black Diamond aparecem aqui.
          </p>
          <button
            onClick={() => navigate('/agendar')}
            className="btn-gold inline-flex items-center gap-2 px-8 h-12"
          >
            <CalendarCheck size={16} />
            Agendar Horário
          </button>
        </div>
      ) : (
        <>
          {/* ── Ofertas disponíveis — grid 2 colunas estilo Shopee ── */}
          {coupons.length > 0 && (
            <section>
              <div className="flex items-center gap-2.5 mb-2.5">
                <CalendarCheck size={14} className="text-gold" />
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-300">
                  Ofertas disponíveis
                </p>
              </div>
              <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-2.5">
                {coupons.map((c) => (
                  <CouponTicket
                    key={c.id}
                    coupon={c}
                    redeemed={redeemedCoupons.some((r) => r.coupon_id === c.id)}
                    isRedeeming={redeemingCode === c.code}
                    onRedeem={(code) => void handleRedeemClick(code)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ── Meus resgates — mesma identidade de ticket ── */}
          {redeemedCoupons.length > 0 && (
            <section>
              <div className="flex items-center gap-2.5 mb-2.5">
                <Tag size={13} className="text-gold" />
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-300">
                  Meus resgates
                </p>
              </div>
              <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-2.5">
                {redeemedCoupons.map((r) => (
                  <RedeemedCouponTicket
                    key={r.id}
                    coupon={r}
                    isValid={
                      !r.used_at &&
                      r.is_active &&
                      (!r.valid_until || new Date(r.valid_until) >= new Date())
                    }
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};

export default ClientProfileCoupons;
