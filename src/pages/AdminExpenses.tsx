import React, { useState, useEffect, useMemo } from 'react';
import { Plus, ChevronLeft, ChevronRight, Trash2, Home, Pencil, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AdminLayout from '../components/Admin/AdminLayout';
import AddExpenseModal from '../components/Admin/shared/AddExpenseModal';
import { getExpenses, createExpense, deleteExpense, getFixedExpenses, updateFixedExpense, getBookingsForStats } from '../lib/api';
import { useToast } from '../hooks/useToast';
import { getErrorMessage } from '../lib/utils';
import type { Expense } from '../types';

interface BookingForFinance {
  booking_date: string;
  total_price: number;
  status: string;
}

interface FixedExpense {
  id: string;
  description: string;
  amount: number;
  category: string;
}

const AdminExpenses: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [bookings, setBookings] = useState<BookingForFinance[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingFixed, setEditingFixed] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const loadData = async () => {
    try {
      const [expData, fixedData, bookingsData] = await Promise.all([
        getExpenses(currentMonth),
        getFixedExpenses(),
        getBookingsForStats()
      ]);
      setExpenses(expData);
      setFixedExpenses(fixedData);
      setBookings(bookingsData || []);
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

  const handleSaveFixed = async (id: string) => {
    const newAmount = parseFloat(editValue.replace(',', '.'));
    if (isNaN(newAmount) || newAmount <= 0) return;
    try {
      await updateFixedExpense(id, newAmount);
      setFixedExpenses(prev => prev.map(f => f.id === id ? { ...f, amount: newAmount } : f));
      setEditingFixed(null);
      showSuccess('Atualizado!');
    } catch (error) {
      showError(getErrorMessage(error));
    }
  };

  const calcFaturamento = (monthKey: string) => {
    const [y, m] = monthKey.split('-').map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59);
    return bookings
      .filter(b => {
        if (!b.booking_date || b.status === 'cancelled') return false;
        const d = new Date(b.booking_date + 'T12:00:00');
        return d >= start && d <= end;
      })
      .reduce((sum, b) => sum + Number(b.total_price || 0), 0);
  };

  const faturamentoMes = useMemo(() => calcFaturamento(currentMonth), [bookings, currentMonth]);
  const totalGastos = useMemo(() => expenses.reduce((sum, e) => sum + Number(e.amount), 0), [expenses]);
  const aluguel = useMemo(() => fixedExpenses.find(f => f.category === 'Aluguel')?.amount || 0, [fixedExpenses]);
  const totalSaidas = totalGastos + aluguel;
  const lucro = faturamentoMes - totalSaidas;

  const navigateMonth = (dir: number) => {
    const [y, m] = currentMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const [year, month] = currentMonth.split('-').map(Number);

  // Agrupar gastos por categoria
  const gastosPorCategoria = useMemo(() => {
    const map = new Map<string, number>();
    expenses.forEach(e => {
      const cat = e.category || 'Outros';
      map.set(cat, (map.get(cat) || 0) + Number(e.amount));
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [expenses]);

  return (
    <AdminLayout>
      <div className="space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black text-white uppercase tracking-wider">Financeiro</h1>
            <p className="text-[10px] text-zinc-600 mt-0.5">{expenses.length} gasto{expenses.length !== 1 ? 's' : ''} este mês</p>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="h-10 px-4 bg-[#C5A059] hover:bg-[#A68233] text-black font-bold text-[10px] uppercase tracking-wider rounded-xl flex items-center gap-1.5 transition-all cursor-pointer active:scale-95">
            <Plus size={14} strokeWidth={2.5} />
            Novo Gasto
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

        {/* RESUMO SIMPLIFICADO - 2 cards grandes */}
        <div className="grid grid-cols-2 gap-3">
          {/* Entrou */}
          <div className="bg-emerald-500/[0.06] border border-emerald-500/20 rounded-2xl p-4">
            <p className="text-[9px] font-bold text-emerald-400/70 uppercase tracking-wider mb-2">Entrou</p>
            <p className="text-2xl font-black text-emerald-400">R$ {faturamentoMes.toFixed(0)}</p>
            <p className="text-[10px] text-zinc-600 mt-1">Agendamentos</p>
          </div>

          {/* Saiu */}
          <div className="bg-red-500/[0.06] border border-red-500/20 rounded-2xl p-4">
            <p className="text-[9px] font-bold text-red-400/70 uppercase tracking-wider mb-2">Saiu</p>
            <p className="text-2xl font-black text-red-400">R$ {totalSaidas.toFixed(0)}</p>
            <p className="text-[10px] text-zinc-600 mt-1">{expenses.length} gasto{expenses.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* LUCRO - Card grande */}
        <div className={`rounded-2xl p-4 border ${
          lucro >= 0 
            ? 'bg-[#C5A059]/[0.08] border-[#C5A059]/30' 
            : 'bg-red-500/[0.08] border-red-500/30'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Lucro Líquido</p>
              <p className={`text-3xl font-black ${lucro >= 0 ? 'text-[#C5A059]' : 'text-red-400'}`}>
                R$ {lucro.toFixed(0)}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              lucro >= 0 ? 'bg-[#C5A059]/10' : 'bg-red-500/10'
            }`}>
              {lucro >= 0 ? (
                <span className="text-xl">💰</span>
              ) : (
                <span className="text-xl">📉</span>
              )}
            </div>
          </div>
        </div>

        {/* FIXOS (Aluguel) */}
        {fixedExpenses.filter(f => f.category === 'Aluguel').length > 0 && (
          <div className="space-y-2">
            <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider">Fixo Mensal</p>
            {fixedExpenses.filter(f => f.category === 'Aluguel').map((fixed) => (
              <div key={fixed.id} className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.04] rounded-xl px-4 py-3">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                  <Home size={14} className="text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-white">Aluguel</p>
                  <p className="text-[10px] text-zinc-600">Todo mês</p>
                </div>
                {editingFixed === fixed.id ? (
                  <div className="flex items-center gap-1">
                    <input type="text" value={editValue} onChange={(e) => setEditValue(e.target.value.replace(/[^0-9.,]/g, ''))} className="w-20 bg-white/[0.06] border border-white/[0.1] rounded-lg px-2 py-1 text-[12px] text-white text-right outline-none" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') handleSaveFixed(fixed.id); if (e.key === 'Escape') setEditingFixed(null); }} />
                    <button onClick={() => handleSaveFixed(fixed.id)} className="w-6 h-6 rounded-md bg-[#C5A059]/10 flex items-center justify-center text-[#C5A059] cursor-pointer"><Check size={12} /></button>
                    <button onClick={() => setEditingFixed(null)} className="w-6 h-6 rounded-md bg-white/[0.04] flex items-center justify-center text-zinc-500 cursor-pointer"><X size={12} /></button>
                  </div>
                ) : (
                  <button onClick={() => { setEditingFixed(fixed.id); setEditValue(Number(fixed.amount).toFixed(0)); }} className="flex items-center gap-1 text-[12px] font-bold text-white tabular-nums cursor-pointer hover:text-[#C5A059] transition-colors">
                    R$ {Number(fixed.amount).toFixed(0)}
                    <Pencil size={10} className="text-zinc-600" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* RESUMO POR CATEGORIA */}
        {gastosPorCategoria.length > 0 && (
          <div className="space-y-2">
            <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider">Por Categoria</p>
            <div className="space-y-1.5">
              {gastosPorCategoria.map(([cat, total]) => (
                <div key={cat} className="flex items-center justify-between py-2 px-3 bg-white/[0.02] rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#C5A059]" />
                    <span className="text-[11px] font-medium text-zinc-300">{cat}</span>
                  </div>
                  <span className="text-[11px] font-bold text-white tabular-nums">R$ {total.toFixed(0)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LISTA DE GASTOS */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider">Detalhado</p>
            {expenses.length > 0 && (
              <span className="text-[9px] text-zinc-600">R$ {totalGastos.toFixed(0)} em gastos variáveis</span>
            )}
          </div>
          
          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="w-5 h-5 border-2 border-zinc-800 border-t-[#C5A059] rounded-full animate-spin" />
            </div>
          ) : expenses.length === 0 ? (
            <div className="py-16 text-center bg-white/[0.01] rounded-2xl border border-dashed border-white/[0.04]">
              <p className="text-[11px] text-zinc-600 mb-1">Nenhum gasto este mês</p>
              <p className="text-[10px] text-zinc-700">Registre gastos clicando em "Novo Gasto"</p>
            </div>
          ) : (
            <div className="space-y-1">
              {expenses.map((expense) => (
                <div key={expense.id} className="flex items-center gap-3 py-3 px-3 bg-white/[0.02] rounded-xl group hover:bg-white/[0.04] transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-zinc-500">{expense.category?.charAt(0) || '?'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-white truncate">{expense.description}</p>
                    <p className="text-[10px] text-zinc-600">
                      {new Date(expense.expense_date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      {expense.category && <span className="text-zinc-700"> · {expense.category}</span>}
                    </p>
                  </div>
                  <span className="text-[12px] font-bold text-white tabular-nums shrink-0">R$ {Number(expense.amount).toFixed(0)}</span>
                  <button onClick={() => setDeleteConfirmId(expense.id)} className="text-zinc-700 hover:text-red-400 transition-all cursor-pointer shrink-0 p-1 opacity-0 group-hover:opacity-100">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AddExpenseModal isOpen={isModalOpen} onSave={handleSave} onCancel={() => setIsModalOpen(false)} saving={saving} />

      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeleteConfirmId(null)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} className="relative z-10 w-full sm:w-[300px] bg-[#111111] border-t sm:border border-white/[0.06] sm:rounded-2xl rounded-t-2xl p-6 text-center">
              <p className="text-[13px] font-bold text-white mb-1">Excluir gasto?</p>
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
