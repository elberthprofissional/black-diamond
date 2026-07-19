import { type FC } from 'react';

export type ReminderFilterValue = 'all' | 'pending' | 'sent' | 'inactive';

export interface ReminderFilterTabsProps {
  activeFilter: ReminderFilterValue;
  onFilterChange: (filter: ReminderFilterValue) => void;
  counts: Record<ReminderFilterValue, number>;
}

const FILTER_LABELS: Record<ReminderFilterValue, string> = {
  all: 'Todos',
  pending: 'A Lembrar',
  sent: 'Lembrados',
  inactive: 'Inativos',
};

const FILTER_ORDER: ReminderFilterValue[] = ['all', 'pending', 'sent', 'inactive'];

const ReminderFilterTabs: FC<ReminderFilterTabsProps> = ({
  activeFilter,
  onFilterChange,
  counts,
}) => {
  return (
    <div role="tablist" className="flex gap-2">
      {FILTER_ORDER.map((filter) => {
        const active = activeFilter === filter;
        return (
          <button
            key={filter}
            role="tab"
            aria-selected={active}
            onClick={() => onFilterChange(filter)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-semibold transition-all duration-200 cursor-pointer border ${
              active
                ? 'bg-[#D4AF37]/10 border-[#D4AF37]/30 text-[#D4AF37] shadow-[0_0_12px_rgba(197,160,89,0.1)]'
                : 'bg-white/[0.02] border-white/[0.04] text-zinc-500 hover:text-zinc-300 hover:border-white/[0.08]'
            }`}
          >
            <span>{FILTER_LABELS[filter]}</span>
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold transition-colors ${
                active ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'bg-white/5 text-zinc-600'
              }`}
            >
              {counts[filter]}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default ReminderFilterTabs;
