import { type FC } from 'react';
import {
  User,
  Bell,
  Trash2,
  ChevronRight,
  AlertTriangle,
  Image as ImageIcon,
  Clock,
  Scissors,
  LogOut,
  Crown,
  UserX,
  Gift,
  Tag,
  MessageSquare,
} from 'lucide-react';

interface SettingsListProps {
  onSelect: (section: string) => void;
  onLogoutClick?: () => void;
}

const groups = [
  {
    title: 'Sua Conta',
    items: [
      { id: 'conta', label: 'Conta', icon: User, danger: false },
      { id: 'notificacoes', label: 'Notificações', icon: Bell, danger: false },
    ],
  },
  {
    title: 'Barbearia',
    items: [
      { id: 'servicos', label: 'Serviços', icon: Scissors, danger: false },
      { id: 'horarios', label: 'Horários', icon: Clock, danger: false },
      { id: 'mensalista', label: 'Mensalista', icon: Crown, danger: false },
      { id: 'faltas', label: 'Controle de Faltas', icon: UserX, danger: false },
      { id: 'fidelidade', label: 'Fidelidade', icon: Gift, danger: false },
      { id: 'cupons', label: 'Cupons', icon: Tag, danger: false },
      { id: 'galeria', label: 'Galeria', icon: ImageIcon, danger: false },
      { id: 'depoimentos', label: 'Depoimentos', icon: MessageSquare, danger: false },
    ],
  },
  {
    title: 'Segurança',
    items: [
      { id: 'dados', label: 'Zona de Segurança', icon: Trash2, danger: true },
      { id: 'sair', label: 'Sair', icon: LogOut, danger: true },
    ],
  },
];

const SettingsList: FC<SettingsListProps> = ({ onSelect, onLogoutClick }) => {
  return (
    <div className="max-w-lg mx-auto space-y-6 px-4 sm:px-0">
      {groups.map((group) => (
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
                  onClick={() => (cat.id === 'sair' ? onLogoutClick?.() : onSelect(cat.id))}
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
                  <span
                    className={`flex-1 text-left text-[13px] font-medium ${cat.danger ? 'text-red-400/90' : 'text-white'}`}
                  >
                    {cat.label}
                  </span>
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
    </div>
  );
};

export default SettingsList;
