import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Users } from 'lucide-react';

const BottomTabs: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const tabs = [
    { label: 'Hoje', path: '/admin', icon: Calendar },
    { label: 'Semana', path: '/admin/weekly', icon: Calendar },
    { label: 'Clientes', path: '/admin/clients', icon: Users },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-[72px] bg-[#0A0A0A] border-t border-white/5 z-[100] px-6 lg:hidden">
      <div className="max-w-md mx-auto h-full flex items-center justify-between pb-safe">
        {tabs.map((tab) => {
          const active = isActive(tab.path);
          return (
            <button 
              key={tab.path}
              onClick={() => navigate(tab.path)} 
              className={`relative flex flex-col items-center gap-1.5 transition-colors pt-2 ${active ? 'text-[#B89B49]' : 'text-zinc-600 hover:text-zinc-400'}`}
            >
              {active && (
                <motion.div 
                  layoutId="bottomTabIndicator"
                  className="absolute top-0 w-8 h-0.5 bg-[#B89B49] rounded-b-full shadow-[0_0_8px_#B89B49]"
                />
              )}
              <tab.icon size={active ? 26 : 22} strokeWidth={active ? 2.5 : 2} className="transition-all duration-300" />
              <span className={`text-[9px] font-bold uppercase tracking-widest ${active ? 'text-white' : 'text-zinc-600'}`}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  );
};

export default BottomTabs;
