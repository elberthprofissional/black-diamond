import { type FC } from 'react';
import { motion } from 'framer-motion';
import { User } from 'lucide-react';
import type { Barber } from '../../types';

interface BarberStepProps {
  barbers: Barber[];
  selectedBarberId: string | null;
  onSelect: (barberId: string) => void;
  layout: 'desktop' | 'mobile';
}

const BarberStep: FC<BarberStepProps> = ({ barbers, selectedBarberId, onSelect, layout }) => {
  // Se só tem 1 barbeiro ou nenhum, não mostra a tela de seleção
  if (barbers.length <= 1) return null;

  return (
    <div className={layout === 'mobile' ? 'space-y-4 w-full' : 'space-y-5'}>
      <div className="flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-lg bg-[#C5A059]/10 flex items-center justify-center">
          <User size={13} className="text-[#C5A059]" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">Escolha o Profissional</h3>
          <p className="text-[10px] text-zinc-500">Selecione quem vai te atender</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2.5">
        {barbers.map((barber, index) => {
          const isSelected = selectedBarberId === barber.id;
          return (
            <motion.button
              key={barber.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onSelect(barber.id)}
              data-selected={isSelected ? 'true' : 'false'}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all text-left cursor-pointer ${
                isSelected
                  ? 'bg-[#C5A059]/10 border-[#C5A059]/40 shadow-[0_0_20px_rgba(197,160,89,0.08)]'
                  : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] hover:border-white/10'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  isSelected ? 'bg-[#C5A059]/20' : 'bg-zinc-800'
                }`}
              >
                {barber.photo_url ? (
                  <img
                    src={barber.photo_url}
                    alt={barber.name}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <User size={16} className={isSelected ? 'text-[#C5A059]' : 'text-zinc-500'} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span
                  className={`text-[13px] font-bold block truncate ${
                    isSelected ? 'text-white' : 'text-zinc-200'
                  }`}
                >
                  {barber.name}
                </span>
              </div>
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-5 h-5 rounded-full bg-[#C5A059] flex items-center justify-center"
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="black"
                    strokeWidth="3"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default BarberStep;
