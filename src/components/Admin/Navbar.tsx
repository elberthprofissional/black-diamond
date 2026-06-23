import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, User, LogOut, Camera } from 'lucide-react';
import { useAdminLogout } from '../../hooks/useAdminLogout';
 
const AdminNavbar: React.FC = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const handleLogout = useAdminLogout();

  const [visible, setVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // If at the very top (or bounce on iOS), keep visible
      if (currentScrollY <= 10) {
        setVisible(true);
        setLastScrollY(currentScrollY);
        return;
      }
      
      if (currentScrollY > lastScrollY) {
        setVisible(false); // scrolling down
        setIsMenuOpen(false); // close user dropdown menu
      } else {
        setVisible(true); // scrolling up
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);
 
  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 h-16 bg-[#0E0E0E]/90 backdrop-blur-md border-b border-white/[0.06] z-[100] px-6 lg:hidden transition-transform duration-300 ${visible ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="max-w-7xl mx-auto h-full flex items-center justify-between">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => navigate('/admin')}>
            <img src="/assets/logo.webp" alt="Logo" className="w-10 h-10 object-contain" />
            <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white">Black Diamond</span>
          </div>
 
          <div className="relative">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-full border border-white/[0.08] group-hover:border-[#C5A059]/30 transition-all flex items-center justify-center text-zinc-500 bg-zinc-900">
                <Camera size={14} className="stroke-[1.5]" />
              </div>
              <ChevronDown size={10} className={`text-zinc-600 transition-transform duration-300 ${isMenuOpen ? 'rotate-180' : ''}`} />
            </button>
 
            <AnimatePresence>
              {isMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
                  <motion.div 
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-48 bg-[#161618] border border-white/[0.06] rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-50 overflow-hidden"
                  >
                    <div className="p-2 space-y-1">
                      <button 
                        onClick={() => { navigate('/admin/profile'); setIsMenuOpen(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-[10px] font-bold text-zinc-300 hover:text-white hover:bg-white/[0.04] rounded-lg transition-all"
                      >
                        <User size={13} className="text-zinc-500" /> Meu Perfil
                      </button>
                    </div>
                    <div className="h-px bg-white/[0.04]" />
                    <div className="p-2">
                      <button 
                        onClick={() => { setIsMenuOpen(false); setShowLogoutConfirm(true); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-[10px] font-bold text-red-400/70 hover:text-red-400 hover:bg-red-500/5 rounded-lg transition-all"
                      >
                        <LogOut size={13} /> Sair
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </nav>

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
              transition={{ duration: 0.2 }}
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
    </>
  );
};

export default AdminNavbar;
