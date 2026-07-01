import React, { useState, useEffect, useMemo } from 'react';
import { Plus, ChevronLeft, ChevronRight, Trash2, ShoppingBag, Home, Wrench, Settings, Zap, MoreHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AdminLayout from '../components/Admin/AdminLayout';
import AddExpenseModal from '../components/Admin/shared/AddExpenseModal';
import { getExpenses, createExpense, deleteExpense } from '../lib/api';
import { useToast } from '../hooks/useToast';
import { getErrorMessage } from '../lib/utils';
import type { Expense } from '../types';

const CATEGORY_ICONS: Record<string, React.ComponentType<{ size?: number; style?: React.CSSProperties }>> = {
  'Produtos': ShoppingBag,
  'Aluguel': Home,
  'Equipamentos': Wrench,
  'Manutenção': Settings,
  'Contas': Zap,
  'Outros': MoreHorizontal,
};

const CATEGORY_COLORS: Record<string, string> = {
  'Produtos': '#C5A059',
  'Aluguel': '#ef4444',
  'Equipamentos': '#3b82f6',
  'Manutenção': '#f59e0b',
  'Contas': '#8b5cf6',
  'Outros': '#6b7280',
};

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const AdminExpenses: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setExpenses(await getExpenses(currentMonth));
    } catch (error) {
      showError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [currentMonth]);

  const handleSave = async (data: { description: string; amount: number; expense_date: string; category: string }) => {
    setSaving(true);
    try {
      await createExpense(data);
      setIsModalOpen(false);
      showSuccess('Despesa registrada!');
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
      showSuccess('Excluída!');
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
        {/* Header com total */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black text-white uppercase tracking-wider">Investimentos</h1>
            <p className="text-xs text-zinc-500 mt-0.5">Total: <span className="font-bold text-[#C5A059]">R$ {total.toFixed(0)}</span></p>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="h-10 px-4 bg-[#C5A059] hover:bg-[#A68233] text-black font-bold text-[10px] uppercase tracking-wider rounded-xl flex items-center gap-1.5 transition-all cursor-pointer active:scale-95">
            <Plus size={14} strokeWidth={2.5} />
            Nova Despesa
          </button>
        </div>

        {/* Month selector */}
        <div className="flex items-center justify-center gap-6">
          <button onClick={() => navigateMonth(-1)} className="w-8 h-8 rounded-lg border border-white/[0.06] flex items-center justify-center text-zinc-500 hover:text-white hover:border-white/[0.12] transition-all cursor-pointer">
            <ChevronLeft size={14} />
          </button>
          <span className="text-sm font-bold text-white">{MONTH_NAMES[month - 1]} {year}</span>
          <button onClick={() => navigateMonth(1)} className="w-8 h-8 rounded-lg border border-white/[0.06] flex items-center justify-center text-zinc-500 hover:text-white hover:border-white/[0.12] transition-all cursor-pointer">
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Lista */}
        <div className="space-y-1">
          {loading ? (
            <div className="py-16 flex justify-center">
              <div className="w-5 h-5 border-2 border-zinc-800 border-t-[#C5A059] rounded-full animate-spin" />
            </div>
          ) : expenses.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-[11px] text-zinc-600">Nenhuma despesa este mês.</p>
            </div>
          ) : (
            expenses.map((expense) => {
              const Icon = CATEGORY_ICONS[expense.category] || MoreHorizontal;
              const color = CATEGORY_COLORS[expense.category] || '#6b7280';
              return (
                <div key={expense.id} className="flex items-center gap-3 py-3 border-b border-white/[0.03] group">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}12` }}>
                    <Icon size={14} style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-white truncate">{expense.description}</p>
                    <p className="text-[10px] text-zinc-600">{new Date(expense.expense_date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</p>
                  </div>
                  <span className="text-[12px] font-bold text-white tabular-nums shrink-0">R$ {Number(expense.amount).toFixed(0)}</span>
                  <button onClick={() => setDeleteConfirmId(expense.id)} className="text-zinc-700 hover:text-red-400 transition-all cursor-pointer shrink-0 p-1">
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      <AddExpenseModal isOpen={isModalOpen} onSave={handleSave} onCancel={() => setIsModalOpen(false)} saving={saving} />

      {/* Delete confirm */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeleteConfirmId(null)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} className="relative z-10 w-full sm:w-[300px] bg-[#111111] border-t sm:border border-white/[0.06] sm:rounded-2xl rounded-t-2xl p-6 text-center">
              <p className="text-[13px] font-bold text-white mb-1">Excluir despesa?</p>
              <p className="text-[11px] text-zinc-500 mb-5">Não pode ser desfeito.</p>
              <div className="flex gap-2">
                <button onClick={() => setDeleteConfirmId(null)} className="flex-1 h-10 border border-white/[0.06] rounded-xl text-[10px] font-bold text-zinc-400 uppercase tracking-wider hover:text-white transition-all cursor-pointer">Cancelar</button>
                <button onClick={handleDelete} className="flex-1 h-10 bg-red-500/10 border border-red-500/20 rounded-xl text-[10px] font-bold text-red-400 uppercase tracking-wider hover:bg-red-500/20 transition-all cursor-pointer">Excluir</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
};

export default AdminExpenses;
