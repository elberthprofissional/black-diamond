import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Users, ChevronDown, User, LogOut, Clock } from 'lucide-react';
import { useAdminLogout } from '../../hooks/useAdminLogout';

const AdminSidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const handleLogout = useAdminLogout();

  const isActive = (path: string) => location.pathname === path;

  const mainMenuItems = [
    { label: 'Agenda do Dia', path: '/admin', icon: Clock },
    { label: 'Agenda Semanal', path: '/admin/weekly', icon: Calendar },
    { label: 'Meus Clientes', path: '/admin/clients', icon: Users },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-[320px] h-screen fixed left-0 top-0 bg-[#0A0A0A] border-r border-white/5 z-[100] font-sans">
      
      {/* 1. BRANDING - HIGH END UTILITY */}
      <div className="h-28 flex items-center px-10">
        <div 
          className="flex items-center gap-4 cursor-pointer" 
          onClick={() => navigate('/admin')}
        >
          <img 
            src="/assets/logo.webp" 
            alt="Black Diamond" 
            className="w-10 h-10 object-contain"
          />
          <div className="flex flex-col">
            <h2 className="text-xs font-black tracking-[0.2em] text-white uppercase leading-none">Black Diamond</h2>
          </div>
        </div>
      </div>

      {/* 2. NAVIGATION - SaaS STYLE */}
      <div className="flex-1 px-6 py-4 overflow-y-auto scrollbar-hide space-y-8">
        <div>
          <span className="text-[9px] font-bold text-zinc-700 uppercase tracking-[0.3em] px-4 block mb-4">Menu Principal</span>
          <nav className="space-y-1">
            {mainMenuItems.map((item) => {
              const active = isActive(item.path);
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all group relative ${
                    active 
                      ? 'bg-white/5 text-white' 
                      : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.02]'
                  }`}
                >
                  {active && (
                    <motion.div 
                      layoutId="activeIndicator"
                      className="absolute left-0 w-1 h-4 bg-[#C5A059] rounded-r-full"
                    />
                  )}
                  
                  <Icon 
                    size={16} 
                    className={`transition-colors ${active ? 'text-[#C5A059]' : 'text-zinc-700 group-hover:text-zinc-400'}`} 
                  />
                  
                  <span className={`text-[11px] font-bold tracking-wide ${active ? 'text-white' : 'text-zinc-500'}`}>
                    {item.label}
                  </span>

                  {active && (
                     <div className="ml-auto w-1 h-1 rounded-full bg-[#C5A059] shadow-[0_0_8px_#C5A059]" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* 3. PROFILE & SYSTEM ACTIONS */}
      <div className="mt-auto border-t border-white/5 p-6">
        <div className="relative">
          <button 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all group ${
              isProfileOpen ? 'bg-white/5' : 'hover:bg-white/[0.02]'
            }`}
          >
            <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-white/5 overflow-hidden flex-shrink-0">
              <img 
                src="/assets/barbeiro.webp"
                alt="Tato" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="text-left flex-1 min-w-0">
              <p className="text-[11px] font-bold text-white truncate">Tato</p>
            </div>
            <ChevronDown size={14} className={`text-zinc-700 transition-transform duration-300 ${isProfileOpen ? 'rotate-180 text-white' : 'group-hover:text-zinc-400'}`} />
          </button>

          <AnimatePresence>
            {isProfileOpen && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute bottom-full left-0 right-0 mb-2 bg-[#0C0C0E] border border-white/5 p-1.5 rounded-xl shadow-2xl backdrop-blur-xl z-[120]"
              >
                <button 
                  onClick={() => { setIsProfileOpen(false); navigate('/admin/profile'); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-all text-[10px] font-bold uppercase tracking-widest"
                >
                  <User size={14} className="text-zinc-600" /> Meu Perfil
                </button>
                <button 
                  onClick={() => { setIsProfileOpen(false); setShowLogoutConfirm(true); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-red-500/70 hover:text-red-500 hover:bg-red-500/5 rounded-lg transition-all text-[10px] font-bold uppercase tracking-widest"
                >
                  <LogOut size={14} /> Sair
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* LOGOUT CONFIRMATION MODAL */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowLogoutConfirm(false)}
              className="absolute inset-0 bg-black/60"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 30, stiffness: 400 }}
              className="relative z-10 w-full max-w-[260px] bg-[#1A1A1A] rounded-2xl overflow-hidden"
            >
              <div className="p-5 text-center">
                <p className="text-[11px] text-zinc-300 font-medium">Sair da conta?</p>
              </div>
              <div className="border-t border-white/[0.06]">
                <button 
                  onClick={handleLogout}
                  className="w-full py-3.5 text-[11px] font-bold text-red-500 active:bg-white/[0.03] transition-colors cursor-pointer"
                >
                  Sair
                </button>
              </div>
              <div className="border-t border-white/[0.06]">
                <button 
                  onClick={() => setShowLogoutConfirm(false)}
                  className="w-full py-3.5 text-[11px] font-bold text-zinc-300 active:bg-white/[0.03] transition-colors cursor-pointer"
                >
                  Manter
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </aside>
  );
};

export default AdminSidebar;
