import React, { useState, useEffect, useMemo } from 'react';
import { Plus, ChevronLeft, ChevronRight, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AdminLayout from '../components/Admin/AdminLayout';
import { getExpenses, createExpense, deleteExpense } from '../lib/api';
import { useToast } from '../hooks/useToast';
import { getErrorMessage } from '../lib/utils';
import type { Expense } from '../types';

const AdminExpenses: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newDesc, setNewDesc] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const data = await getExpenses(currentMonth);
      setExpenses(data);
    } catch (error) {
      showError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [currentMonth]);

  const handleAdd = async () => {
    if (!newDesc.trim() || !newAmount.trim()) return;
    const amount = parseFloat(newAmount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) return;

    setSaving(true);
    try {
      const today = new Date();
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      await createExpense({
        description: newDesc.trim(),
        amount,
        expense_date: dateStr,
        category: 'Gasto'
      });
      setNewDesc('');
      setNewAmount('');
      setIsAdding(false);
      showSuccess('Anotado!');
      await loadData();
    } catch (error) {
      showError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteExpense(deleteConfirmId);
      setExpenses(prev => prev.filter(e => e.id !== deleteConfirmId));
      showSuccess('Apagado!');
    } catch (error) {
      showError(getErrorMessage(error));
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const total = useMemo(() => expenses.reduce((sum, e) => sum + Number(e.amount), 0), [expenses]);

  const navigateMonth = (dir: number) => {
    const [y, m] = currentMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const [year, month] = currentMonth.split('-').map(Number);

  return (
    <AdminLayout>
      <div className="space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-black text-white uppercase tracking-wider">Gastos</h1>
          <button onClick={() => setIsAdding(true)} className="h-10 px-4 bg-[#C5A059] hover:bg-[#A68233] text-black font-bold text-[10px] uppercase tracking-wider rounded-xl flex items-center gap-1.5 transition-all cursor-pointer active:scale-95">
            <Plus size={14} strokeWidth={2.5} />
            Novo
          </button>
        </div>

        {/* Month selector */}
        <div className="flex items-center justify-center gap-6">
          <button onClick={() => navigateMonth(-1)} className="w-8 h-8 rounded-lg border border-white/[0.06] flex items-center justify-center text-zinc-500 hover:text-white hover:border-white/[0.12] transition-all cursor-pointer">
            <ChevronLeft size={14} />
          </button>
          <span className="text-sm font-bold text-white">{new Date(year, month - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
          <button onClick={() => navigateMonth(1)} className="w-8 h-8 rounded-lg border border-white/[0.06] flex items-center justify-center text-zinc-500 hover:text-white hover:border-white/[0.12] transition-all cursor-pointer">
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Formulario novo gasto */}
        <AnimatePresence>
          {isAdding && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-[#C5A059] uppercase tracking-wider">Novo gasto</span>
                  <button onClick={() => { setIsAdding(false); setNewDesc(''); setNewAmount(''); }} className="text-zinc-600 hover:text-white cursor-pointer">
                    <X size={14} />
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="O que gastou?"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#C5A059]/50 transition-colors placeholder:text-zinc-700"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
                />
                <input
                  type="text"
                  placeholder="Quanto?"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value.replace(/[^0-9.,]/g, ''))}
                  className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#C5A059]/50 transition-colors placeholder:text-zinc-700 tabular-nums"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
                />
                <button
                  onClick={handleAdd}
                  disabled={saving || !newDesc.trim() || !newAmount.trim()}
                  className="w-full h-11 bg-[#C5A059] hover:bg-[#A68233] text-black font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                  {saving ? '...' : 'Anotar'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Lista de gastos */}
        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="w-5 h-5 border-2 border-zinc-800 border-t-[#C5A059] rounded-full animate-spin" />
          </div>
        ) : expenses.length === 0 && !isAdding ? (
          <div className="py-16 text-center bg-white/[0.01] rounded-2xl border border-dashed border-white/[0.04]">
            <p className="text-[11px] text-zinc-600 mb-3">Nenhum gasto anotado.</p>
            <button onClick={() => setIsAdding(true)} className="text-[10px] font-bold text-[#C5A059] uppercase tracking-wider cursor-pointer hover:text-[#A68233] transition-colors">
              Anotar primeiro gasto →
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            {expenses.map((expense) => (
              <div key={expense.id} className="flex items-center gap-3 py-3 px-3 bg-white/[0.02] rounded-xl group hover:bg-white/[0.04] transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-white truncate">{expense.description}</p>
                  <p className="text-[10px] text-zinc-600">
                    {new Date(expense.expense_date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </p>
                </div>
                <span className="text-[13px] font-bold text-white tabular-nums shrink-0">R$ {Number(expense.amount).toFixed(0)}</span>
                <button onClick={() => setDeleteConfirmId(expense.id)} className="text-zinc-700 hover:text-red-400 transition-all cursor-pointer shrink-0 p-1 opacity-0 group-hover:opacity-100">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Total */}
        {expenses.length > 0 && (
          <div className="flex items-center justify-between py-4 px-4 bg-white/[0.02] border border-white/[0.04] rounded-2xl">
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Total</span>
            <span className="text-xl font-black text-white">R$ {total.toFixed(0)}</span>
          </div>
        )}
      </div>

      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeleteConfirmId(null)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} className="relative z-10 w-full sm:w-[300px] bg-[#111111] border-t sm:border border-white/[0.06] sm:rounded-2xl rounded-t-2xl p-6 text-center">
              <p className="text-[13px] font-bold text-white mb-1">Apagar?</p>
              <p className="text-[11px] text-zinc-500 mb-5">Essa anotaçãosome pra sempre.</p>
              <div className="flex gap-2">
                <button onClick={() => setDeleteConfirmId(null)} className="flex-1 h-10 border border-white/[0.06] rounded-xl text-[10px] font-bold text-zinc-400 uppercase tracking-wider hover:text-white transition-all cursor-pointer">Cancelar</button>
                <button onClick={handleDelete} className="flex-1 h-10 bg-red-500/10 border border-red-500/20 rounded-xl text-[10px] font-bold text-red-400 uppercase tracking-wider hover:bg-red-500/20 transition-all cursor-pointer">Apagar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
};

export default AdminExpenses;
