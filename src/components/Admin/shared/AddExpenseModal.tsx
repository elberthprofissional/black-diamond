import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

interface AddExpenseModalProps {
  isOpen: boolean;
  onSave: (data: { description: string; amount: number; expense_date: string; category: string }[]) => void;
  onCancel: () => void;
  saving: boolean;
}

const AddExpenseModal: React.FC<AddExpenseModalProps> = ({ isOpen, onSave, onCancel, saving }) => {
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const currentYear = new Date().getFullYear();

  const toggleMonth = (m: number) => {
    setSelectedMonths(prev =>
      prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]
    );
  };

  const handleSave = () => {
    if (!desc.trim() || !amount.trim() || selectedMonths.length === 0) return;
    const value = parseFloat(amount.replace(',', '.'));
    if (isNaN(value) || value <= 0) return;

    const items = selectedMonths.map(m => ({
      description: desc.trim(),
      amount: value,
      expense_date: `${currentYear}-${String(m + 1).padStart(2, '0')}-01`,
      category: 'Gasto'
    }));

    onSave(items);
    setDesc('');
    setAmount('');
    setSelectedMonths([]);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="relative z-10 w-full sm:w-[380px] max-h-[85vh] bg-[#111111] border-t sm:border border-white/[0.06] sm:rounded-2xl rounded-t-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="px-5 pt-5 pb-4 flex items-center justify-between border-b border-white/[0.04]">
              <span className="text-[10px] font-bold text-[#C5A059] uppercase tracking-wider">Novo gasto</span>
              <button onClick={onCancel} className="text-zinc-600 hover:text-white cursor-pointer">
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
              {/* O que gastou */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">O que foi?</label>
                <input
                  type="text"
                  placeholder="Ex: Aluguel, Pomada, Máquina..."
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#C5A059]/50 transition-colors placeholder:text-zinc-700"
                  autoFocus
                />
              </div>

              {/* Quanto */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Quanto?</label>
                <input
                  type="text"
                  placeholder="R$ 0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9.,]/g, ''))}
                  className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#C5A059]/50 transition-colors placeholder:text-zinc-700 tabular-nums"
                />
              </div>

              {/* Selecionar meses */}
              <div className="space-y-2">
                <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
                  Pra quais meses? {selectedMonths.length > 0 && <span className="text-[#C5A059]">({selectedMonths.length})</span>}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {MONTHS.map((m, i) => {
                    const isSelected = selectedMonths.includes(i);
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => toggleMonth(i)}
                        className={`py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-[#C5A059]/15 border-[#C5A059]/40 text-[#C5A059]'
                            : 'bg-white/[0.02] border-white/[0.04] text-zinc-600 hover:text-zinc-400 hover:border-white/[0.08]'
                        }`}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-white/[0.04]">
              <button
                onClick={handleSave}
                disabled={saving || !desc.trim() || !amount.trim() || selectedMonths.length === 0}
                className="w-full h-11 bg-[#C5A059] hover:bg-[#A68233] text-black font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {saving ? 'Salvando...' : selectedMonths.length > 1 ? `Anotar em ${selectedMonths.length} meses` : 'Anotar'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AddExpenseModal;
