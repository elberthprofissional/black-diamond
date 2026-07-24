import { type FC } from 'react';
import { CheckCircle, XCircle, UserX } from 'lucide-react';

interface DaySummaryProps {
  totalCount: number;
  completedCount: number;
  cancelledCount: number;
  noShowCount: number;
}

const DaySummary: FC<DaySummaryProps> = ({
  totalCount,
  completedCount,
  cancelledCount,
  noShowCount,
}) => {
  if (totalCount === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 sm:gap-5">
      <div className="flex items-center gap-3 sm:gap-4">
        {completedCount > 0 && (
          <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400">
            <CheckCircle size={11} />
            {completedCount}
          </span>
        )}
        {cancelledCount > 0 && (
          <span className="flex items-center gap-1.5 text-[10px] font-bold text-red-400">
            <XCircle size={11} />
            {cancelledCount}
          </span>
        )}
        {noShowCount > 0 && (
          <span className="flex items-center gap-1.5 text-[10px] font-bold text-amber-400">
            <UserX size={11} />
            {noShowCount}
          </span>
        )}
      </div>
    </div>
  );
};

export default DaySummary;
