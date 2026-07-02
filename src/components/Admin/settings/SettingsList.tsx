import React from 'react';
import { User, Scissors, Calendar, Bell, Shield, Trash2, ChevronRight } from 'lucide-react';

interface SettingsListProps {
  onSelect: (section: string) => void;
}

const categories = [
  { id: 'conta', label: 'Conta', description: 'Nome e WhatsApp', icon: User },
  { id: 'barbearia', label: 'Barbearia', description: 'Horários e localização', icon: Scissors, soon: true },
  { id: 'agenda', label: 'Agenda', description: 'Configurações de agendamento', icon: Calendar, soon: true },
  { id: 'notificacoes', label: 'Notificações', description: 'Alertas e push', icon: Bell },
  { id: 'seguranca', label: 'Segurança', description: 'Senha e acesso', icon: Shield, soon: true },
  { id: 'dados', label: 'Dados', description: 'Limpar informações', icon: Trash2, danger: true },
];

const SettingsList: React.FC<SettingsListProps> = ({ onSelect }) => {
  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-xl font-bold tracking-tight text-white uppercase italic">Configurações</h1>

      <div className="bg-[#111111] border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
        {categories.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.id)}
              disabled={cat.soon}
              className={`w-full flex items-center gap-4 px-5 py-4 transition-all cursor-pointer ${
                cat.soon
                  ? 'opacity-40 cursor-not-allowed'
                  : cat.danger
                    ? 'hover:bg-red-500/[0.03]'
                    : 'hover:bg-white/[0.02]'
              }`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                cat.danger ? 'bg-red-500/10' : 'bg-white/[0.04]'
              }`}>
                <Icon size={16} className={cat.danger ? 'text-red-400' : 'text-zinc-400'} />
              </div>
              <div className="flex-1 text-left min-w-0">
                <span className={`text-[13px] font-medium block ${cat.danger ? 'text-red-400' : 'text-white'}`}>
                  {cat.label}
                </span>
                <span className="text-[11px] text-zinc-500 block">{cat.description}</span>
              </div>
              {cat.soon ? (
                <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider">Em breve</span>
              ) : (
                <ChevronRight size={16} className={cat.danger ? 'text-red-400/40' : 'text-zinc-600'} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SettingsList;
