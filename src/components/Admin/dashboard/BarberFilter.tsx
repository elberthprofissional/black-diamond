import { type FC } from 'react';
import { Users } from 'lucide-react';
import type { Barber } from '../../../types';

interface BarberFilterProps {
  selectedBarberId: string;
  onSelect: (barberId: string) => void;
  barbers: Barber[];
}

const BarberFilter: FC<BarberFilterProps> = ({ selectedBarberId, onSelect, barbers }) => {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 shrink-0">
        <Users size={12} className="text-zinc-500" />
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
          Filtro
        </span>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        <button
          onClick={() => onSelect('all')}
          className={`shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
            selectedBarberId === 'all'
              ? 'bg-[#D4AF37]/10 border-[#D4AF37]/40 text-[#D4AF37]'
              : 'bg-white/[0.02] border-white/[0.06] text-zinc-500 hover:text-zinc-300 hover:border-white/[0.12]'
          }`}
        >
          Todos os barbeiros
        </button>
        {barbers.map((barber) => (
          <button
            key={barber.id}
            onClick={() => onSelect(barber.id)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
              selectedBarberId === barber.id
                ? 'bg-[#D4AF37]/10 border-[#D4AF37]/40 text-[#D4AF37]'
                : 'bg-white/[0.02] border-white/[0.06] text-zinc-500 hover:text-zinc-300 hover:border-white/[0.12]'
            }`}
          >
            {barber.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default BarberFilter;
