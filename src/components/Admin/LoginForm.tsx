import { type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { EyeOff, Eye } from 'lucide-react';

interface LoginFormProps {
  email: string;
  onEmailChange: (email: string) => void;
  password: string;
  onPasswordChange: (password: string) => void;
  showPassword: boolean;
  onTogglePassword: () => void;
  onSubmit: (e: FormEvent) => Promise<void>;
  onForgotPassword: () => void;
  isLoggingIn: boolean;
  isBlocked: boolean;
  attempts: number;
  maxAttempts: number;
  error?: string | null;
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
  error,
}: LoginFormProps) {
  return (
    <motion.form
      onSubmit={onSubmit}
      className="w-full space-y-6 lg:space-y-12"
      animate={error ? { x: [0, -8, 8, -6, 6, -3, 3, 0] } : {}}
      transition={{ duration: 0.4 }}
    >
      <div className="space-y-4 lg:space-y-6">
        {/* Email */}
        <div className="space-y-1.5 lg:space-y-2">
          <label
            htmlFor="login-email"
            className="block text-[10px] lg:text-xs font-medium uppercase tracking-widest text-zinc-500"
          >
            E-mail
          </label>            <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="seu@email.com"
            data-testid="input-email"
            className="w-full h-12 bg-transparent border border-zinc-800 rounded-xl px-5 text-sm font-medium text-zinc-100 outline-none focus:border-[#C5A059] transition-all lg:h-14 lg:text-base"
            required
          />
        </div>

        {/* Password */}
        <div className="space-y-1.5 lg:space-y-2">
          <label
            htmlFor="login-password"
            className="block text-[10px] lg:text-xs font-medium uppercase tracking-widest text-zinc-500"
          >
            Senha
          </label>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              placeholder="Sua senha"
              data-testid="input-password"
              className="w-full h-12 bg-transparent border border-zinc-800 rounded-xl px-5 pr-12 text-sm font-medium text-zinc-100 outline-none focus:border-[#C5A059] transition-all lg:h-14 lg:text-base"
              required
            />
            <button
              type="button"
              onClick={onTogglePassword}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              aria-pressed={showPassword}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div className="hidden lg:flex justify-end">
            <button
              type="button"
              onClick={onForgotPassword}
              className="text-[9px] font-medium text-[#C5A059]/70 uppercase tracking-widest hover:text-[#C5A059] transition-colors cursor-pointer"
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

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[12px] text-red-400 text-center"
        >
          {error}
        </motion.p>
      )}

      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        type="submit"
        data-testid="btn-login"
        disabled={isLoggingIn || isBlocked}
        className="w-full h-11 lg:h-12 bg-[#C5A059] text-black font-black uppercase tracking-[0.5em] text-[11px] rounded-2xl lg:rounded-sm hover:bg-white transition-all flex items-center justify-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span>{isLoggingIn ? 'Entrando...' : isBlocked ? 'Bloqueado' : 'Entrar'}</span>
      </motion.button>

      <div className="lg:hidden flex justify-center">
        <button
          type="button"
          onClick={onForgotPassword}
          className="text-[9px] font-medium text-[#C5A059]/70 uppercase tracking-widest hover:text-[#C5A059] transition-colors cursor-pointer"
        >
          Esqueceu a senha?
        </button>
      </div>
    </motion.form>
  );
}
