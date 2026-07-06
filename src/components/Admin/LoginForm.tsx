import React from 'react';
import { motion } from 'framer-motion';
import { EyeOff, Eye, ChevronRight } from 'lucide-react';

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
          <label
            htmlFor="login-email"
            className="text-[9px] font-black lg:font-medium text-zinc-500 uppercase tracking-[0.4em] lg:tracking-[0.3em] ml-1 lg:ml-0"
          >
            E-mail
          </label>
          <div className="relative group">
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              className="w-full h-14 bg-transparent border border-white/[0.08] rounded-2xl px-6 text-sm font-medium text-white outline-none focus:border-[#C5A059]/50 focus:ring-1 focus:ring-[#C5A059]/20 transition-all placeholder:text-zinc-600 lg:h-12 lg:font-light lg:text-lg"
              placeholder="seu@email.com"
              required
            />
            <div className="absolute bottom-0 left-6 right-6 lg:hidden h-[1px] bg-gradient-to-r from-transparent via-[#C5A059]/0 to-transparent group-focus-within:via-[#C5A059]/40 transition-all duration-500" />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-2 lg:space-y-4">
          <label
            htmlFor="login-password"
            className="text-[9px] font-black lg:font-medium text-zinc-500 uppercase tracking-[0.4em] lg:tracking-[0.3em] ml-1 lg:ml-0"
          >
            Senha
          </label>
          <div className="relative group">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              className="w-full h-14 bg-transparent border border-white/[0.08] rounded-2xl px-6 pr-14 text-sm font-medium text-white outline-none focus:border-[#C5A059]/50 focus:ring-1 focus:ring-[#C5A059]/20 transition-all placeholder:text-zinc-600 lg:h-12 lg:font-light lg:text-lg"
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              onClick={onTogglePassword}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              aria-pressed={showPassword}
              className="absolute right-6 lg:right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <div className="absolute bottom-0 left-6 right-6 lg:hidden h-[1px] bg-gradient-to-r from-transparent via-[#C5A059]/0 to-transparent group-focus-within:via-[#C5A059]/40 transition-all duration-500" />
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
        className="w-full h-14 lg:h-16 bg-[#C5A059] text-black font-black uppercase tracking-[0.5em] text-[11px] rounded-2xl lg:rounded-sm hover:bg-white transition-all flex items-center justify-center gap-3 group lg:mt-8 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span>{isLoggingIn ? 'Entrando...' : isBlocked ? 'Bloqueado' : 'Entrar'}</span>
        {!isLoggingIn && !isBlocked && (
          <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
        )}
      </motion.button>
    </form>
  );
}
