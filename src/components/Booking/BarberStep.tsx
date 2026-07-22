import { useState, useEffect, type FC } from 'react';
import { motion } from 'framer-motion';
import { User, Check } from 'lucide-react';
import { getBarbers } from '../../lib/api/barbers';
import { logError } from '../../lib/logger';
import type { Barber } from '../../types';

interface BarberStepProps {
  selectedBarber: Barber | null;
  onSelectBarber: (barber: Barber) => void;
  layout: 'desktop' | 'mobile';
}

const BarberStep: FC<BarberStepProps> = ({ selectedBarber, onSelectBarber, layout }) => {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getBarbers()
      .then((data) => {
        if (active) setBarbers(data);
      })
      .catch((e) => {
        logError(e, 'BarberStep');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Se so tem 1 barbeiro, seleciona automaticamente
  useEffect(() => {
    if (barbers.length === 1 && !selectedBarber) {
      onSelectBarber(barbers[0]!);
    }
  }, [barbers, selectedBarber, onSelectBarber]);

  if (loading) {
    return (
      <div className={`${layout === 'mobile' ? 'space-y-4' : 'space-y-6'}`}>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white">Quem vai te atender?</h2>
          <p className="text-sm text-zinc-500">Escolha o barbeiro de sua preferência.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-white/[0.03] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Se so tem 1 barbeiro, mostra info simples
  if (barbers.length <= 1) {
    return null;
  }

  return (
    <div className={`${layout === 'mobile' ? 'space-y-4' : 'space-y-6'}`}>
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-white">Quem vai te atender?</h2>
        <p className="text-sm text-zinc-500">Escolha o barbeiro de sua preferência.</p>
      </div>

      <div className={`grid ${layout === 'mobile' ? 'grid-cols-2' : 'grid-cols-3'} gap-3`}>
        {barbers.map((barber) => {
          const isSelected = selectedBarber?.id === barber.id;
          return (
            <motion.button
              key={barber.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelectBarber(barber)}
              className={`relative p-4 rounded-xl border transition-all duration-200 text-left cursor-pointer ${
                isSelected
                  ? 'bg-[#D4AF37]/10 border-[#D4AF37]/40 shadow-lg shadow-[#D4AF37]/5'
                  : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1]'
              }`}
            >
              {isSelected && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#D4AF37] flex items-center justify-center">
                  <Check size={12} className="text-black" />
                </div>
              )}

              <div className="flex flex-col items-center text-center gap-3">
                {barber.photo_url ? (
                  <img
                    src={barber.photo_url}
                    alt={barber.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-white/[0.08]"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-white/[0.04] flex items-center justify-center ring-1 ring-white/[0.08]">
                    <User size={24} className="text-zinc-500" />
                  </div>
                )}

                <div>
                  <p
                    className={`font-semibold text-sm ${isSelected ? 'text-[#D4AF37]' : 'text-white'}`}
                  >
                    {barber.name}
                  </p>
                  {barber.quote && (
                    <p className="text-[11px] text-zinc-500 mt-1 line-clamp-2 italic">
                      &ldquo;{barber.quote}&rdquo;
                    </p>
                  )}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default BarberStep;
