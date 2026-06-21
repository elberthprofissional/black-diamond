import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, User, LogOut } from 'lucide-react';
import { useAdminLogout } from '../../hooks/useAdminLogout';

const AdminNavbar: React.FC = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const handleLogout = useAdminLogout();

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-[#0E0E0E]/90 backdrop-blur-md border-b border-white/[0.06] z-[100] px-6 lg:hidden">
      <div className="max-w-7xl mx-auto h-full flex items-center justify-between">
        {/* Logo & Brand */}
        <div className="flex items-center gap-4 cursor-pointer" onClick={() => navigate('/admin')}>
          <img src="/assets/logo.webp" alt="Logo" className="w-10 h-10 object-contain" />
          <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white">Black Diamond</span>
        </div>

        {/* Profile Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center gap-2 group"
          >
            <div className="w-8 h-8 rounded-full bg-zinc-900 border border-white/[0.05] flex items-center justify-center text-zinc-600 group-hover:border-[#C5A059]/30 transition-all overflow-hidden">
               <img src="/assets/barbeiro.webp" alt="Tato" className="w-full h-full object-cover" />
            </div>
            <ChevronDown size={10} className={`text-zinc-700 transition-transform duration-300 ${isMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {isMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-3 w-48 bg-zinc-950 border border-white/[0.05] rounded-[1.2rem] shadow-2xl z-50 overflow-hidden p-1.5"
                >
                  <button 
                    onClick={() => { navigate('/admin/profile'); setIsMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-[9px] font-bold text-zinc-400 hover:text-white hover:bg-white/[0.02] rounded-lg transition-all uppercase tracking-widest"
                  >
                    <User size={12} /> Meu Perfil
                  </button>
                  
                  <div className="h-px bg-white/[0.03] my-1.5" />
                  
                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-[9px] font-bold text-red-500/60 hover:text-red-500 hover:bg-red-500/5 rounded-lg transition-all uppercase tracking-widest"
                  >
                    <LogOut size={12} /> Sair
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </nav>
  );
};

export default AdminNavbar;

