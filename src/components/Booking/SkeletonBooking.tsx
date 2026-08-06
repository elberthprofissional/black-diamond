import { type FC } from 'react';

interface SkeletonBookingProps {
  layout: 'desktop' | 'mobile';
  submitting?: boolean;
}

/** Barra de shimmer com gradiente dourado */
const ShimmerBar: FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`bg-gradient-to-r from-white/[0.03] via-gold/20 to-white/[0.03] bg-[length:200%_100%] animate-pulse rounded ${className}`}
  />
);

const SkeletonBooking: FC<SkeletonBookingProps> = ({ layout, submitting }) => {
  if (layout === 'desktop') {
    return (
      <div
        className="flex-1 flex items-center justify-center relative"
        aria-busy="true"
        aria-label={submitting ? 'Enviando agendamento' : 'Carregando formulário de agendamento'}
      >
        {/* Overlay de submissão */}
        {submitting && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-10 flex items-center justify-center rounded-2xl">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
              <span className="text-[12px] text-gold font-semibold uppercase tracking-widest animate-pulse">
                Confirmando...
              </span>
            </div>
          </div>
        )}

        <div className="w-full max-w-lg space-y-8">
          {/* Header skeleton */}
          <div className="space-y-4">
            <ShimmerBar className="h-7 w-48" />
            <ShimmerBar className="h-4 w-64" />
          </div>

          {/* Form fields */}
          <div className="space-y-8">
            <div className="space-y-4">
              <ShimmerBar className="h-3 w-12" />
              <ShimmerBar className="h-12 w-full" />
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <ShimmerBar className="h-3 w-20" />
              </div>
              <ShimmerBar className="h-12 w-full" />
            </div>
          </div>

          {/* Coupon skeleton */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <ShimmerBar className="h-3 w-40" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="space-y-4 pb-4 relative"
      aria-busy="true"
      aria-label={submitting ? 'Enviando agendamento' : 'Carregando formulário de agendamento'}
    >
      {/* Overlay de submissão */}
      {submitting && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-2xl">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
            <span className="text-[11px] text-gold font-semibold uppercase tracking-widest animate-pulse">
              Confirmando...
            </span>
          </div>
        </div>
      )}

      {/* Banner skeleton */}
      <div className="h-28 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
        <ShimmerBar className="h-full w-full" />
      </div>

      {/* Form fields */}
      <div className="space-y-4">
        <div className="space-y-2">
          <ShimmerBar className="h-3 w-12" />
          <ShimmerBar className="h-[50px] w-full" />
        </div>
        <div className="space-y-2">
          <ShimmerBar className="h-3 w-20" />
          <ShimmerBar className="h-[50px] w-full" />
        </div>
        <div className="flex items-center justify-end gap-2 pt-1">
          <ShimmerBar className="h-3 w-36" />
        </div>
      </div>

      {/* Services skeleton */}
      <div className="space-y-4 pt-4">
        <ShimmerBar className="h-3 w-24" />
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/[0.04] rounded-xl"
          >
            <div className="space-y-2">
              <ShimmerBar className="h-4 w-32" />
              <ShimmerBar className="h-3 w-16" />
            </div>
            <div className="w-11 h-6">
              <ShimmerBar className="h-full w-full rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SkeletonBooking;
