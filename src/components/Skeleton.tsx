import { type FC, type CSSProperties } from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circle' | 'rect';
  width?: string | number;
  height?: string | number;
}

const Skeleton: FC<SkeletonProps> = ({ className = '', variant = 'text', width, height }) => {
  const baseClass = 'animate-pulse bg-white/[0.04] rounded';

  const variantClass = {
    text: 'h-4 rounded',
    circle: 'rounded-full',
    rect: 'rounded-xl',
  }[variant];

  const style: CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return <div className={`${baseClass} ${variantClass} ${className}`} style={style} />;
};

export const SkeletonCard: FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`bg-white/[0.02] border border-white/[0.04] rounded-2xl p-5 space-y-4 ${className}`}
  >
    <Skeleton variant="text" width="40%" height={20} />
    <Skeleton variant="text" width="100%" height={16} />
    <Skeleton variant="text" width="60%" height={16} />
  </div>
);

export const SkeletonList: FC<{ count?: number; className?: string }> = ({
  count = 5,
  className = '',
}) => (
  <div className={`space-y-3 ${className}`}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex items-center gap-4 py-3">
        <Skeleton variant="circle" width={40} height={40} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="60%" height={14} />
          <Skeleton variant="text" width="40%" height={12} />
        </div>
      </div>
    ))}
  </div>
);

export const SkeletonDashboard: FC = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <Skeleton variant="text" width={200} height={28} />
      <Skeleton variant="rect" width={100} height={36} />
    </div>
    <div className="grid grid-cols-3 gap-4">
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>
    <SkeletonList count={8} />
  </div>
);

export const SkeletonBooking: FC = () => (
  <div className="space-y-6">
    <div className="flex items-center gap-4">
      <Skeleton variant="circle" width={44} height={44} />
      <div className="space-y-2">
        <Skeleton variant="text" width={180} height={24} />
        <Skeleton variant="text" width={120} height={14} />
      </div>
    </div>
    <div className="flex gap-2">
      <Skeleton variant="rect" width={100} height={40} />
      <Skeleton variant="rect" width={100} height={40} />
      <Skeleton variant="rect" width={100} height={40} />
    </div>
    <SkeletonCard className="min-h-[400px]" />
  </div>
);

export const SkeletonClients: FC = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <Skeleton variant="text" width={160} height={28} />
      <Skeleton variant="rect" width={120} height={40} />
    </div>
    <Skeleton variant="rect" width="100%" height={48} />
    <SkeletonList count={10} />
  </div>
);

export default Skeleton;
