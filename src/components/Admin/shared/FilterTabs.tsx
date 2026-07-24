import { type FC } from 'react';

export type FilterValue = 'occupied' | 'free' | 'blocked';

export interface FilterTabsProps {
  filter: FilterValue;
  setFilter: (filter: FilterValue) => void;
  layoutId: string;
  occupiedCount: number;
  freeCount: number;
  blockedCount: number;
}

const FILTERS: { key: FilterValue; label: string }[] = [
  { key: 'occupied', label: 'Ocupados' },
  { key: 'free', label: 'Livres' },
  { key: 'blocked', label: 'Bloqueados' },
];

const FilterTabs: FC<FilterTabsProps> = ({
  filter,
  setFilter,
  layoutId,
  occupiedCount,
  freeCount,
  blockedCount,
}) => {
  const counts: Record<FilterValue, number> = {
    occupied: occupiedCount,
    free: freeCount,
    blocked: blockedCount,
  };

  return (
    <div role="tablist" className="flex gap-2">
      {FILTERS.map(({ key, label }) => {
        const active = filter === key;
        return (
          <button
            key={key}
            role="tab"
            aria-selected={active}
            onClick={() => setFilter(key)}
            data-testid={`${layoutId}-${key}`}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-bold transition-all duration-200 cursor-pointer ${
              active
                ? 'bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37]'
                : 'bg-white/[0.02] border border-white/[0.04] text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <span className="uppercase tracking-[0.1em]">{label}</span>
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded-md font-black ${
                active ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'bg-white/5 text-zinc-600'
              }`}
            >
              {counts[key]}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default FilterTabs;
