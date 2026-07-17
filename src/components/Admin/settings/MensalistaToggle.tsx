import { type FC } from 'react';
import { motion } from 'framer-motion';

interface MensalistaToggleProps {
  enabled: boolean;
  toggling: boolean;
  onToggle: () => void;
}

const MensalistaToggle: FC<MensalistaToggleProps> = ({ enabled, toggling, onToggle }) => (
  <>
    {/* Desktop */}
    <div className="hidden lg:flex items-center justify-between py-2">
      <div>
        <h3 className="text-[14px] font-semibold text-white">Sistema de Mensalista</h3>
        <p className="text-[12px] text-zinc-500 mt-0.5">
          {enabled ? 'Planos visíveis para clientes' : 'Oculto na página e no agendamento'}
        </p>
      </div>
      <button
        onClick={onToggle}
        disabled={toggling}
        role="switch"
        aria-checked={enabled}
        className={`relative w-12 h-7 rounded-full transition-colors cursor-pointer disabled:opacity-50 ${
          enabled ? 'bg-[#D4AF37]' : 'bg-zinc-700'
        }`}
      >
        <motion.div
          className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-md"
          animate={{ left: enabled ? 26 : 4 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </button>
    </div>

    {/* Mobile */}
    <div className="lg:hidden">
      <div className="flex items-center justify-between py-2 px-1">
        <div className="flex-1">
          <p className="text-[12px] text-zinc-500">
            {enabled ? 'Planos visíveis para clientes' : 'Oculto na página de agendamento'}
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <span
            className={`text-[11px] font-medium ${enabled ? 'text-[#D4AF37]' : 'text-zinc-500'}`}
          >
            {enabled ? 'Desativar' : 'Ativar'}
          </span>
          <button
            onClick={onToggle}
            disabled={toggling}
            role="switch"
            aria-checked={enabled}
            className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer disabled:opacity-50 ${
              enabled ? 'bg-[#D4AF37]' : 'bg-zinc-700'
            }`}
          >
            <motion.div
              className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md"
              animate={{ left: enabled ? 22 : 2 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </button>
        </div>
      </div>
    </div>
  </>
);

export default MensalistaToggle;
