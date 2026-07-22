import { type FC } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Clock, CalendarDays, Users, User } from 'lucide-react';
import { useBarberContext } from '../../contexts/BarberContext';

const BottomTabs: FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isOwner } = useBarberContext();

  const isActive = (path: string) => location.pathname === path;

  const tabs = isOwner
    ? [
        { label: 'Hoje', path: '/admin', icon: Clock },
        { label: 'Semana', path: '/admin/weekly', icon: CalendarDays },
        { label: 'Clientes', path: '/admin/clients', icon: Users },
        { label: 'Perfil', path: '/admin/profile', icon: User },
      ]
    : [
        { label: 'Hoje', path: '/admin', icon: Clock },
        { label: 'Semana', path: '/admin/weekly', icon: CalendarDays },
        { label: 'Clientes', path: '/admin/clients', icon: Users },
        { label: 'Perfil', path: '/admin/profile', icon: User },
      ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-[#0E0E0E]/90 backdrop-blur-md border-t border-white/[0.06] z-[100] lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Navegação principal"
    >
      <div
        className="flex items-center justify-around h-[60px] max-w-lg mx-auto px-4"
        role="tablist"
      >
        {tabs.map((tab) => {
          const active = isActive(tab.path);
          return (
            <button
              key={tab.path}
              role="tab"
              aria-selected={active}
              aria-label={tab.label}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center justify-center flex-1 h-full cursor-pointer transition-colors gap-1 ${
                active ? 'text-[#D4AF37]' : 'text-zinc-500'
              }`}
            >
              <tab.icon size={20} strokeWidth={active ? 2.2 : 1.6} />
              <span
                className={`text-[9px] font-bold ${active ? 'text-[#D4AF37]' : 'text-zinc-600'}`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomTabs;
