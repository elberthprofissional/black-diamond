import React from 'react';
import { User, Bell, Trash2, ChevronRight, AlertTriangle, Image as ImageIcon, Clock, Scissors } from 'lucide-react';

interface SettingsListProps {
  onSelect: (section: string) => void;
}

const categories = [
  {
    id: 'conta',
    label: 'Conta',
    description: 'Gerencie suas informações pessoais',
    icon: User,
    danger: false,
  },
  {
    id: 'galeria',
    label: 'Galeria',
    description: 'Gerencie as fotos exibidas aos clientes',
    icon: ImageIcon,
    danger: false,
  },
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
    id: 'notificacoes',
    label: 'Notificações',
    description: 'Receba alertas de novos agendamentos',
    icon: Bell,
    danger: false,
  },
  {
    id: 'dados',
    label: 'Zona de Segurança',
    description: 'Excluir permanentemente os dados',
    icon: Trash2,
    danger: true,
  },
];

const SettingsList: React.FC<SettingsListProps> = ({ onSelect }) => {
  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="divide-y divide-white/5">
        {categories.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.id)}
              className={`w-full flex items-center gap-4 px-1 py-4 transition-all cursor-pointer ${
                cat.danger
                  ? 'hover:bg-red-500/[0.04] border border-transparent hover:border-red-500/20 rounded-xl'
                  : 'hover:bg-white/[0.02]'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  cat.danger ? 'bg-red-500/[0.08] border border-red-500/20' : 'bg-white/[0.04]'
                }`}
              >
                <Icon size={16} className={cat.danger ? 'text-red-500/80' : 'text-zinc-400'} />
              </div>
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
  );
};

export default SettingsList;
