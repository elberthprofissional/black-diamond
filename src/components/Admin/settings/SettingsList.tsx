import { type FC } from 'react';
import {
  ChevronRight,
  Image as ImageIcon,
  Clock,
  Scissors,
  UserX,
  Gift,
  Tag,
  MessageSquare,
  Crown,
  Users,
  User,
  Bell,
} from 'lucide-react';

interface SettingsListProps {
  onSelect: (section: string) => void;
}

const ALL_ITEMS = [
  { id: 'servicos', label: 'Serviços', icon: Scissors, danger: false },
  { id: 'horarios', label: 'Horários', icon: Clock, danger: false },
  { id: 'barbeiros', label: 'Barbeiros', icon: Users, danger: false },
  { id: 'faltas', label: 'Controle de Faltas', icon: UserX, danger: false },
  { id: 'fidelidade', label: 'Fidelidade', icon: Gift, danger: false },
  { id: 'cupons', label: 'Cupons', icon: Tag, danger: false },
  { id: 'mensalista', label: 'Mensalista', icon: Crown, danger: false },
  { id: 'galeria', label: 'Galeria', icon: ImageIcon, danger: false },
  { id: 'depoimentos', label: 'Depoimentos', icon: MessageSquare, danger: false },
];

/** Itens de acesso geral — barbeiros comuns também podem acessar. */
const GENERAL_ITEMS = [
  { id: 'conta', label: 'Conta', icon: User, danger: false },
  { id: 'notificacoes', label: 'Notificações', icon: Bell, danger: false },
];

const SettingsList: FC<SettingsListProps & { isOwner?: boolean }> = ({
  onSelect,
  isOwner = true,
}) => {
  // Barbeiro comum: só vê Conta e Notificações (gerais). Dono: tudo.
  const items = isOwner ? [...ALL_ITEMS, ...GENERAL_ITEMS] : GENERAL_ITEMS;
  const visibleGroups = [{ title: 'Barbearia', items }];

  return (
    <div className="max-w-lg mx-auto space-y-6 px-4 sm:px-0">
      {visibleGroups.map((group) => (
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
                  <span
                    className={`flex-1 text-left text-[14px] font-medium ${cat.danger ? 'text-red-400/90' : 'text-white'}`}
                  >
                    {cat.label}
                  </span>
                  <ChevronRight size={16} className="text-zinc-600" />
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
