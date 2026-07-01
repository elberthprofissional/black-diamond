import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, Home, Wrench, Settings, Zap, MoreHorizontal } from 'lucide-react';

const CATEGORIES = [
  { id: 'Produtos', label: 'Produtos', icon: ShoppingBag, color: '#C5A059' },
  { id: 'Aluguel', label: 'Aluguel', icon: Home, color: '#ef4444' },
  { id: 'Equipamentos', label: 'Equipamentos', icon: Wrench, color: '#3b82f6' },
  { id: 'Manutenção', label: 'Manutenção', icon: Settings, color: '#f59e0b' },
  { id: 'Contas', label: 'Contas', icon: Zap, color: '#8b5cf6' },
  { id: 'Outros', label: 'Outros', icon: MoreHorizontal, color: '#6b7280' },
];

interface AddExpenseModalProps {
  isOpen: boolean;
  onSave: (data: { description: string; amount: number; expense_date: string; category: string }) => void;
  onCancel: () => void;
  saving: boolean;
}

const AddExpenseModal: React.FC<AddExpenseModalProps> = ({ isOpen, onSave, onCancel, saving }) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSave = () => {
    if (!description.trim() || !amount || !category) return;
    onSave({
      description: description.trim(),
      amount: parseFloat(amount.replace(',', '.')),
      expense_date: expenseDate,
      category,
    });
    setDescription('');
    setAmount('');
    setCategory('');
    setExpenseDate(new Date().toISOString().split('T')[0]);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onCancel} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="relative z-10 w-full max-h-[85vh] sm:w-[380px] sm:max-h-none bg-[#111111] border-t sm:border border-white/[0.06] sm:rounded-2xl rounded-t-2xl overflow-hidden flex flex-col"
          >
            <div className="px-6 pt-6 pb-5">
              <div className="flex items-center justify-between mb-5">
                <span className="text-[9px] font-black text-[#C5A059] uppercase tracking-[0.2em]">Nova Despesa</span>
                <button onClick={onCancel} className="text-zinc-600 hover:text-white transition-all cursor-pointer"><X size={14} /></button>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Categoria</span>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#C5A059]/35 transition-colors appearance-none cursor-pointer">
                    <option value="" disabled className="bg-[#111111] text-zinc-500">Selecione uma categoria</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id} className="bg-[#111111]">{cat.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Descrição</span>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ex: Pomada Reuzel 150ml"
                    className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#C5A059]/35 transition-colors placeholder:text-zinc-700"
                  />
                </div>

                <div className="flex gap-3">
                  <div className="flex-1">
                    <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Valor (R$)</span>
                    <input
                      type="text"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value.replace(/[^0-9.,]/g, ''))}
                      placeholder="0,00"
                      className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#C5A059]/35 transition-colors placeholder:text-zinc-700 tabular-nums"
                    />
                  </div>
                  <div className="flex-1">
                    <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Data</span>
                    <input
                      type="date"
                      value={expenseDate}
                      onChange={(e) => setExpenseDate(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#C5A059]/35 transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex border-t border-white/[0.04]">
              <button onClick={onCancel} className="flex-1 py-3.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider hover:text-white hover:bg-white/[0.02] transition-all cursor-pointer">Cancelar</button>
              <div className="w-px bg-white/[0.04]" />
              <button onClick={handleSave} disabled={saving || !description.trim() || !amount || !category} className="flex-1 py-3.5 text-[10px] font-bold text-[#C5A059] uppercase tracking-wider hover:bg-[#C5A059]/10 transition-all cursor-pointer disabled:opacity-30">
                {saving ? '...' : 'Salvar'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AddExpenseModal;
