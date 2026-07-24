import { type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Bell, Plus } from 'lucide-react';

interface ClientListHeaderProps {
  clientCount: number;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onNewClient: () => void;
  onOpenReminders: () => void;
}

const ClientListHeader: FC<ClientListHeaderProps> = ({
  clientCount,
  searchTerm,
  onSearchChange,
  onNewClient,
  onOpenReminders,
}) => {
  const navigate = useNavigate();

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between pb-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin')}
            className="text-zinc-500 hover:text-white transition-all cursor-pointer shrink-0 -ml-1"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              Meus Clientes
            </h1>
            <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.2em] mt-0.5">
              {clientCount} cadastrados
            </p>
          </div>
        </div>
      </div>

      {/* Search + Actions */}
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-xl flex items-center focus-within:border-white/10 transition-all overflow-hidden">
          <div className="pl-4 pr-3 shrink-0">
            <Search size={15} className="text-zinc-600" />
          </div>
          <input
            type="text"
            placeholder="Pesquisar contatos..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-transparent py-3.5 text-xs font-medium text-white outline-none placeholder:text-zinc-600 text-left overflow-hidden text-ellipsis"
          />
        </div>
        <button
          onClick={onOpenReminders}
          className="hidden lg:flex h-[46px] px-5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] items-center justify-center gap-2 transition-all cursor-pointer shrink-0"
        >
          <Bell size={14} className="text-[#D4AF37]" />
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
            Lembretes
          </span>
        </button>
        <button
          onClick={onNewClient}
          className="h-[46px] px-5 rounded-xl bg-[#D4AF37] hover:bg-[#b8962e] flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0 active:scale-95"
        >
          <Plus size={16} strokeWidth={2.5} className="text-black" />
          <span className="text-[10px] font-bold text-black uppercase tracking-wider hidden sm:block">
            Novo Cliente
          </span>
        </button>
      </div>
    </>
  );
};

export default ClientListHeader;
