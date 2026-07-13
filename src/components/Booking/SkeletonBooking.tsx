import { type FC } from 'react';

interface SkeletonBookingProps {
  layout: 'desktop' | 'mobile';
}

const SkeletonBooking: FC<SkeletonBookingProps> = ({ layout }) => {
  if (layout === 'desktop') {
    return (
      <div
        className="flex-1 flex items-center justify-center"
        aria-busy="true"
        aria-label="Carregando formulário de agendamento"
      >
        <div className="w-full max-w-lg space-y-10">
          {/* Header skeleton */}
          <div className="space-y-3">
            <div className="h-7 w-48 bg-white/[0.04] rounded-lg animate-pulse" />
            <div className="h-4 w-64 bg-white/[0.03] rounded animate-pulse" />
          </div>

          {/* Form fields */}
          <div className="space-y-8">
            {/* Nome field */}
            <div className="space-y-3">
              <div className="h-3 w-12 bg-white/[0.04] rounded animate-pulse" />
              <div className="h-12 w-full bg-white/[0.03] rounded-lg animate-pulse" />
            </div>

            {/* WhatsApp field */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-3 w-20 bg-white/[0.04] rounded animate-pulse" />
              </div>
              <div className="h-12 w-full bg-white/[0.03] rounded-lg animate-pulse" />
            </div>
          </div>

          {/* Coupon skeleton */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <div className="h-3 w-40 bg-white/[0.03] rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="space-y-5 pb-4"
      aria-busy="true"
      aria-label="Carregando formulário de agendamento"
    >
      {/* Banner skeleton */}
      <div className="h-28 rounded-2xl bg-white/[0.02] border border-white/[0.04] animate-pulse" />

      {/* Form fields */}
      <div className="space-y-5">
        {/* Nome */}
        <div className="space-y-2">
          <div className="h-3 w-12 bg-white/[0.04] rounded animate-pulse" />
          <div className="h-[50px] w-full bg-white/[0.03] rounded-xl animate-pulse" />
        </div>

        {/* WhatsApp */}
        <div className="space-y-2">
          <div className="h-3 w-20 bg-white/[0.04] rounded animate-pulse" />
          <div className="h-[50px] w-full bg-white/[0.03] rounded-xl animate-pulse" />
        </div>

        {/* Coupon */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <div className="h-3 w-36 bg-white/[0.03] rounded animate-pulse" />
        </div>
      </div>

      {/* Services skeleton (mostra hints dos serviços) */}
      <div className="space-y-3 pt-4">
        <div className="h-3 w-24 bg-white/[0.04] rounded animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/[0.04] rounded-xl animate-pulse"
          >
            <div className="space-y-2">
              <div className="h-4 w-32 bg-white/[0.04] rounded animate-pulse" />
              <div className="h-3 w-16 bg-white/[0.03] rounded animate-pulse" />
            </div>
            <div className="w-11 h-6 bg-white/[0.04] rounded-full animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default SkeletonBooking;
