import React from 'react';
import { User, Bell, Trash2, ChevronRight } from 'lucide-react';

interface SettingsListProps {
  onSelect: (section: string) => void;
}

const categories = [
  { id: 'conta', label: 'Conta', description: 'Altere suas informações pessoais', icon: User },
  { id: 'notificacoes', label: 'Notificações', description: 'Receba alertas de novos agendamentos', icon: Bell },
  { id: 'dados', label: 'Zona de Segurança', description: 'Apagar todos os dados', icon: Trash2 },
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
              className="w-full flex items-center gap-4 px-1 py-4 transition-all cursor-pointer hover:bg-white/[0.02]"
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-white/[0.04]">
                <Icon size={16} className="text-zinc-400" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <span className="text-[13px] font-medium block text-white">
                  {cat.label}
                </span>
                <span className="text-[11px] text-zinc-500 block">{cat.description}</span>
              </div>
              <ChevronRight size={16} className="text-zinc-600" />
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SettingsList;
