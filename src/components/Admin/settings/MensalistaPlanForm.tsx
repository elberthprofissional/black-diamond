import { type FC, type RefObject } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X } from 'lucide-react';
import type { Service } from '../../../types';
import PlanFormFields from './PlanFormFields';

const WEEK_DAYS = [
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
  { value: 0, label: 'Dom' },
];

interface MensalistaPlanFormProps {
  isOpen: boolean;
  screen: 'add' | 'edit' | 'list';
  nameInput: string;
  priceInput: string;
  selectedServiceIds: string[];
  allowedDays: number[];
  services: Service[];
  nameInputRef: RefObject<HTMLInputElement | null>;
  onNameChange: (v: string) => void;
  onPriceChange: (v: string) => void;
  onToggleService: (id: string) => void;
  onToggleDay: (day: number) => void;
  onSubmit: () => void;
  onClose: () => void;
}

const MensalistaPlanForm: FC<MensalistaPlanFormProps> = ({
  isOpen,
  screen,
  nameInput,
  priceInput,
  selectedServiceIds,
  allowedDays,
  services,
  nameInputRef,
  onNameChange,
  onPriceChange,
  onToggleService,
  onToggleDay,
  onSubmit,
  onClose,
}) => (
  <AnimatePresence>
    {isOpen && (
      <>
        {/* Mobile Fullscreen */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="fixed inset-0 z-[300] bg-[#0A0A0A] lg:hidden"
        >
          <div className="flex items-center justify-between px-4 h-14 border-b border-white/[0.06]">
            <button onClick={onClose} className="text-zinc-400 hover:text-white cursor-pointer">
              <X size={22} />
            </button>
            <span className="text-[15px] font-bold text-white">
              {screen === 'add' ? 'Novo Plano' : 'Editar Plano'}
            </span>
            <button
              onClick={onSubmit}
              className="text-[#D4AF37] font-bold text-[15px] cursor-pointer"
            >
              <Check size={22} />
            </button>
          </div>
          <div className="p-5 space-y-5 overflow-y-auto max-h-[calc(100vh-56px)]">
            <PlanFormFields
              nameInput={nameInput}
              setNameInput={onNameChange}
              priceInput={priceInput}
              setPriceInput={onPriceChange}
              selectedServiceIds={selectedServiceIds}
              toggleService={onToggleService}
              allowedDays={allowedDays}
              toggleDay={onToggleDay}
              services={services}
              nameInputRef={nameInputRef}
              onSubmit={onSubmit}
              weekDays={WEEK_DAYS}
            />
          </div>
        </motion.div>

        {/* Desktop Modal */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="hidden lg:flex fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            className="w-full max-w-lg bg-[#141414] border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 h-14 border-b border-white/[0.06]">
              <button onClick={onClose} className="text-zinc-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
              <span className="text-[14px] font-semibold text-white">
                {screen === 'add' ? 'Novo Plano' : 'Editar Plano'}
              </span>
              <button
                onClick={onSubmit}
                className="text-[#D4AF37] font-semibold text-[14px] cursor-pointer"
              >
                Salvar
              </button>
            </div>
            <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
              <PlanFormFields
                nameInput={nameInput}
                setNameInput={onNameChange}
                priceInput={priceInput}
                setPriceInput={onPriceChange}
                selectedServiceIds={selectedServiceIds}
                toggleService={onToggleService}
                allowedDays={allowedDays}
                toggleDay={onToggleDay}
                services={services}
                nameInputRef={nameInputRef}
                onSubmit={onSubmit}
                weekDays={WEEK_DAYS}
              />
            </div>
          </motion.div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

export default MensalistaPlanForm;
