import { type FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { formatPrice } from '../../../lib/utils';
import type { MensalistaPlan } from '../../../types';

interface PlanSelectorModalProps {
  isOpen: boolean;
  plans: MensalistaPlan[];
  selectedPlanId: string;
  saving: boolean;
  onSelectPlan: (planId: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

const PlanSelectorModal: FC<PlanSelectorModalProps> = ({
  isOpen,
  plans,
  selectedPlanId,
  saving,
  onSelectPlan,
  onConfirm,
  onClose,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[400] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            className="w-full sm:max-w-sm bg-[#141414] sm:rounded-xl rounded-t-2xl overflow-hidden border border-white/[0.06]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 pt-5 pb-3">
              <p className="text-[14px] font-semibold text-white">Selecionar plano</p>
              <p className="text-[12px] text-zinc-500 mt-0.5">Escolha o plano para este cliente.</p>
            </div>

            <div className="px-3 pb-3 space-y-1">
              {plans
                .filter((p) => p.is_active)
                .map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => onSelectPlan(plan.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer ${
                      selectedPlanId === plan.id ? 'bg-[#D4AF37]/[0.08]' : 'hover:bg-white/[0.04]'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full border-[1.5px] flex items-center justify-center transition-all shrink-0 ${
                        selectedPlanId === plan.id
                          ? 'border-[#D4AF37] bg-[#D4AF37]'
                          : 'border-white/20'
                      }`}
                    >
                      {selectedPlanId === plan.id && (
                        <Check size={9} className="text-white stroke-[3]" />
                      )}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <span
                        className={`text-[13px] font-medium ${selectedPlanId === plan.id ? 'text-[#D4AF37]' : 'text-zinc-200'}`}
                      >
                        {plan.name}
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-500 tabular-nums">
                      {formatPrice(plan.price, { locale: true })}
                      /mês
                    </span>
                  </button>
                ))}
              {plans.filter((p) => p.is_active).length === 0 && (
                <p className="text-[12px] text-zinc-600 text-center py-6">Nenhum plano ativo.</p>
              )}
            </div>

            <div className="flex border-t border-white/[0.06]">
              <button
                onClick={onClose}
                className="flex-1 py-3 text-[12px] font-medium text-zinc-500 hover:text-white transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <div className="w-px bg-white/[0.06]" />
              <button
                onClick={onConfirm}
                disabled={!selectedPlanId || saving}
                className="flex-1 py-3 text-[12px] font-semibold text-[#D4AF37] hover:text-[#b8962e] transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {saving ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>

            <div className="sm:hidden flex justify-center pb-2 pt-1">
              <div className="w-8 h-1 rounded-full bg-white/10" />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PlanSelectorModal;
