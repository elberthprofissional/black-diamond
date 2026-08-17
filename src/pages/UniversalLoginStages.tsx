import { type FormEvent } from 'react';
import { Loader2, ChevronRight, Check } from 'lucide-react';
import type { ClientMatch } from '../lib/api/clientAuth';
import { formatPhone } from '../lib/utils';

/* ─── Classes compartilhadas dos formulários ─── */

const loginInputClass =
  'w-full h-[54px] bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.18] focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20 rounded-xl px-4 text-[15px] text-white placeholder:text-zinc-500/60 outline-none transition-all duration-200';
const loginLabelClass =
  'block text-[13px] font-semibold text-zinc-300 mb-2 uppercase tracking-[0.1em]';

const loginGoldButtonClass =
  'w-full h-14 bg-gradient-to-r from-[#f0d060] via-[#d4af37] to-[#b8923f] hover:brightness-110 text-black font-bold text-[15px] rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-gold/25 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.99]';

/* ─── Desambiguação por nome (múltiplos matches) ─── */

interface LoginNameMatchesProps {
  matches: ClientMatch[];
  query: string;
  onSelect: (match: ClientMatch) => void;
  onReset: () => void;
}

export function LoginNameMatches({ matches, query, onSelect, onReset }: LoginNameMatchesProps) {
  return (
    <div className="w-full space-y-4">
      <div className="text-left space-y-1">
        <h2 className="text-lg font-bold text-white tracking-tight">Qual é você?</h2>
        <p className="text-xs text-zinc-400">
          Encontramos mais de um cliente com o nome &quot;{query}&quot;. Escolha o seu:
        </p>
      </div>
      <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
        {matches.map((match) => (
          <button
            key={match.id}
            type="button"
            onClick={() => onSelect(match)}
            className="w-full p-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-gold/25 text-left transition-all group flex items-center justify-between cursor-pointer"
          >
            <div>
              <p className="text-sm font-semibold text-white group-hover:text-[#d4af37] transition-colors">
                {match.name}
              </p>
              <p className="text-xs text-zinc-500 font-mono mt-0.5">{match.phone_masked}</p>
            </div>
            <ChevronRight size={16} className="text-zinc-600 group-hover:text-white" />
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onReset}
        className="w-full text-center text-xs text-zinc-500 hover:text-white transition-colors cursor-pointer pt-1"
      >
        ← Digitar número completo
      </button>
    </div>
  );
}

/* ─── Cliente sem senha (entrar direto) ─── */

interface LoginNoPasswordStageProps {
  name: string;
  phone: string;
  onEnter: () => void;
  onCreatePassword: () => void;
  onReset: () => void;
}

export function LoginNoPasswordStage({
  name,
  phone,
  onEnter,
  onCreatePassword,
  onReset,
}: LoginNoPasswordStageProps) {
  return (
    <div className="w-full space-y-5">
      <div className="space-y-1 text-left">
        <h2 className="text-xl font-bold text-white tracking-tight">Olá, {name || 'Cliente'}</h2>
        <p className="text-xs text-zinc-400 font-mono">{formatPhone(phone)}</p>
      </div>
      <div className="space-y-2.5">
        <button
          type="button"
          data-testid="btn-enter-no-password"
          onClick={onEnter}
          className={loginGoldButtonClass}
        >
          <span>Entrar no painel</span>
        </button>
        <button
          type="button"
          data-testid="btn-go-create-password"
          onClick={onCreatePassword}
          className="w-full h-14 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] hover:border-white/[0.15] text-sm font-semibold text-zinc-400 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <span>Criar uma senha para proteger meu acesso</span>
        </button>
      </div>
      <button
        type="button"
        onClick={onReset}
        className="w-full text-center text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
      >
        ← Entrar com outro número
      </button>
    </div>
  );
}

/* ─── Criar senha ─── */

interface LoginCreatePasswordStageProps {
  name: string;
  newPassword: string;
  onNewPasswordChange: (v: string) => void;
  confirmPassword: string;
  onConfirmPasswordChange: (v: string) => void;
  error: string;
  loading: boolean;
  onSubmit: (e: FormEvent) => void;
  onBack: () => void;
}

export function LoginCreatePasswordStage({
  name,
  newPassword,
  onNewPasswordChange,
  confirmPassword,
  onConfirmPasswordChange,
  error,
  loading,
  onSubmit,
  onBack,
}: LoginCreatePasswordStageProps) {
  return (
    <form onSubmit={onSubmit} className="w-full space-y-4">
      <div className="text-left space-y-1">
        <h2 className="text-xl font-bold text-white tracking-tight">Criar uma senha</h2>
        <p className="text-xs text-zinc-400">
          {name || 'Cliente'} — defina uma senha para proteger seu acesso.
        </p>
      </div>
      <div className="space-y-3">
        <div className="space-y-1.5 text-left">
          <label className={loginLabelClass}>Nova senha</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => onNewPasswordChange(e.target.value)}
            placeholder="Mínimo de 6 caracteres"
            data-testid="input-new-password"
            autoComplete="new-password"
            maxLength={128}
            className={loginInputClass}
            autoFocus
          />
        </div>
        <div className="space-y-1.5 text-left">
          <label className={loginLabelClass}>Confirmar senha</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => onConfirmPasswordChange(e.target.value)}
            placeholder="Repita sua nova senha"
            data-testid="input-confirm-password"
            autoComplete="new-password"
            maxLength={128}
            className={loginInputClass}
          />
        </div>
      </div>
      {error && (
        <p className="text-xs font-medium text-red-400 text-left bg-red-500/10 border border-red-500/20 rounded-xl p-3">
          {error}
        </p>
      )}
      <button
        type="submit"
        data-testid="btn-create-password"
        disabled={loading}
        className={loginGoldButtonClass}
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <span>Criar senha e entrar</span>
        )}
      </button>
      <button
        type="button"
        onClick={onBack}
        className="w-full text-center text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
      >
        ← Voltar
      </button>
    </form>
  );
}

