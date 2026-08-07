import { type FC } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Clock, CalendarDays, Users, BarChart3 } from 'lucide-react';
import { useBarberContext } from '../../contexts/BarberContext';

const BASE_TABS = [
  { label: 'Hoje', path: '/admin', icon: Clock },
  { label: 'Semana', path: '/admin/weekly', icon: CalendarDays },
  { label: 'Clientes', path: '/admin/clients', icon: Users },
];

const OWNER_TAB = { label: 'Relatórios', path: '/admin/reports', icon: BarChart3 };

const BottomTabs: FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isOwner } = useBarberContext();

  const tabs = isOwner ? [...BASE_TABS, OWNER_TAB] : BASE_TABS;

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-[#0E0E0E]/90 backdrop-blur-md border-t border-white/[0.06] z-[100] lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Navegação principal"
    >
      <div
        className="flex items-center justify-around h-[56px] max-w-lg mx-auto px-6"
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
              className={`flex items-center justify-center w-12 h-12 cursor-pointer transition-all ${
                active ? 'text-gold' : 'text-zinc-600'
              }`}
            >
              <tab.icon size={22} strokeWidth={active ? 2.2 : 1.5} />
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomTabs;
