import { Tag, X } from 'lucide-react';
import { type FC } from 'react';

interface CouponBadgeProps {
  code: string;
  discountAmount: number;
  onRemove: () => void;
  variant?: 'default' | 'compact';
}

const CouponBadge: FC<CouponBadgeProps> = ({
  code,
  discountAmount,
  onRemove,
  variant = 'default',
}) => {
  if (variant === 'compact') {
    return (
      <div className="flex items-center justify-between bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-xl px-3 py-2">
        <div className="flex items-center gap-2">
          <Tag size={13} className="text-[#D4AF37]" />
          <span className="text-[12px] font-bold text-[#D4AF37] tracking-wider">{code}</span>
          {discountAmount > 0 && (
            <span className="text-[10px] text-[#D4AF37]/70">
              -R$ {discountAmount.toFixed(2).replace('.', ',')}
            </span>
          )}
        </div>
        <button
          onClick={onRemove}
          className="p-1 hover:bg-white/[0.06] rounded cursor-pointer"
          aria-label="Remover cupom"
        >
          <X size={12} className="text-zinc-500" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-xl px-4 py-3">
      <div className="flex items-center gap-2">
        <Tag size={14} className="text-[#D4AF37]" />
        <span className="text-[12px] font-semibold text-[#D4AF37]">{code}</span>
        <span className="text-[11px] text-zinc-400">
          -R$ {discountAmount.toFixed(2).replace('.', ',')}
        </span>
      </div>
      <button
        onClick={onRemove}
        className="text-[10px] text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
        aria-label="Remover cupom"
      >
        Remover
      </button>
    </div>
  );
};

export default CouponBadge;
