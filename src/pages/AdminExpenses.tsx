import React, { useState, useEffect, useMemo } from 'react';
import { Plus, ChevronLeft, ChevronRight, Trash2, ShoppingBag, Home, Wrench, Settings, Zap, MoreHorizontal } from 'lucide-react';
import AdminLayout from '../components/Admin/AdminLayout';
import AddExpenseModal from '../components/Admin/shared/AddExpenseModal';
import { getExpenses, createExpense, deleteExpense } from '../lib/api';
import { useToast } from '../hooks/useToast';
import { getErrorMessage } from '../lib/utils';
import type { Expense } from '../types';

const CATEGORY_CONFIG: Record<string, { icon: React.FC<{ size?: number }>; color: string }> = {
  'Produtos': { icon: ShoppingBag, color: '#C5A059' },
  'Aluguel': { icon: Home, color: '#ef4444' },
  'Equipamentos': { icon: Wrench, color: '#3b82f6' },
  'Manutenção': { icon: Settings, color: '#f59e0b' },
  'Contas': { icon: Zap, color: '#8b5cf6' },
  'Outros': { icon: MoreHorizontal, color: '#6b7280' },
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

  const handleDelete = async (id: string) => {
    try {
      await deleteExpense(id);
      setExpenses(prev => prev.filter(e => e.id !== id));
      showSuccess('Despesa excluída!');
    } catch (error) {
      showError(getErrorMessage(error));
    }
  };

  const totalGasto = useMemo(() => expenses.reduce((sum, e) => sum + Number(e.amount), 0), [expenses]);

  const porCategoria = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(e => {
      map[e.category] = (map[e.category] || 0) + Number(e.amount);
    });
    return Object.entries(map)
      .map(([cat, total]) => ({ category: cat, total, percent: totalGasto > 0 ? (total / totalGasto) * 100 : 0 }))
      .sort((a, b) => b.total - a.total);
  }, [expenses, totalGasto]);

  const mediaPorDia = useMemo(() => {
    const [year, month] = currentMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    return totalGasto / daysInMonth;
  }, [totalGasto, currentMonth]);

  const navigateMonth = (dir: number) => {
    const [year, month] = currentMonth.split('-').map(Number);
    const d = new Date(year, month - 1 + dir, 1);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const [year, month] = currentMonth.split('-').map(Number);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-black text-white uppercase tracking-wider">Investimentos</h1>
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

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4 text-center">
            <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Total</p>
            <p className="text-lg font-black text-[#C5A059]">R$ {totalGasto.toFixed(0)}</p>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4 text-center">
            <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Média/dia</p>
            <p className="text-lg font-black text-white">R$ {mediaPorDia.toFixed(0)}</p>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4 text-center">
            <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Despesas</p>
            <p className="text-lg font-black text-white">{expenses.length}</p>
          </div>
        </div>

        {/* Category breakdown */}
        {porCategoria.length > 0 && (
          <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4 space-y-3">
            <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Por Categoria</p>
            {porCategoria.map((item) => {
              const config = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG['Outros'];
              const Icon = config.icon;
              return (
                <div key={item.category} className="flex items-center gap-3">
                  <Icon size={14} style={{ color: config.color }} />
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[11px] font-medium text-zinc-300">{item.category}</span>
                      <span className="text-[11px] font-bold text-white">R$ {item.total.toFixed(0)}</span>
                    </div>
                    <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${item.percent}%`, backgroundColor: config.color }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Expense list */}
        <div className="space-y-2">
          {loading ? (
            <div className="py-16 flex justify-center">
              <div className="w-5 h-5 border-2 border-zinc-800 border-t-[#C5A059] rounded-full animate-spin" />
            </div>
          ) : expenses.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-[11px] text-zinc-500">Nenhuma despesa registrada este mês.</p>
            </div>
          ) : (
            expenses.map((expense) => {
              const config = CATEGORY_CONFIG[expense.category] || CATEGORY_CONFIG['Outros'];
              const Icon = config.icon;
              return (
                <div key={expense.id} className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.04] rounded-xl px-4 py-3 group hover:bg-white/[0.03] transition-all">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${config.color}15` }}>
                    <Icon size={16} style={{ color: config.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-white truncate">{expense.description}</p>
                    <p className="text-[10px] text-zinc-500">{new Date(expense.expense_date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</p>
                  </div>
                  <span className="text-[12px] font-bold text-[#C5A059] tabular-nums shrink-0">R$ {Number(expense.amount).toFixed(0)}</span>
                  <button onClick={() => handleDelete(expense.id)} className="text-zinc-600 hover:text-red-400 transition-all cursor-pointer opacity-0 group-hover:opacity-100 shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      <AddExpenseModal isOpen={isModalOpen} onSave={handleSave} onCancel={() => setIsModalOpen(false)} saving={saving} />
    </AdminLayout>
  );
};

export default AdminExpenses;
