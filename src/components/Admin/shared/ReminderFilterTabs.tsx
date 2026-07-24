import { type FC } from 'react';
import { CircleCheck, CircleAlert } from 'lucide-react';

export type ReminderFilterValue = 'all' | 'sent' | 'pending';

export interface ReminderFilterTabsProps {
  activeFilter: ReminderFilterValue;
  onFilterChange: (filter: ReminderFilterValue) => void;
  counts: Record<ReminderFilterValue, number>;
}

const ReminderFilterTabs: FC<ReminderFilterTabsProps> = ({
  activeFilter,
  onFilterChange,
  counts,
}) => {
  const filters: {
    key: ReminderFilterValue;
    label: string;
    icon?: typeof CircleCheck;
    color?: string;
  }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'sent', label: 'Lembrados', icon: CircleCheck, color: 'text-emerald-400' },
    { key: 'pending', label: 'A Lembrar', icon: CircleAlert, color: 'text-amber-400' },
  ];

  return (
    <div role="tablist" className="flex gap-2">
      {filters.map((f) => {
        const active = activeFilter === f.key;
        const Icon = f.icon;
        return (
          <button
            key={f.key}
            role="tab"
            aria-selected={active}
            onClick={() => onFilterChange(f.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-bold transition-all duration-200 cursor-pointer ${
              active
                ? 'bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37]'
                : 'bg-white/[0.02] border border-white/[0.04] text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {Icon && <Icon size={12} className={active ? 'text-[#D4AF37]' : f.color} />}
            <span className="uppercase tracking-[0.1em]">{f.label}</span>
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded-md font-black ${
                active ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'bg-white/5 text-zinc-600'
              }`}
            >
              {counts[f.key]}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default ReminderFilterTabs;
