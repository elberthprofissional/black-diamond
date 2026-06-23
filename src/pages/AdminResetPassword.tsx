import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { EyeOff, Eye, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../hooks/useToast';
import ToastNotification from '../components/Admin/shared/ToastNotification';

const AdminResetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast, showSuccess, showError } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        showError('Link de recuperação inválido ou expirado.');
        setTimeout(() => navigate('/admin/login'), 2500);
      }
    };
    void checkSession();
  }, [navigate, showError]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || !confirmPassword.trim()) {
      showError('Preencha todos os campos.');
      return;
    }
    if (password !== confirmPassword) {
      showError('As senhas não coincidem.');
      return;
    }
    if (password.length < 6) {
      showError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: password.trim() });
      if (error) {
        showError('Erro ao atualizar a senha: ' + error.message);
      } else {
        showSuccess('Senha alterada com sucesso!');
        setTimeout(() => navigate('/admin'), 1500);
      }
    } catch {
      showError('Erro ao tentar atualizar a senha.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="h-screen w-full bg-[#0A0A0A] text-white flex items-center justify-center font-sans touch-none p-5">
      <div className="w-full max-w-sm bg-[#111111] border border-white/5 overflow-hidden rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] p-8">
        <div className="space-y-6">
          <div className="flex justify-center">
            <div className="w-12 h-12 rounded-full bg-[#C5A059]/10 border border-[#C5A059]/20 flex items-center justify-center text-[#C5A059]">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
            </div>
          </div>

          <div className="space-y-2 text-center">
            <h3 className="text-base font-bold text-white uppercase tracking-[0.15em]">Nova Senha</h3>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider leading-relaxed">
              Crie uma nova senha de acesso para o seu painel.
            </p>
          </div>

          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-1.5 text-left">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block pl-1">Nova Senha</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Mínimo 6 caracteres" 
                  className="w-full bg-white/[0.02] border border-white/[0.06] focus:border-[#C5A059]/40 focus:shadow-[0_0_15px_rgba(197,160,89,0.1)] rounded-xl px-4 py-3.5 text-sm text-white outline-none transition-all duration-300 placeholder:text-zinc-700" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block pl-1">Confirmar Nova Senha</label>
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Repita a nova senha" 
                className="w-full bg-white/[0.02] border border-white/[0.06] focus:border-[#C5A059]/40 focus:shadow-[0_0_15px_rgba(197,160,89,0.1)] rounded-xl px-4 py-3.5 text-sm text-white outline-none transition-all duration-300 placeholder:text-zinc-700" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
              />
            </div>

            <button
              type="submit"
              disabled={isUpdating || !password.trim() || !confirmPassword.trim()}
              className="w-full h-12 bg-white hover:bg-[#C5A059] text-black font-bold text-[10px] uppercase tracking-[0.25em] rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed mt-6"
            >
              {isUpdating ? 'Salvando...' : 'Salvar Nova Senha'}
              {!isUpdating && <ChevronRight size={14} />}
            </button>
          </form>
        </div>
      </div>

      <ToastNotification toast={toast} />
    </div>
  );
};

export default AdminResetPassword;