/* ─── Cliente com senha ─── */

interface LoginPasswordStageProps {
  name: string;
  identifier: string;
  isEmail: boolean;
  password: string;
  onPasswordChange: (v: string) => void;
  showPassword: boolean;
  error: string;
  loading: boolean;
  onSubmit: (e: FormEvent) => void;
  onForgot: () => void;
  onBack: () => void;
}

export function LoginPasswordStage({
  name,
  identifier,
  isEmail,
  password,
  onPasswordChange,
  showPassword,
  error,
  loading,
  onSubmit,
  onForgot,
  onBack,
}: LoginPasswordStageProps) {
  return (
    <form onSubmit={onSubmit} className="w-full space-y-4">
      <div className="text-left space-y-1">
        <h2 className="text-xl font-bold text-white tracking-tight">
          Bem-vindo{name ? `, ${name}` : ''}
        </h2>
        <p className="text-xs text-zinc-400 font-mono">
          {isEmail ? identifier : formatPhone(identifier)}
        </p>
      </div>
      <div className="space-y-1.5 text-left">
        <div className="flex items-center justify-between">
          <label className={loginLabelClass}>Sua senha</label>
          <button
            type="button"
            onClick={onForgot}
            className="text-xs text-[#d4af37] hover:underline transition-all cursor-pointer font-medium"
          >
            Esqueci minha senha
          </button>
        </div>
        <input
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          placeholder="Sua senha"
          data-testid="input-client-password"
          autoComplete="current-password"
          maxLength={128}
          autoFocus
          className={loginInputClass}
        />
      </div>
      {error && (
        <p className="text-xs font-medium text-red-400 text-left bg-red-500/10 border border-red-500/20 rounded-xl p-3">
          {error}
        </p>
      )}
      <button
        type="submit"
        data-testid="btn-client-login"
        disabled={loading}
        className={loginGoldButtonClass}
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <span>Entrar</span>}
      </button>
      <button
        type="button"
        onClick={onBack}
        className="w-full text-center text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
      >
        ← Usar outro telefone/e-mail
      </button>
    </form>
  );
}

