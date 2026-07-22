import { type FC } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Clock, CalendarDays, Users } from 'lucide-react';

const tabs = [
  { label: 'Hoje', path: '/admin', icon: Clock },
  { label: 'Semana', path: '/admin/weekly', icon: CalendarDays },
  { label: 'Clientes', path: '/admin/clients', icon: Users },
];

const BottomTabs: FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

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
                active ? 'text-[#D4AF37]' : 'text-zinc-600'
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
