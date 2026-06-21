import React from 'react';
import { motion } from 'framer-motion';

type FilterType = 'occupied' | 'free' | 'blocked';

interface FilterTabsProps {
  filter: FilterType;
  setFilter: (filter: FilterType) => void;
  layoutId: string;
}

const tabs = [
  { value: 'occupied' as const, label: 'Ocupados' },
  { value: 'free' as const, label: 'Livres' },
  { value: 'blocked' as const, label: 'Bloqueados' }
];

const FilterTabs: React.FC<FilterTabsProps> = ({ filter, setFilter, layoutId }) => {
  return (
    <div className="flex gap-4 sm:gap-6 w-full sm:w-auto">
      {tabs.map((f) => {
        const active = filter === f.value;
        return (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`relative pb-2 text-center text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
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
            {f.label}
          </button>
        );
      })}
    </div>
  );
};

export default FilterTabs;