/* ─── Recuperação — enviar código ─── */

interface LoginRecoverSendStageProps {
  value: string;
  onChange: (v: string) => void;
  error: string;
  loading: boolean;
  onSubmit: (e: FormEvent) => void;
  onBack: () => void;
}

export function LoginRecoverSendStage({
  value,
  onChange,
  error,
  loading,
  onSubmit,
  onBack,
}: LoginRecoverSendStageProps) {
  return (
    <form onSubmit={onSubmit} className="w-full space-y-4">
      <div className="text-left space-y-1">
        <h2 className="text-xl font-bold text-white tracking-tight">Recuperar senha</h2>
        <p className="text-xs text-zinc-400">
          Enviaremos um código para o e-mail cadastrado na sua conta.
        </p>
      </div>
      <div className="space-y-1.5 text-left">
        <label className={loginLabelClass}>Celular ou E-mail</label>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Seu e-mail ou celular com DDD"
          data-testid="input-recover-identifier"
          autoComplete="username"
          maxLength={120}
          autoFocus
          className={loginInputClass}
        />
      </div>
      {error && (
        <p className="text-xs font-medium text-red-400 text-left bg-red-500/10 border border-red-500/20 rounded-xl p-3">
          {error}
        </p>
      )}
      <button
        type="submit"
        data-testid="btn-recover-send"
        disabled={loading || !value.trim()}
        className={loginGoldButtonClass}
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <span>Enviar código por e-mail</span>
        )}
      </button>
      <button
        type="button"
        onClick={onBack}
        className="w-full text-center text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
      >
        ← Voltar para o login
      </button>
    </form>
  );
}

/* ─── Recuperação — código + nova senha ─── */

interface LoginRecoverCodeStageProps {
  emailMasked: string;
  code: string;
  onCodeChange: (v: string) => void;
  newPassword: string;
  onNewPasswordChange: (v: string) => void;
  confirmPassword: string;
  onConfirmPasswordChange: (v: string) => void;
  error: string;
  loading: boolean;
  onSubmit: (e: FormEvent) => void;
  onResend: () => void;
  onWhatsAppHelp: () => void;
  onBack: () => void;
}

export function LoginRecoverCodeStage({
  emailMasked,
  code,
  onCodeChange,
  newPassword,
  onNewPasswordChange,
  confirmPassword,
  onConfirmPasswordChange,
  error,
  loading,
  onSubmit,
  onResend,
  onWhatsAppHelp,
  onBack,
}: LoginRecoverCodeStageProps) {
  return (
    <form onSubmit={onSubmit} className="w-full space-y-4">
      <div className="text-left space-y-1">
        <h2 className="text-xl font-bold text-white tracking-tight">Código de verificação</h2>
        <p className="text-xs text-zinc-400">
          Enviamos um código de 6 dígitos para{' '}
          <span className="text-white font-semibold">{emailMasked || 'seu e-mail'}</span>.
        </p>
      </div>
      <div className="space-y-3">
        <div className="space-y-1.5 text-left">
          <label className={loginLabelClass}>Código de 6 dígitos</label>
          <input
            type="text"
            inputMode="numeric"
            value={code}
            onChange={(e) => onCodeChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            data-testid="input-recover-code"
            maxLength={6}
            autoFocus
            className="w-full h-[52px] bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.18] focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/25 rounded-xl text-center text-lg tracking-widest font-mono font-bold text-white placeholder:text-zinc-600 outline-none transition-all"
          />
        </div>
        <div className="space-y-1.5 text-left">
          <label className={loginLabelClass}>Nova senha</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => onNewPasswordChange(e.target.value)}
            placeholder="Nova senha (mín. 6 caracteres)"
            data-testid="input-recover-new-password"
            autoComplete="new-password"
            maxLength={128}
            className={loginInputClass}
          />
        </div>
        <div className="space-y-1.5 text-left">
          <label className={loginLabelClass}>Confirmar nova senha</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => onConfirmPasswordChange(e.target.value)}
            placeholder="Repita a nova senha"
            data-testid="input-recover-confirm-password"
            autoComplete="new-password"
            maxLength={128}
            className={loginInputClass}
          />
        </div>
      </div>
      {error && (
        <p className="text-xs font-medium text-red-400 text-left bg-red-500/10 border border-red-500/20 rounded-xl p-3">
          {error}
        </p>
      )}
      <button
        type="submit"
        data-testid="btn-recover-submit"
        disabled={loading || code.length !== 6 || newPassword.length < 6}
        className={loginGoldButtonClass}
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <span>Redefinir senha</span>}
      </button>
      <div className="space-y-2 pt-2 text-center text-xs">
        <button
          type="button"
          onClick={onResend}
          className="text-[#d4af37] hover:underline transition-all cursor-pointer font-medium"
        >
          Reenviar código
        </button>
        <button
          type="button"
          onClick={onWhatsAppHelp}
          className="text-zinc-400 hover:text-white transition-colors cursor-pointer block mx-auto"
        >
          Precisa de ajuda? Fale no WhatsApp
        </button>
        <button
          type="button"
          onClick={onBack}
          className="text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer block w-full pt-1"
        >
          ← Voltar
        </button>
      </div>
    </form>
  );
}

