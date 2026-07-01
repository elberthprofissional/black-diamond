import React, { useState, useEffect, useMemo } from 'react';
import { Plus, ChevronLeft, ChevronRight, Trash2, ShoppingBag, Home, Wrench, Settings, Zap, MoreHorizontal, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AdminLayout from '../components/Admin/AdminLayout';
import AddExpenseModal from '../components/Admin/shared/AddExpenseModal';
import { getExpenses, createExpense, deleteExpense } from '../lib/api';
import { useToast } from '../hooks/useToast';
import { getErrorMessage } from '../lib/utils';
import type { Expense } from '../types';

const CATEGORY_CONFIG: Record<string, { icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>; color: string }> = {
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
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'single' | 'bulk'; id?: string }>({ type: 'bulk' });

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

  useEffect(() => {
    if (!selectMode) setSelectedIds(new Set());
  }, [selectMode]);

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

  const confirmDelete = async () => {
    try {
      if (deleteTarget.type === 'single' && deleteTarget.id) {
        await deleteExpense(deleteTarget.id);
        setExpenses(prev => prev.filter(e => e.id !== deleteTarget.id));
        showSuccess('Despesa excluída!');
      } else if (deleteTarget.type === 'bulk') {
        const ids = Array.from(selectedIds);
        await Promise.all(ids.map(id => deleteExpense(id)));
        setExpenses(prev => prev.filter(e => !selectedIds.has(e.id)));
        showSuccess(`${ids.length} despesa(s) excluída(s)!`);
        setSelectedIds(new Set());
        setSelectMode(false);
      }
    } catch (error) {
      showError(getErrorMessage(error));
    } finally {
      setDeleteConfirmOpen(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
          {selectMode ? (
            <div className="flex items-center gap-3">
              <button onClick={() => setSelectMode(false)} className="w-8 h-8 rounded-lg border border-white/[0.06] flex items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer">
                <X size={14} />
              </button>
              <span className="text-sm font-bold text-white">{selectedIds.size} selecionado(s)</span>
            </div>
          ) : (
            <h1 className="text-lg font-black text-white uppercase tracking-wider">Investimentos</h1>
          )}

          <div className="flex items-center gap-2">
            {selectMode ? (
              <button
                onClick={() => { if (selectedIds.size > 0) setDeleteConfirmOpen(true); }}
                disabled={selectedIds.size === 0}
                className="h-10 px-4 bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-[10px] uppercase tracking-wider rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-30"
              >
                <Trash2 size={14} />
                Excluir ({selectedIds.size})
              </button>
            ) : (
              <>
                {expenses.length > 0 && (
                  <button onClick={() => setSelectMode(true)} className="h-10 px-3 border border-white/[0.06] text-zinc-400 font-bold text-[10px] uppercase tracking-wider rounded-xl flex items-center gap-1.5 hover:text-white hover:border-white/[0.12] transition-all cursor-pointer">
                    <Check size={12} />
                    Selecionar
                  </button>
                )}
                <button onClick={() => setIsModalOpen(true)} className="h-10 px-4 bg-[#C5A059] hover:bg-[#A68233] text-black font-bold text-[10px] uppercase tracking-wider rounded-xl flex items-center gap-1.5 transition-all cursor-pointer active:scale-95">
                  <Plus size={14} strokeWidth={2.5} />
                  Nova Despesa
                </button>
              </>
            )}
          </div>
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
              const isSelected = selectedIds.has(expense.id);
              return (
                <div
                  key={expense.id}
                  onClick={() => selectMode && toggleSelect(expense.id)}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all ${
                    selectMode
                      ? `cursor-pointer ${isSelected ? 'bg-[#C5A059]/[0.08] border border-[#C5A059]/30' : 'bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.03]'}`
                      : 'bg-white/[0.02] border border-white/[0.04] group hover:bg-white/[0.03]'
                  }`}
                >
                  {selectMode ? (
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${isSelected ? 'border-[#C5A059] bg-[#C5A059]' : 'border-white/20'}`}>
                      {isSelected && <Check size={11} className="text-white stroke-[3px]" />}
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${config.color}15` }}>
                      <Icon size={16} style={{ color: config.color }} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-white truncate">{expense.description}</p>
                    <p className="text-[10px] text-zinc-500">{new Date(expense.expense_date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</p>
                  </div>
                  <span className="text-[12px] font-bold text-[#C5A059] tabular-nums shrink-0">R$ {Number(expense.amount).toFixed(0)}</span>
                  {!selectMode && (
                    <button onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: 'single', id: expense.id }); setDeleteConfirmOpen(true); }} className="text-zinc-600 hover:text-red-400 transition-all cursor-pointer opacity-0 group-hover:opacity-100 shrink-0">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <AddExpenseModal isOpen={isModalOpen} onSave={handleSave} onCancel={() => setIsModalOpen(false)} saving={saving} />

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {deleteConfirmOpen && (
          <div className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeleteConfirmOpen(false)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="relative z-10 w-full sm:w-[320px] bg-[#111111] border-t sm:border border-white/[0.06] sm:rounded-2xl rounded-t-2xl overflow-hidden"
            >
              <div className="px-6 pt-6 pb-4 text-center">
                <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-3">
                  <Trash2 size={18} className="text-red-400" />
                </div>
                <p className="text-[13px] font-bold text-white">
                  {deleteTarget.type === 'bulk'
                    ? `Excluir ${selectedIds.size} despesa(s)?`
                    : 'Excluir esta despesa?'}
                </p>
                <p className="text-[11px] text-zinc-500 mt-1">Essa ação não pode ser desfeita.</p>
              </div>
              <div className="flex border-t border-white/[0.04]">
                <button onClick={() => setDeleteConfirmOpen(false)} className="flex-1 py-3.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider hover:text-white hover:bg-white/[0.02] transition-all cursor-pointer">Cancelar</button>
                <div className="w-px bg-white/[0.04]" />
                <button onClick={confirmDelete} className="flex-1 py-3.5 text-[10px] font-bold text-red-400 uppercase tracking-wider hover:bg-red-500/10 transition-all cursor-pointer">Excluir</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
};

export default AdminExpenses;
