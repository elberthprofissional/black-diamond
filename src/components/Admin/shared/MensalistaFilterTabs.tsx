import { type FC } from 'react';
import { Crown, AlertTriangle } from 'lucide-react';

interface MensalistaFilterTabsProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  counts: { mensalistas: number; vencendo: number };
}

const MensalistaFilterTabs: FC<MensalistaFilterTabsProps> = ({
  activeFilter,
  onFilterChange,
  counts,
}) => {
  const filters: {
    key: string;
    label: string;
    icon: typeof Crown;
  }[] = [
    { key: 'mensalistas', label: 'Mensalistas', icon: Crown },
    { key: 'vencendo', label: 'Vencendo', icon: AlertTriangle },
  ];

  return (
    <div role="tablist" className="flex gap-2 lg:gap-6">
      {filters.map((f) => {
        const Icon = f.icon;
        const active = activeFilter === f.key;
        return (
          <button
            key={f.key}
            role="tab"
            aria-selected={active}
            onClick={() => onFilterChange(f.key)}
            className={`relative px-3 py-2 rounded-full lg:rounded-none lg:px-0 lg:pb-2 text-[10px] lg:text-[11px] font-bold transition-all duration-200 cursor-pointer uppercase tracking-[0.1em] whitespace-nowrap flex items-center gap-1.5 ${
              active
                ? 'bg-gold/10 border border-gold/30 text-gold lg:bg-transparent lg:border-none'
                : 'bg-white/[0.02] border border-white/[0.04] text-zinc-500 hover:text-zinc-300 lg:bg-transparent lg:border-none'
            } ${f.key === 'vencendo' && active ? 'text-amber-400' : ''}`}
          >
            <Icon size={12} />
            <span className="flex items-center gap-1.5 lg:gap-2">
              {f.label}
              <span
                className={`text-[8px] lg:text-[9px] px-1.5 py-0.5 rounded-md font-black ${
                  active ? 'bg-current/20 text-current' : 'bg-white/5 text-zinc-600'
                }`}
              >
                {counts[f.key as keyof typeof counts]}
              </span>
            </span>
            {active && (
              <div className="hidden lg:block absolute bottom-0 left-0 right-0 h-[2px] bg-gold rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default MensalistaFilterTabs;