/* ─── Criar conta ─── */

interface LoginCreateAccountStageProps {
  name: string;
  email: string;
  phone: string;
  onNameChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
  newPassword: string;
  onNewPasswordChange: (v: string) => void;
  confirmPassword: string;
  onConfirmPasswordChange: (v: string) => void;
  error: string;
  loading: boolean;
  isGoogleAuth: boolean;
  onSubmit: (e: FormEvent) => void;
  onBack: () => void;
}

export function LoginCreateAccountStage({
  name,
  email,
  phone,
  onNameChange,
  onEmailChange,
  onPhoneChange,
  newPassword,
  onNewPasswordChange,
  confirmPassword,
  onConfirmPasswordChange,
  error,
  loading,
  isGoogleAuth,
  onSubmit,
  onBack,
}: LoginCreateAccountStageProps) {
  return (
    <form onSubmit={onSubmit} className="w-full space-y-5">
      <div className="text-left space-y-1.5">
        <h1 className="text-xl font-bold text-white tracking-tight">Criar uma conta</h1>
        <p className="text-[13px] text-zinc-400">
          Cadastre-se para agendar horários e acompanhar seu histórico.
        </p>
      </div>
      <div className="space-y-4">
        <div className="space-y-1.5 text-left">
          <label className={loginLabelClass}>Nome completo</label>
          <input
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Seu nome completo"
            data-testid="input-account-name"
            autoComplete="name"
            maxLength={80}
            autoFocus
            className={loginInputClass}
          />
        </div>
        <div className="space-y-4 sm:grid sm:grid-cols-2 sm:gap-4">
          <div className="space-y-1.5 text-left">
            <label className={loginLabelClass}>WhatsApp</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => onPhoneChange(e.target.value)}
              placeholder="(00) 90000-0000"
              data-testid="input-account-phone"
              autoComplete="tel"
              maxLength={15}
              className={loginInputClass}
            />
          </div>
          <div className="space-y-1.5 text-left">
            <label className={loginLabelClass}>E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="seu@email.com"
              data-testid="input-account-email"
              autoComplete="email"
              maxLength={120}
              className={loginInputClass}
              disabled={isGoogleAuth}
            />
          </div>
        </div>
        {!isGoogleAuth && (
          <div className="space-y-4 sm:grid sm:grid-cols-2 sm:gap-4">
            <div className="space-y-1.5 text-left">
              <label className={loginLabelClass}>Senha</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => onNewPasswordChange(e.target.value)}
                placeholder="Mín. 6 dígitos"
                data-testid="input-account-password"
                autoComplete="new-password"
                maxLength={128}
                className={loginInputClass}
              />
            </div>
            <div className="space-y-1.5 text-left">
              <label className={loginLabelClass}>Confirmar</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => onConfirmPasswordChange(e.target.value)}
                placeholder="Repita a senha"
                data-testid="input-account-confirm"
                autoComplete="new-password"
                maxLength={128}
                className={loginInputClass}
              />
            </div>
          </div>
        )}
      </div>
      {error && (
        <p className="text-xs font-medium text-red-400 text-left bg-red-500/10 border border-red-500/20 rounded-xl p-3">
          {error}
        </p>
      )}
      <button
        type="submit"
        data-testid="btn-account-submit"
        disabled={loading}
        className={`${loginGoldButtonClass} mt-1`}
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <>
            <Check size={16} />
            <span>{isGoogleAuth ? 'Finalizar Cadastro' : 'Criar minha conta'}</span>
          </>
        )}
      </button>
      <div className="pt-1 text-center">
        <button
          type="button"
          onClick={onBack}
          className="text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
        >
          Já possui conta?{' '}
          <span className="text-[#d4af37] hover:underline font-semibold">Entrar</span>
        </button>
      </div>
    </form>
  );
}

