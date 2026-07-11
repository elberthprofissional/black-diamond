import { useState, useRef, useEffect, type FC } from 'react';
import { Download, FileText, Users, TrendingUp, ChevronDown, Loader2 } from 'lucide-react';
import { useCsvExport } from '../../../hooks/useCsvExport';
import { useToast } from '../../../hooks/useToast';

const ExportButton: FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { toast, showError } = useToast();
  const { isExporting, exportBookings, exportClients, exportFinancial } = useCsvExport(showError);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const handleExport = async (type: 'bookings' | 'clients' | 'financial') => {
    setIsOpen(false);
    switch (type) {
      case 'bookings':
        await exportBookings();
        break;
      case 'clients':
        await exportClients();
        break;
      case 'financial':
        await exportFinancial();
        break;
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
        className="flex items-center gap-2 px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-[12px] font-medium text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer disabled:opacity-50"
      >
        {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
        <span className="hidden sm:inline">Exportar</span>
        <ChevronDown size={12} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-56 bg-[#141414] border border-white/[0.08] rounded-xl shadow-2xl overflow-hidden z-50">
          <div className="p-1.5">
            <button
              onClick={() => handleExport('bookings')}
              disabled={isExporting}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-white/[0.04] transition-all cursor-pointer"
            >
              <FileText size={14} className="text-[#C5A059] shrink-0" />
              <div>
                <p className="text-[12px] font-medium text-white">Agendamentos</p>
                <p className="text-[10px] text-zinc-500">Lista completa de agendamentos</p>
              </div>
            </button>
            <button
              onClick={() => handleExport('clients')}
              disabled={isExporting}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-white/[0.04] transition-all cursor-pointer"
            >
              <Users size={14} className="text-[#C5A059] shrink-0" />
              <div>
                <p className="text-[12px] font-medium text-white">Clientes</p>
                <p className="text-[10px] text-zinc-500">Dados e histórico de clientes</p>
              </div>
            </button>
            <button
              onClick={() => handleExport('financial')}
              disabled={isExporting}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-white/[0.04] transition-all cursor-pointer"
            >
              <TrendingUp size={14} className="text-[#C5A059] shrink-0" />
              <div>
                <p className="text-[12px] font-medium text-white">Financeiro</p>
                <p className="text-[10px] text-zinc-500">Receita e cancelamentos por mês</p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportButton;
