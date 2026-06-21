import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Clock, CalendarDays, Users } from 'lucide-react';

const BottomTabs: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const tabs = [
    { label: 'Hoje', path: '/admin', icon: Clock },
    { label: 'Semana', path: '/admin/weekly', icon: CalendarDays },
    { label: 'Clientes', path: '/admin/clients', icon: Users },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-[72px] bg-[#0E0E0E]/90 backdrop-blur-md border-t border-white/[0.06] z-[100] lg:hidden">
      <div className="flex items-center justify-around h-full max-w-lg mx-auto px-4">
        {tabs.map((tab) => {
          const active = isActive(tab.path);
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center justify-center gap-1 flex-1 h-full cursor-pointer transition-colors ${
                active ? 'text-[#C5A059]' : 'text-zinc-500'
              }`}
            >
              <tab.icon size={18} strokeWidth={active ? 2.2 : 1.6} />
              <span className={`text-[8px] font-bold uppercase tracking-widest ${
                active ? 'text-[#C5A059]' : 'text-zinc-500'
              }`}>
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
