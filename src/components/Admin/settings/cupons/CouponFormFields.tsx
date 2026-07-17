import { type FC, type RefObject } from 'react';
import { Check, DollarSign, Gift } from 'lucide-react';
import type { Service } from '../../../../types';

/** Limite maximo de caracteres para o codigo do cupom */
const MAX_CODE_LENGTH = 20;

/** Opcoes de tipo de desconto disponiveis */
const DISCOUNT_TYPES = [
  { value: 'fixed', label: 'Valor (R$)', icon: DollarSign },
  { value: 'free', label: 'Serviço Grátis', icon: Gift },
] as const;

export interface CouponFormFieldsProps {
  code: string;
  setCode: (v: string) => void;
  discountType: 'fixed' | 'free';
  setDiscountType: (v: 'fixed' | 'free') => void;
  discountValue: string;
  setDiscountValue: (v: string) => void;
  applicableServiceIds: string[];
  toggleService: (id: string) => void;
  services: Service[];
  codeInputRef: RefObject<HTMLInputElement | null>;
  validFrom: string;
  setValidFrom: (v: string) => void;
  validUntil: string;
  setValidUntil: (v: string) => void;
  maxUses: string;
  setMaxUses: (v: string) => void;
}

/** Formulario de criacao/edicao de cupom — compartilhado entre mobile (full screen) e desktop (modal) */
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
  validFrom,
  setValidFrom,
  validUntil,
  setValidUntil,
  maxUses,
  setMaxUses,
}) => (
  <>
    {/* ─── Codigo do Cupom ─── */}
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
        className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3.5 text-[15px] text-white font-bold tracking-wider outline-none focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/20 transition-all placeholder:text-zinc-600 placeholder:font-normal placeholder:tracking-normal uppercase"
      />
    </div>

    {/* ─── Tipo de Desconto ─── */}
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
              type="button"
              onClick={() => {
                setDiscountType(dt.value);
                if (dt.value === 'free') setDiscountValue('');
              }}
              className={`flex-1 py-3 rounded-xl text-[12px] font-semibold transition-all cursor-pointer border flex items-center justify-center gap-1.5 ${
                selected
                  ? 'bg-[#D4AF37]/[0.1] border-[#D4AF37]/30 text-[#D4AF37]'
                  : 'bg-white/[0.02] border-white/[0.06] text-zinc-500 hover:bg-white/[0.04]'
              }`}
            >
              <Icon size={14} /> {dt.label}
            </button>
          );
        })}
      </div>
    </div>

    {/* ─── Valor do Desconto (so para 'fixed') ─── */}
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
            onChange={(e) => setDiscountValue(e.target.value.replace(/[^\d.,]/g, ''))}
            placeholder="15,00"
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3.5 text-[15px] text-white outline-none focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/20 transition-all placeholder:text-zinc-600"
          />
        </div>
      </div>
    )}

    {/* ─── Seletor de Servicos (so para 'free') ─── */}
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
                type="button"
                onClick={() => toggleService(service.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all cursor-pointer rounded-xl border ${
                  selected
                    ? 'bg-[#D4AF37]/[0.08] border-[#D4AF37]/30'
                    : 'bg-white/[0.02] border-transparent hover:bg-white/[0.04]'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-md border-[1.5px] flex items-center justify-center transition-all shrink-0 ${
                    selected ? 'border-[#D4AF37] bg-[#D4AF37]' : 'border-white/20'
                  }`}
                >
                  {selected && <Check size={11} className="text-white stroke-[3]" />}
                </div>
                <span
                  className={`text-[13px] font-medium flex-1 ${selected ? 'text-[#D4AF37]' : 'text-zinc-200'}`}
                >
                  {service.name}
                </span>
                <span
                  className={`text-[12px] font-semibold tabular-nums ${selected ? 'text-[#D4AF37]' : 'text-zinc-500'}`}
                >
                  R$ {Number(service.price).toFixed(0)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    )}

    {/* ─── Validade e Limites ─── */}
    <div className="border-t border-white/[0.06] pt-5 space-y-4">
      <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
        Limites do cupom
      </span>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="text-[10px] text-zinc-500 font-medium">Início</label>
          <input
            type="date"
            value={validFrom}
            onChange={(e) => setValidFrom(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-[13px] text-white outline-none focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/20 transition-all [color-scheme:dark]"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] text-zinc-500 font-medium">Término</label>
          <input
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            min={validFrom}
            className={`w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-[13px] outline-none focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/20 transition-all [color-scheme:dark] ${validUntil ? 'text-white' : 'text-zinc-600'}`}
            placeholder="Sem prazo"
          />
        </div>
      </div>
      {!validUntil && <HelperText text="Sem data de expiração = válido por tempo indeterminado" />}

      <div className="space-y-2">
        <label className="text-[10px] text-zinc-500 font-medium">Limite de usos (opcional)</label>
        <input
          type="number"
          min="1"
          value={maxUses}
          onChange={(e) => setMaxUses(e.target.value.replace(/\D/g, '').slice(0, 5))}
          placeholder="Ilimitado"
          className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-[13px] outline-none focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/20 transition-all [color-scheme:dark] text-white placeholder:text-zinc-600"
        />
        {!maxUses && <HelperText text="Sem limite = pode ser usado quantas vezes quiser" />}
      </div>
    </div>
  </>
);

/** Texto de ajuda com icone de informacao */
const HelperText: FC<{ text: string }> = ({ text }) => (
  <p className="text-[10px] text-zinc-600 flex items-center gap-1">
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
    {text}
  </p>
);

export default CouponFormFields;