/* ─── Campo inteligente (padrão) + Google ─── */

interface LoginIdentifierFormProps {
  kind: 'empty' | 'email' | 'phone' | 'name';
  input: string;
  onInputChange: (v: string) => void;
  error: string;
  loading: boolean;
  onSubmit: (e: FormEvent) => void;
  onGoogleLogin: () => void;
  onForgotHome: () => void;
  onNavigateAgendar: () => void;
}

export function LoginIdentifierForm({
  kind,
  input,
  onInputChange,
  error,
  loading,
  onSubmit,
  onGoogleLogin,
  onForgotHome,
  onNavigateAgendar,
}: LoginIdentifierFormProps) {
  return (
    <form onSubmit={onSubmit} className="w-full space-y-4">
      <button
        type="button"
        onClick={onGoogleLogin}
        disabled={loading}
        className="w-full h-14 bg-white text-black font-semibold text-[15px] rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg hover:bg-gray-50 disabled:opacity-50 cursor-pointer active:scale-[0.99]"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        Continuar com Google
      </button>

      <div className="flex items-center gap-3 my-2">
        <div className="h-px bg-white/[0.08] flex-1" />
        <span className="text-xs text-zinc-500 font-medium">OU</span>
        <div className="h-px bg-white/[0.08] flex-1" />
      </div>

      <div className="space-y-1.5 text-left">
        <label htmlFor="universal-identifier" className={loginLabelClass}>
          Celular ou E-mail
        </label>
        <input
          id="universal-identifier"
          type="text"
          autoComplete="username"
          inputMode={kind === 'phone' ? 'tel' : 'text'}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder="(00) 00000-0000 ou seu@email.com"
          data-testid="input-universal"
          maxLength={120}
          autoFocus
          className={loginInputClass}
        />
      </div>
      {error && (
        <p className="text-xs font-medium text-red-400 text-left bg-red-500/10 border border-red-500/20 rounded-xl p-3">
          {error}
        </p>
      )}
      <button
        type="submit"
        data-testid="btn-continuar"
        disabled={loading || !input.trim()}
        className={loginGoldButtonClass}
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <span>Continuar</span>}
      </button>
      <div className="flex items-center justify-center text-xs pt-1">
        <button
          type="button"
          data-testid="btn-go-recover-home"
          onClick={onForgotHome}
          className="text-zinc-400 hover:text-white transition-colors cursor-pointer font-medium"
        >
          Esqueci minha senha
        </button>
      </div>
      <div className="pt-3 border-t border-white/5 text-center">
        <button
          type="button"
          onClick={onNavigateAgendar}
          className="text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
        >
          Agendar sem login →
        </button>
      </div>
    </form>
  );
}
