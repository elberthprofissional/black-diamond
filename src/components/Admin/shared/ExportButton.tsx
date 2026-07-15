import { useState, useRef, useEffect, type FC } from 'react';
import {
  Download,
  FileText,
  Users,
  TrendingUp,
  ChevronDown,
  Loader2,
  FileSpreadsheet,
} from 'lucide-react';
import { useCsvExport } from '../../../hooks/useCsvExport';
import { useXlsxExport } from '../../../hooks/useXlsxExport';
import { useToast } from '../../../hooks/useToast';

/* ─── Botao Exportar com formato XLSX (padrao) e CSV ───
 * Cada tipo de dado (agendamentos, clientes, financeiro)
 * tem duas opcoes: XLSX (Excel) ou CSV. */

const ExportButton: FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [formatMenu, setFormatMenu] = useState<string | null>(null);
  const { showError } = useToast();
  const csv = useCsvExport(showError);
  const xlsx = useXlsxExport(showError);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setFormatMenu(null);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const isExporting = csv.isExporting || xlsx.isExporting;

  const handleFormatSelect = async (
    type: 'bookings' | 'clients' | 'financial',
    format: 'csv' | 'xlsx'
  ) => {
    setIsOpen(false);
    setFormatMenu(null);
    const exporter = format === 'xlsx' ? xlsx : csv;
    switch (type) {
      case 'bookings':
        await exporter.exportBookings();
        break;
      case 'clients':
        await exporter.exportClients();
        break;
      case 'financial':
        await exporter.exportFinancial();
        break;
    }
  };

  const types = [
    {
      id: 'bookings',
      label: 'Agendamentos',
      desc: 'Lista completa de agendamentos',
      icon: FileText,
    },
    { id: 'clients', label: 'Clientes', desc: 'Dados e histórico de clientes', icon: Users },
    {
      id: 'financial',
      label: 'Financeiro',
      desc: 'Receita e cancelamentos por mês',
      icon: TrendingUp,
    },
  ] as const;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          setFormatMenu(null);
        }}
        disabled={isExporting}
        className="flex items-center gap-2 px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-[12px] font-medium text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer disabled:opacity-50"
      >
        {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
        <span className="hidden sm:inline">Exportar</span>
        <ChevronDown size={12} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && !formatMenu && (
        <div className="absolute right-0 top-full mt-1.5 w-56 bg-[#141414] border border-white/[0.08] rounded-xl shadow-2xl overflow-hidden z-50">
          <div className="p-1.5">
            {types.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setFormatMenu(t.id)}
                  disabled={isExporting}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-white/[0.04] transition-all cursor-pointer"
                >
                  <Icon size={14} className="text-[#C5A059] shrink-0" />
                  <div className="flex-1">
                    <p className="text-[12px] font-medium text-white">{t.label}</p>
                    <p className="text-[10px] text-zinc-500">{t.desc}</p>
                  </div>
                  <ChevronDown size={12} className="text-zinc-600 -rotate-90" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {isOpen && formatMenu && (
        <div className="absolute right-0 top-full mt-1.5 w-56 bg-[#141414] border border-white/[0.08] rounded-xl shadow-2xl overflow-hidden z-50">
          <div className="p-1.5">
            <button
              onClick={() => setFormatMenu(null)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left hover:bg-white/[0.04] transition-all cursor-pointer text-[11px] text-zinc-400"
            >
              <ChevronDown size={12} className="rotate-90" />
              Voltar
            </button>
            <div className="h-px bg-white/[0.04] my-1" />
            <button
              onClick={() =>
                handleFormatSelect(formatMenu as 'bookings' | 'clients' | 'financial', 'xlsx')
              }
              disabled={isExporting}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-white/[0.04] transition-all cursor-pointer"
            >
              <FileSpreadsheet size={14} className="text-green-500 shrink-0" />
              <div>
                <p className="text-[12px] font-medium text-white">Excel (.xlsx)</p>
                <p className="text-[10px] text-zinc-500">Formato Excel (recomendado)</p>
              </div>
            </button>
            <button
              onClick={() =>
                handleFormatSelect(formatMenu as 'bookings' | 'clients' | 'financial', 'csv')
              }
              disabled={isExporting}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-white/[0.04] transition-all cursor-pointer"
            >
              <FileText size={14} className="text-blue-500 shrink-0" />
              <div>
                <p className="text-[12px] font-medium text-white">CSV (.csv)</p>
                <p className="text-[10px] text-zinc-500">Valores separados por ponto e vírgula</p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportButton;
