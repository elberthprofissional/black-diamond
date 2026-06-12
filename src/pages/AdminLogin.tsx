import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scissors, Lock } from 'lucide-react';

const AdminLogin: React.FC = () => {
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Simple mock login for beta
    if (password === 'admin123') {
      navigate('/admin');
    } else {
      alert('Senha incorreta!');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <div className="bg-dark-card border border-dark-border p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <Scissors className="text-gold-600 w-12 h-12 mx-auto mb-4" />
          <h1 className="text-3xl font-serif font-bold text-white uppercase tracking-widest">Painel Admin</h1>
          <p className="text-gray-400 font-light mt-2">Acesso restrito para barbeiros</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-gray-400 text-sm mb-2 uppercase tracking-widest font-bold">Senha de Acesso</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black border border-dark-border text-white p-4 pl-12 rounded-sm outline-none focus:border-gold-600 transition-colors"
                placeholder="Digite sua senha"
              />
            </div>
          </div>

          <button 
            type="submit"
            className="w-full bg-gold-gradient text-black font-bold py-4 rounded-sm uppercase tracking-widest hover:scale-[1.02] transition-transform"
          >
            Entrar no Painel
          </button>
        </form>

        <div className="mt-8 text-center">
          <a href="/" className="text-gray-500 text-sm hover:text-white transition-colors">Voltar para o site</a>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
