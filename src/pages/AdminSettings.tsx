import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Settings, LogOut, Trash2 } from 'lucide-react';
import { clearWeekBookings } from '../lib/api';
import { useAdminLogout } from '../hooks/useAdminLogout';
import { useToast } from '../hooks/useToast';
import AdminLayout from '../components/Admin/AdminLayout';
import ToastNotification from '../components/Admin/shared/ToastNotification';

const AdminSettings: React.FC = () => {
  const navigate = useNavigate();
  const [isReseting, setIsReseting] = useState(false);
  const handleLogout = useAdminLogout();
  const { toast, showSuccess, showError } = useToast();

  const handleResetAgenda = async () => {
    if (!window.confirm('Tem certeza que deseja apagar todos os agendamentos desta semana? Esta ação não pode ser desfeita.')) {
      return;
    }

    setIsReseting(true);
    try {
      const today = new Date();
      const monday = new Date(today);
      monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
      const saturday = new Date(monday);
      saturday.setDate(monday.getDate() + 5);

      const startDate = monday.toISOString().split('T')[0];
      const endDate = saturday.toISOString().split('T')[0];

      await clearWeekBookings(startDate, endDate);
      showSuccess('Agenda da semana resetada com sucesso!');
    } catch (error) {
      console.error(error);
      showError('Erro ao resetar agenda.');
    } finally {
      setIsReseting(false);
    }
  };

  return (
    <AdminLayout mainClassName="flex-1 lg:ml-0 pt-24 lg:pt-12 p-5 pb-32 max-w-5xl">
      <header className="flex items-center gap-4 mb-10">
        <button onClick={() => navigate('/admin')} className="text-zinc-600 hover:text-white transition-colors lg:hidden">
          <ArrowLeft size={16} />
        </button>
        <h1 className="text-2xl font-black uppercase tracking-tighter italic">Ajustes</h1>
      </header>

      <section className="space-y-4">
        <div className="bg-zinc-900/20 border border-white/[0.03] p-8 rounded-[2rem]">
          <div className="flex items-center gap-3 mb-8">
            <Settings size={14} className="text-zinc-700" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Conta e Sistema</h3>
          </div>
          
          <div className="space-y-3">
            <button 
              onClick={handleResetAgenda}
              disabled={isReseting}
              className="w-full flex items-center justify-center gap-3 py-4 bg-zinc-800/50 border border-white/5 text-zinc-400 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] hover:bg-zinc-800 hover:text-white transition-all cursor-pointer"
            >
              <Trash2 size={14} /> {isReseting ? 'Resetando...' : 'Resetar Agenda da Semana'}
            </button>

            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-3 py-4 bg-red-500/5 border border-red-500/10 text-red-500 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] hover:bg-red-500 hover:text-white transition-all cursor-pointer"
            >
              <LogOut size={14} /> Sair do Sistema
            </button>
          </div>
        </div>
      </section>

      <ToastNotification toast={toast} />
    </AdminLayout>
  );
};

export default AdminSettings;
