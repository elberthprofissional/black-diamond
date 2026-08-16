import { type FormEvent } from 'react';
import { EyeOff, Eye, AlertCircle, Loader2 } from 'lucide-react';

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
  const inputClass =
    'w-full h-[54px] bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.18] focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20 rounded-xl px-4 text-[15px] text-white placeholder:text-zinc-500/60 outline-none transition-all duration-200';
  const labelClass =
    'block text-[13px] font-semibold text-zinc-300 mb-2 uppercase tracking-[0.1em]';

  return (
    <form onSubmit={onSubmit} className="w-full space-y-5">
      <div className="space-y-4">
        {/* Email */}
        <div className="space-y-1.5 text-left">
          <label htmlFor="login-email" className={labelClass}>
            E-mail
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="seu@email.com"
            data-testid="input-email"
            maxLength={120}
            className={inputClass}
            required
            autoFocus
          />
        </div>

        {/* Password */}
        <div className="space-y-1.5 text-left">
          <div className="flex items-center justify-between">
            <label htmlFor="login-password" className={labelClass}>
              Senha
            </label>
            <button
              type="button"
              onClick={onForgotPassword}
              className="text-xs text-[#d4af37] hover:underline transition-all cursor-pointer font-medium"
            >
              Esqueceu a senha?
            </button>
          </div>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              placeholder="Sua senha"
              data-testid="input-password"
              maxLength={128}
              className="w-full h-14 bg-black/40 border border-white/10 hover:border-white/20 focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/40 rounded-xl pl-4 pr-11 text-base text-white placeholder:text-zinc-500 outline-none transition-all"
              required
            />
            <button
              type="button"
              onClick={onTogglePassword}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              aria-pressed={showPassword}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors cursor-pointer p-1"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
      </div>

      {attempts >= 3 && !isBlocked && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 text-left">
          <AlertCircle size={14} className="shrink-0 text-amber-400" />
          <span>
            Atenção: {maxAttempts - attempts} tentativa(s) restante(s) antes do bloqueio temporário.
          </span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 text-left font-medium">
          <AlertCircle size={14} className="shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        data-testid="btn-login"
        disabled={isLoggingIn || isBlocked}
        className="w-full h-14 bg-gradient-to-r from-[#f0d060] via-[#d4af37] to-[#b8923f] hover:brightness-110 text-black font-bold text-[15px] rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.99] shadow-lg shadow-gold/25"
      >
        {isLoggingIn ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            <span>Entrando...</span>
          </>
        ) : isBlocked ? (
          <span>Bloqueado</span>
        ) : (
          <span>Entrar</span>
        )}
      </button>
    </form>
  );
}
