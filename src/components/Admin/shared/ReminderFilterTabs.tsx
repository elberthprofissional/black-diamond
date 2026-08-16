import { type FC } from 'react';
import { Crown, AlertTriangle } from 'lucide-react';
type ReminderFilterValue = 'all' | 'sent' | 'pending' | 'mensalistas' | 'vencendo';

interface ReminderFilterTabsProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  counts: { all: number; pending: number; sent: number; mensalistas: number; vencendo: number };
}

const ReminderFilterTabs: FC<ReminderFilterTabsProps> = ({
  activeFilter,
  onFilterChange,
  counts,
}) => {
  const filters: {
    key: ReminderFilterValue;
    label: string;
    icon?: typeof Crown;
  }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'sent', label: 'Lembrados' },
    { key: 'pending', label: 'A Lembrar' },
    { key: 'mensalistas', label: 'Mensalistas', icon: Crown },
    { key: 'vencendo', label: 'Vencendo', icon: AlertTriangle },
  ];

  return (
    <div
      role="tablist"
      className="flex flex-wrap gap-2 lg:flex-nowrap lg:gap-6 lg:overflow-x-auto scrollbar-hide pb-1"
    >
      {filters.map((f) => {
        const active = activeFilter === f.key;
        const Icon = f.icon;
        return (
          <button
            key={f.key}
            role="tab"
            aria-selected={active}
            onClick={() => onFilterChange(f.key)}
            className={`relative px-3 py-2 rounded-full lg:rounded-none lg:px-0 lg:pb-2 text-[10px] lg:text-[11px] font-bold transition-all duration-200 cursor-pointer uppercase tracking-[0.1em] whitespace-nowrap flex items-center gap-1.5 ${
              active
                ? 'bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] lg:bg-transparent lg:border-none'
                : 'bg-white/[0.02] border border-white/[0.04] text-zinc-500 hover:text-zinc-300 lg:bg-transparent lg:border-none'
            } ${f.key === 'vencendo' && active ? 'text-amber-400' : ''}`}
          >
            {Icon && <Icon size={11} />}
            <span className="flex items-center gap-1.5 lg:gap-2">
              {f.label}
              <span
                className={`text-[10px] lg:text-[10px] px-1.5 py-0.5 rounded-md font-black ${
                  active ? 'bg-current/20 text-current' : 'bg-white/5 text-zinc-600'
                }`}
              >
                {counts[f.key as keyof typeof counts]}
              </span>
            </span>
            {active && (
              <div className="hidden lg:block absolute bottom-0 left-0 right-0 h-[2px] bg-[#D4AF37] rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default ReminderFilterTabs;
