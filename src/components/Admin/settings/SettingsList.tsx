import React, { useState } from 'react';
import {
  Search,
  User,
  Bell,
  Trash2,
  ChevronRight,
  AlertTriangle,
  Image as ImageIcon,
  Clock,
  Scissors,
} from 'lucide-react';

interface SettingsListProps {
  onSelect: (section: string) => void;
  onLogoutClick?: () => void;
}

const groups = [
  {
    title: 'Sua Conta',
    items: [
      {
        id: 'conta',
        label: 'Conta',
        description: 'Gerencie suas informações pessoais',
        icon: User,
        danger: false,
      },
      {
        id: 'notificacoes',
        label: 'Notificações',
        description: 'Receba alertas de novos agendamentos',
        icon: Bell,
        danger: false,
      },
    ],
  },
  {
    title: 'Barbearia',
    items: [
      {
        id: 'servicos',
        label: 'Serviços',
        description: 'Gerencie os serviços oferecidos',
        icon: Scissors,
        danger: false,
      },
      {
        id: 'horarios',
        label: 'Horários',
        description: 'Configure seus dias e horários de atendimento',
        icon: Clock,
        danger: false,
      },
      {
        id: 'galeria',
        label: 'Galeria',
        description: 'Gerencie as fotos exibidas aos clientes',
        icon: ImageIcon,
        danger: false,
      },
    ],
  },
  {
    title: 'Segurança',
    items: [
      {
        id: 'dados',
        label: 'Zona de Segurança',
        description: 'Excluir permanentemente os dados',
        icon: Trash2,
        danger: true,
      },
    ],
  },
];

const SettingsList: React.FC<SettingsListProps> = ({ onSelect, onLogoutClick }) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filtragem dos grupos de configurações
  const filteredGroups = groups
    .map((group) => {
      const items = group.items.filter(
        (item) =>
          item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
      return { ...group, items };
    })
    .filter((group) => group.items.length > 0);

  return (
    <div className="max-w-lg mx-auto space-y-6 px-4 sm:px-0">
      {/* Barra de Pesquisa */}
      <div className="relative flex items-center">
        <Search size={16} className="absolute left-4 text-zinc-500 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Pesquisar..."
          className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl pl-11 pr-4 py-3 text-[13px] text-white outline-none focus:border-[#C5A059]/40 focus:ring-1 focus:ring-[#C5A059]/20 transition-all placeholder:text-zinc-600"
          aria-label="Pesquisar configurações"
        />
      </div>

      {/* Lista de Grupos */}
      <div className="space-y-6">
        {filteredGroups.map((group) => (
          <div key={group.title} className="space-y-2">
            <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] px-1">
              {group.title}
            </h2>
            <div className="divide-y divide-white/5 bg-white/[0.02] sm:bg-transparent rounded-2xl sm:rounded-none px-4 sm:px-0">
              {group.items.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => onSelect(cat.id)}
                    className={`w-full flex items-center gap-4 py-4 transition-all cursor-pointer ${
                      cat.danger
                        ? 'hover:bg-red-500/[0.04] border border-transparent hover:border-red-500/20 rounded-xl px-1'
                        : 'hover:bg-white/[0.02]'
                    }`}
                  >
                    <Icon
                      size={18}
                      className={`shrink-0 ${cat.danger ? 'text-red-500/80' : 'text-zinc-400'}`}
                    />
                    <div className="flex-1 text-left min-w-0">
                      <span
                        className={`text-[13px] font-medium block ${cat.danger ? 'text-red-400/90' : 'text-white'}`}
                      >
                        {cat.label}
                      </span>
                      <span
                        className={`text-[11px] block ${cat.danger ? 'text-red-500/50' : 'text-zinc-500'}`}
                      >
                        {cat.description}
                      </span>
                    </div>
                    {cat.danger ? (
                      <AlertTriangle size={14} className="text-red-500/60 animate-pulse" />
                    ) : (
                      <ChevronRight size={16} className="text-zinc-600" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {filteredGroups.length === 0 && (
          <p className="text-center text-[12px] text-zinc-500 py-8">
            Nenhuma configuração encontrada
          </p>
        )}
      </div>

      {/* Linha Divisória e Botão de Sair no final */}
      {onLogoutClick && searchQuery === '' && (
        <div className="border-t border-white/5 pt-2">
          <button
            onClick={onLogoutClick}
            className="w-full text-left px-1 py-4 text-[13px] font-medium text-red-500 hover:text-red-400 active:text-red-600 transition-colors cursor-pointer"
          >
            Sair
          </button>
        </div>
      )}
    </div>
  );
};

export default SettingsList;
