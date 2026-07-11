import { useState, useEffect, type FC } from 'react';
import { User, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getActiveBarbers } from '../../../lib/api/barbers';
import type { Barber } from '../../../types';

interface AdminBarberFilterProps {
  selectedBarberId: string | null;
  onSelect: (barberId: string | null) => void;
}

const AdminBarberFilter: FC<AdminBarberFilterProps> = ({ selectedBarberId, onSelect }) => {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    getActiveBarbers()
      .then(setBarbers)
      .catch(() => {});
  }, []);

  if (barbers.length <= 1) return null;

  const selected = barbers.find((b) => b.id === selectedBarberId);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 bg-white/[0.04] border border-white/[0.06] rounded-lg text-[11px] font-medium text-zinc-300 hover:bg-white/[0.06] transition-all cursor-pointer"
      >
        <User size={12} className="text-zinc-500" />
        <span>{selected ? selected.name : 'Todos os Profissionais'}</span>
        <ChevronDown
          size={12}
          className={`text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full left-0 mt-1 w-56 bg-[#141416] border border-white/[0.08] rounded-xl shadow-2xl shadow-black/40 z-50 overflow-hidden"
          >
            <button
              onClick={() => {
                onSelect(null);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-[11px] transition-all cursor-pointer ${
                selectedBarberId === null
                  ? 'bg-white/[0.06] text-white font-medium'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <User size={12} className="text-zinc-500" />
              Todos os Profissionais
            </button>
            {barbers.map((barber) => (
              <button
                key={barber.id}
                onClick={() => {
                  onSelect(barber.id);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-[11px] transition-all cursor-pointer ${
                  selectedBarberId === barber.id
                    ? 'bg-white/[0.06] text-white font-medium'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center">
                  <User size={8} className="text-zinc-500" />
                </div>
                {barber.name}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminBarberFilter;
