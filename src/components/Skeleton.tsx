import { type FC, type CSSProperties } from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circle' | 'rect';
  width?: string | number;
  height?: string | number;
}

/**
 * Base Skeleton component with shimmer animation.
 * Uses a gold-tinted shimmer for a premium feel.
 */
const Skeleton: FC<SkeletonProps> = ({ className = '', variant = 'text', width, height }) => {
  const baseClass =
    'animate-pulse bg-gradient-to-r from-white/[0.03] via-gold/20 to-white/[0.03] bg-[length:200%_100%] rounded';

  const variantClass = {
    text: 'h-4 rounded',
    circle: 'rounded-full',
    rect: 'rounded-xl',
  }[variant];

  const style: CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      data-testid="skeleton"
      className={`${baseClass} ${variantClass} ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
};

export const SkeletonCard: FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`bg-white/[0.02] border border-white/[0.04] rounded-2xl p-5 space-y-4 ${className}`}
    aria-busy="true"
    aria-label="Carregando conteúdo"
  >
    <Skeleton variant="rect" width="100%" height={100} className="mb-2" />
    <Skeleton variant="text" width="40%" height={20} />
    <Skeleton variant="text" width="100%" height={14} />
    <Skeleton variant="text" width="60%" height={14} />
  </div>
);

export const SkeletonList: FC<{ count?: number; className?: string }> = ({
  count = 5,
  className = '',
}) => (
  <div className={`space-y-3 ${className}`} aria-busy="true" aria-label="Carregando lista">
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="flex items-center gap-4 p-4 bg-white/[0.02] rounded-xl border border-white/[0.04]"
      >
        <Skeleton variant="circle" width={44} height={44} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="55%" height={15} />
          <Skeleton variant="text" width="35%" height={12} />
        </div>
        <Skeleton variant="rect" width={64} height={28} className="rounded-lg" />
      </div>
    ))}
  </div>
);

export const SkeletonDashboard: FC = () => (
  <div className="space-y-6" aria-busy="true" aria-label="Carregando painel">
    <div className="flex items-center justify-between">
      <Skeleton variant="text" width={200} height={28} />
      <Skeleton variant="rect" width={100} height={36} className="rounded-lg" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>
    <div className="flex gap-2 mb-4">
      <Skeleton variant="rect" width={80} height={32} className="rounded-lg" />
      <Skeleton variant="rect" width={80} height={32} className="rounded-lg" />
      <Skeleton variant="rect" width={80} height={32} className="rounded-lg" />
    </div>
    <SkeletonList count={5} />
  </div>
);

export const SkeletonClients: FC = () => (
  <div className="space-y-6" aria-busy="true" aria-label="Carregando clientes">
    <div className="flex items-center justify-between">
      <Skeleton variant="text" width={160} height={28} />
      <Skeleton variant="rect" width={120} height={40} className="rounded-xl" />
    </div>
    <Skeleton variant="rect" width="100%" height={48} className="rounded-xl" />
    <SkeletonList count={8} />
  </div>
);

export default Skeleton;
