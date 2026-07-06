import React from 'react';
import { motion } from 'framer-motion';
import { EyeOff, Eye } from 'lucide-react';

interface LoginFormProps {
  email: string;
  onEmailChange: (email: string) => void;
  password: string;
  onPasswordChange: (password: string) => void;
  showPassword: boolean;
  onTogglePassword: () => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onForgotPassword: () => void;
  isLoggingIn: boolean;
  isBlocked: boolean;
  attempts: number;
  maxAttempts: number;
}

export default function LoginForm({
  email,
  onEmailChange,
  password,
  onPasswordChange,
  showPassword,
  onTogglePassword,
  onSubmit,
  onForgotPassword,
  isLoggingIn,
  isBlocked,
  attempts,
  maxAttempts,
}: LoginFormProps) {
  return (
    <form onSubmit={onSubmit} className="w-full space-y-6 lg:space-y-12">
      <div className="space-y-4 lg:space-y-10">
        {/* Email */}
        <div className="space-y-2 lg:space-y-4">
          <div className="relative group flex items-center">
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              className="peer w-full h-14 bg-transparent border border-zinc-800 rounded-2xl px-6 pt-5 pb-1 text-sm font-medium text-zinc-100 outline-none focus:border-[#C5A059] transition-all placeholder-transparent lg:h-16 lg:pt-6 lg:pb-2 lg:font-light lg:text-lg lg:rounded-xl"
              placeholder="email"
              required
            />
            <label
              htmlFor="login-email"
              className="absolute left-6 text-xs text-zinc-500 pointer-events-none transition-all
                peer-placeholder-shown:text-sm peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2
                peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-[10px] peer-focus:text-[#C5A059]
                top-2 translate-y-0 text-[10px] text-zinc-500"
            >
              email
            </label>
          </div>
        </div>

        {/* Password */}
        <div className="space-y-2 lg:space-y-4">
          <div className="relative group flex items-center">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              className="peer w-full h-14 bg-transparent border border-zinc-800 rounded-2xl px-6 pr-14 pt-5 pb-1 text-sm font-medium text-zinc-100 outline-none focus:border-[#C5A059] transition-all placeholder-transparent lg:h-16 lg:pt-6 lg:pb-2 lg:font-light lg:text-lg lg:rounded-xl"
              placeholder="senha"
              required
            />
            <label
              htmlFor="login-password"
              className="absolute left-6 text-xs text-zinc-500 pointer-events-none transition-all
                peer-placeholder-shown:text-sm peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2
                peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-[10px] peer-focus:text-[#C5A059]
                top-2 translate-y-0 text-[10px] text-zinc-500"
            >
              senha
            </label>
            <button
              type="button"
              onClick={onTogglePassword}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              aria-pressed={showPassword}
              className="absolute right-6 lg:right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div className="flex justify-end lg:pt-2">
            <button
              type="button"
              onClick={onForgotPassword}
              className="text-[8px] lg:text-[9px] font-black lg:font-medium text-[#C5A059]/70 uppercase tracking-widest hover:text-[#C5A059] transition-colors cursor-pointer"
            >
              Esqueceu a senha?
            </button>
          </div>
        </div>
      </div>

      {attempts >= 3 && !isBlocked && (
        <p className="text-[10px] text-amber-500/70 text-center">
          Atenção: {maxAttempts - attempts} tentativa(s) restante(s) antes do bloqueio temporário.
        </p>
      )}

      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        type="submit"
        data-testid="login-submit"
        disabled={isLoggingIn || isBlocked}
        className="w-full h-11 lg:h-12 bg-[#C5A059] text-black font-black uppercase tracking-[0.5em] text-[11px] rounded-2xl lg:rounded-sm hover:bg-white transition-all flex items-center justify-center gap-3 group lg:mt-8 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span>{isLoggingIn ? 'Entrando...' : isBlocked ? 'Bloqueado' : 'Entrar'}</span>
      </motion.button>
    </form>
  );
}
