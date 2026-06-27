import React from 'react';
import { motion } from 'framer-motion';

type FilterType = 'occupied' | 'free' | 'blocked';

interface FilterTabsProps {
  filter: FilterType;
  setFilter: (filter: FilterType) => void;
  layoutId: string;
  occupiedCount?: number;
  freeCount?: number;
  blockedCount?: number;
}

const FilterTabs: React.FC<FilterTabsProps> = React.memo(({ 
  filter, 
  setFilter, 
  layoutId,
  occupiedCount = 0,
  freeCount = 0,
  blockedCount = 0
}) => {
  const tabs = [
    { value: 'occupied' as const, label: 'Ocupados', count: occupiedCount },
    { value: 'free' as const, label: 'Livres', count: freeCount },
    { value: 'blocked' as const, label: 'Bloqueados', count: blockedCount }
  ];

  return (
    <div className="flex gap-4 sm:gap-6 w-full sm:w-auto" role="tablist" aria-label="Filtros de agendamento">
      {tabs.map((f) => {
        const active = filter === f.value;
        return (
          <button
            key={f.value}
            role="tab"
            aria-selected={active}
            aria-controls={`panel-${f.value}`}
            onClick={() => setFilter(f.value)}
            className={`relative pb-2 text-center text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1.5 ${
              active ? 'text-[#C5A059]' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {active && (
              <motion.div
                layoutId={layoutId}
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#C5A059] rounded-full"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <span>{f.label}</span>
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all ${
              active 
                ? 'bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/20' 
                : 'bg-white/[0.02] text-zinc-500 border border-transparent'
            }`}>
              {f.count}
            </span>
          </button>
        );
      })}
    </div>
  );
});

FilterTabs.displayName = 'FilterTabs';

export default FilterTabs;
