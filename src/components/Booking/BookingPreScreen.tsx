import { useState, useRef, useEffect, forwardRef, type FC, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Phone,
  User,
  Loader2,
  ShieldCheck,
  KeyRound,
  Smartphone,
  ArrowLeft,
  Sparkles,
  UserPlus,
  LogIn,
} from 'lucide-react';
import { getClientByPhone, createClient } from '../../lib/api';
import { formatPhone } from '../../lib/utils';
import { STORAGE_CLIENT_SESSION } from '../../lib/constants';

// ─── Types ───

type Screen = 'menu' | 'existing-phone' | 'code-verify' | 'new-client' | 'detected';

const CODE_EXPIRY_MS = 5 * 60 * 1000;

function generateCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

// ─── Glass Input ───

interface GlassInputProps {
  icon: React.ReactNode;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  maxLength?: number;
  type?: string;
  autoFocus?: boolean;
  centerText?: boolean;
  inputMode?: 'text' | 'numeric' | 'tel';
}

const GlassInput = forwardRef<HTMLInputElement, GlassInputProps>(({ icon, value, onChange, placeholder, maxLength, type = 'text', autoFocus, centerText, inputMode }, ref) => (
  <div className="relative group">
    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-[#D4AF37] transition-colors z-10">
      {icon}
    </div>
    <input
      ref={ref}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      maxLength={maxLength}
      inputMode={inputMode}
      autoFocus={autoFocus}
      className={`w-full h-13 bg-[#0a0a0a] border border-white/[0.06] rounded-xl ${
        centerText ? 'pl-4 pr-4 text-center' : 'pl-12 pr-4'
      } text-[15px] text-white outline-none transition-all placeholder:text-zinc-600
        focus:border-[#D4AF37]/30 focus:bg-[#0d0d0a]`}
    />
    <div className="absolute bottom-0 left-3 right-3 h-px scale-x-0 group-focus-within:scale-x-100 transition-transform bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent" />
  </div>
));
GlassInput.displayName = 'GlassInput';



// ─── Component ───

const BookingPreScreen: FC = () => {
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen>('menu');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [clientName, setClientName] = useState('');
  const [code, setCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [codeExpiresAt, setCodeExpiresAt] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const codeInputRef = useRef<HTMLInputElement>(null);
  const proceedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (proceedTimeoutRef.current) clearTimeout(proceedTimeoutRef.current);
      if (focusTimeoutRef.current) clearTimeout(focusTimeoutRef.current);
    };
  }, []);

  // eslint-disable-next-line react-hooks/purity
  const timeLeft = Math.max(0, Math.floor((codeExpiresAt - Date.now()) / 1000));

  // ── Existing Client ──

  const handleExistingPhoneSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const digits = phone.replace(/\D/g, '');
    if (digits.length < 11) {
      setError('Informe um celular válido com DDD (11 dígitos).');
      return;
    }

    setLoading(true);
    try {
      const data = await getClientByPhone(digits);
      if (!data || (Array.isArray(data) && data.length === 0)) {
        setError('Nenhuma conta encontrada. Crie uma conta nova!');
        setLoading(false);
        return;
      }
      const client = Array.isArray(data) ? data[0] : data;
      setClientName(client?.name || 'Cliente');
      const newCode = generateCode();
      setGeneratedCode(newCode);
      setCodeExpiresAt(Date.now() + CODE_EXPIRY_MS);
      setScreen('code-verify');
      focusTimeoutRef.current = setTimeout(() => codeInputRef.current?.focus(), 150);
    } catch {
      setError('Erro ao verificar telefone. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const cleanCode = code.trim();
    if (cleanCode !== generatedCode) {
      setError('Código inválido. Verifique e tente novamente.');
      return;
    }
    if (Date.now() > codeExpiresAt) {
      setError('Código expirou. Solicite um novo.');
      setScreen('existing-phone');
      setGeneratedCode('');
      setCode('');
      return;
    }
    const digits = phone.replace(/\D/g, '');
    try {
      localStorage.setItem(STORAGE_CLIENT_SESSION, JSON.stringify({ phone: digits, name: clientName, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 }));
    } catch { /* noop */ }
    setScreen('detected');
    proceedTimeoutRef.current = setTimeout(() => navigate('/cliente'), 1200);
  };

  const handleNewCode = () => {
    const newCode = generateCode();
    setGeneratedCode(newCode);
    setCodeExpiresAt(Date.now() + CODE_EXPIRY_MS);
    setCode('');
    setError('');
    focusTimeoutRef.current = setTimeout(() => codeInputRef.current?.focus(), 100);
  };

  // ── New Client ──

  const handleNewClientSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const digits = phone.replace(/\D/g, '');
    const trimmedName = name.trim();

    if (digits.length < 11) { setError('Informe um celular válido com DDD (11 dígitos).'); return; }
    if (trimmedName.length < 2) { setError('Informe seu nome (mínimo de 2 caracteres).'); return; }

    setLoading(true);
    try {
      await createClient({ name: trimmedName, phone: digits });
      localStorage.setItem(STORAGE_CLIENT_SESSION, JSON.stringify({ phone: digits, name: trimmedName, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 }));
      navigate('/cliente');
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('já está cadastrado')) {
        localStorage.setItem(STORAGE_CLIENT_SESSION, JSON.stringify({ phone: digits, name: trimmedName, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 }));
        navigate('/cliente');
      } else {
        setError('Erro ao criar conta. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = () => navigate('/agendar');

  const goBack = () => {
    if (screen === 'code-verify') { setScreen('existing-phone'); setCode(''); setError(''); }
    else if (screen === 'new-client') { setScreen('menu'); setPhone(''); setName(''); setError(''); }
    else if (screen === 'existing-phone') { setScreen('menu'); setPhone(''); setError(''); }
    else { navigate('/'); }
  };

  const renderError = () =>
    error ? (
      <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="bg-red-500/5 border border-red-500/15 rounded-xl px-4 py-3">
        <p className="text-[12px] text-red-400/80 text-center">{error}</p>
      </motion.div>
    ) : null;

  // ─── Render: Menu (centered on all screens, scales with viewport) ───

  const renderMenu = () => (
    <div className="w-full max-w-xl mx-auto lg:max-w-3xl xl:max-w-4xl">
      <div className="text-center">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-16 h-16 md:w-20 lg:w-24 xl:w-28 mx-auto mb-5 md:mb-6 lg:mb-7"
        >
          <div className="absolute inset-[-8px] md:inset-[-12px] rounded-full bg-[#D4AF37]/[0.015] blur-2xl" />
          <div className="w-full h-full rounded-full bg-gradient-to-br from-[#D4AF37]/12 to-[#D4AF37]/3 border border-[#D4AF37]/15 flex items-center justify-center">
            <img src="/assets/logo.webp" alt="Black Diamond" className="w-8 h-8 md:w-10 lg:w-12 xl:w-14 object-contain" />
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="block text-[11px] md:text-[13px] lg:text-[15px] text-zinc-600 uppercase tracking-[0.3em] font-montserrat mb-3 md:mb-4 font-medium">
            Seja bem-vindo à
          </span>
          <span className="block text-[34px] md:text-[48px] lg:text-[64px] xl:text-[80px] font-black text-white tracking-tight leading-none">
            BLACK
            <span className="text-[#D4AF37] font-cinzel tracking-wide"> DIAMOND</span>
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16, duration: 0.4 }}
          className="text-[13px] md:text-[15px] lg:text-[17px] text-zinc-600 font-montserrat mt-3 md:mt-4 lg:mt-5"
        >
          Agende seu horário em segundos
        </motion.p>

        {/* Gold line */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.22, duration: 0.6 }}
          className="w-12 md:w-16 h-[1.5px] bg-[#D4AF37]/20 mx-auto mt-5 md:mt-6 origin-center"
        />
      </div>

      {/* Options */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28, duration: 0.4 }}
        className="space-y-3 md:space-y-4 mt-8 md:mt-10 lg:mt-12"
      >
        <button
          onClick={() => setScreen('existing-phone')}
          className="w-full group relative flex items-center gap-4 md:gap-5 px-5 md:px-7 py-4 md:py-5 lg:py-6 bg-[#0a0a0a] border border-[#D4AF37]/15 rounded-xl hover:border-[#D4AF37]/40 hover:bg-[#0d0d09] transition-all cursor-pointer text-left"
        >
          <div className="w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-lg bg-[#D4AF37]/8 border border-[#D4AF37]/15 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <LogIn size={17} className="md:w-5 md:h-5 lg:w-6 lg:h-6 text-[#D4AF37]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] md:text-[16px] lg:text-[18px] font-bold text-white group-hover:text-[#D4AF37] transition-colors">Já sou cliente</p>
            <p className="text-[11px] md:text-[12px] lg:text-[13px] text-zinc-600 group-hover:text-zinc-500 transition-colors mt-0.5">Telefone + código de acesso</p>
          </div>
          <svg className="w-4 h-4 md:w-5 md:h-5 text-zinc-700 group-hover:text-[#D4AF37] group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" /></svg>
        </button>

        <button
          onClick={() => { setScreen('new-client'); setPhone(''); setName(''); setError(''); }}
          className="w-full group relative flex items-center gap-4 md:gap-5 px-5 md:px-7 py-4 md:py-5 lg:py-6 bg-[#0a0a0a] border border-white/[0.06] rounded-xl hover:border-[#D4AF37]/25 hover:bg-[#0d0d09] transition-all cursor-pointer text-left"
        >
          <div className="w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <UserPlus size={17} className="md:w-5 md:h-5 lg:w-6 lg:h-6 text-zinc-400 group-hover:text-[#D4AF37] transition-colors" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] md:text-[16px] lg:text-[18px] font-bold text-white group-hover:text-[#D4AF37] transition-colors">Sou novo aqui</p>
            <p className="text-[11px] md:text-[12px] lg:text-[13px] text-zinc-600 group-hover:text-zinc-500 transition-colors mt-0.5">Crie sua conta e agende</p>
          </div>
          <svg className="w-4 h-4 md:w-5 md:h-5 text-zinc-700 group-hover:text-[#D4AF37] group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" /></svg>
        </button>

        <div className="flex items-center gap-4 my-4 md:my-5">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
          <span className="text-[9px] md:text-[10px] text-zinc-700 uppercase tracking-[0.2em] font-montserrat">ou</span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
        </div>

        <button
          onClick={handleGuest}
          className="w-full group flex items-center justify-center gap-2 py-3 md:py-4 text-[12px] md:text-[13px] lg:text-[14px] text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer"
        >
          <User size={13} className="md:w-4 md:h-4 lg:w-5 lg:h-5" />
          <span className="font-montserrat">Agendar sem cadastro</span>
          <svg className="w-3 h-3 md:w-4 md:h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" /></svg>
        </button>
      </motion.div>
    </div>
  );

  // ─── Render: Forms (centered on all devices) ───

  const renderForm = () => (
    <div className="max-w-md mx-auto">
      <AnimatePresence mode="wait">
        {/* ═══ EXISTING CLIENT ═══ */}
        {screen === 'existing-phone' && (
          <motion.div key="existing-phone" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
            <div className="text-center mb-8">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#D4AF37]/12 to-transparent border border-[#D4AF37]/15 flex items-center justify-center mx-auto mb-4">
                <Smartphone size={24} className="text-[#D4AF37]" />
              </div>
              <h2 className="text-xl font-bold text-white mb-1">Já sou cliente</h2>
              <p className="text-[13px] text-zinc-600">Digite seu telefone para receber o código</p>
            </div>
            <form onSubmit={handleExistingPhoneSubmit} className="space-y-4">
              <GlassInput icon={<Phone size={15} />} value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="(00) 00000-0000" maxLength={15} type="tel" autoFocus />
              <button type="submit" disabled={loading || phone.replace(/\D/g, '').length < 11} className="btn-gold w-full h-12 flex items-center justify-center gap-2 text-[14px] disabled:opacity-35 rounded-xl">
                {loading ? <Loader2 size={14} className="animate-spin" /> : <><ShieldCheck size={14} /> Continuar</>}
              </button>
              {renderError()}
            </form>
            <button onClick={() => navigate('/agendar')} className="w-full mt-5 text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors underline underline-offset-4 decoration-white/[0.06]">
              Prefiro agendar sem cadastro
            </button>
          </motion.div>
        )}

        {/* ═══ CODE VERIFY ═══ */}
        {screen === 'code-verify' && (
          <motion.div key="code-verify" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
            <div className="text-center mb-8">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#D4AF37]/12 to-transparent border border-[#D4AF37]/15 flex items-center justify-center mx-auto mb-4">
                <KeyRound size={24} className="text-[#D4AF37]" />
              </div>
              <h2 className="text-xl font-bold text-white mb-1">Olá, <span className="text-[#D4AF37]">{clientName}</span>!</h2>
              <p className="text-[13px] text-zinc-600">Use o código abaixo para verificar</p>
            </div>

            <div className="bg-[#0a0a0a] border border-white/[0.05] rounded-xl p-6 mb-5 text-center">
              <p className="text-[9px] text-zinc-700 uppercase tracking-[0.25em] mb-4 font-montserrat font-medium">Seu código</p>
              <div className="flex justify-center gap-3">
                {generatedCode.split('').map((digit, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: -10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.1 + i * 0.08, type: 'spring', stiffness: 200, damping: 20 }}
                    className="w-12 h-14 bg-gradient-to-b from-[#D4AF37]/12 to-[#D4AF37]/3 border border-[#D4AF37]/20 rounded-xl flex items-center justify-center"
                  >
                    <span className="text-2xl font-bold text-[#D4AF37] tabular-nums">{digit}</span>
                  </motion.div>
                ))}
              </div>
              {timeLeft > 0 && (
                <p className="text-[10px] text-zinc-700 mt-3 font-montserrat">
                  Expira em <span className={timeLeft < 30 ? 'text-red-400' : 'text-[#D4AF37]'}>{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}</span>
                </p>
              )}
            </div>

            <form onSubmit={handleVerifyCode} className="space-y-4">
              <GlassInput ref={codeInputRef} icon={<KeyRound size={15} />} value={code} onChange={(e) => { const val = e.target.value.replace(/\D/g, '').slice(0, 4); setCode(val); }} placeholder="Digite o código" maxLength={4} autoFocus centerText inputMode="numeric" />
              <button type="submit" disabled={code.length < 4} className="btn-gold w-full h-12 flex items-center justify-center gap-2 text-[14px] disabled:opacity-35 rounded-xl"><ShieldCheck size={14} /> Verificar</button>
              <button type="button" onClick={handleNewCode} className="w-full py-2 text-[11px] text-zinc-600 hover:text-[#D4AF37] transition-colors cursor-pointer">Gerar novo código</button>
              {renderError()}
            </form>
          </motion.div>
        )}

        {/* ═══ WELCOME BACK ═══ */}
        {screen === 'detected' && (
          <motion.div key="detected" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="text-center py-10">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.08, type: 'spring', stiffness: 160, damping: 14 }} className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-[-12px] rounded-full bg-[#D4AF37]/[0.03] blur-2xl" />
              <div className="w-full h-full rounded-full bg-gradient-to-br from-[#D4AF37]/15 to-[#D4AF37]/5 border-2 border-[#D4AF37]/20 flex items-center justify-center shadow-xl shadow-[#D4AF37]/8">
                <User size={38} className="text-[#D4AF37]" />
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <p className="text-[10px] text-[#D4AF37]/40 uppercase tracking-[0.3em] mb-2 font-montserrat font-medium">Bem-vindo de volta</p>
              <h2 className="text-2xl font-black text-white mb-2">{clientName}</h2>
              <p className="text-[13px] text-zinc-600">{formatPhone(phone)}</p>
            </motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-10">
              <div className="relative w-10 h-10 mx-auto">
                <div className="absolute inset-0 border-2 border-[#D4AF37]/10 rounded-full" />
                <div className="absolute inset-0 border-2 border-transparent border-t-[#D4AF37] rounded-full animate-spin" />
              </div>
              <p className="text-[11px] text-zinc-700 mt-4 font-montserrat">Redirecionando...</p>
            </motion.div>
          </motion.div>
        )}

        {/* ═══ NEW CLIENT ═══ */}
        {screen === 'new-client' && (
          <motion.div key="new-client" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
            <div className="text-center mb-8">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#D4AF37]/12 to-transparent border border-[#D4AF37]/15 flex items-center justify-center mx-auto mb-4">
                <UserPlus size={24} className="text-[#D4AF37]" />
              </div>
              <h2 className="text-xl font-bold text-white mb-1">Novo por aqui</h2>
              <p className="text-[13px] text-zinc-600">Seus dados para começar</p>
            </div>
            <form onSubmit={handleNewClientSubmit} className="space-y-4">
              <GlassInput icon={<User size={15} />} value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" maxLength={60} autoFocus />
              <GlassInput icon={<Phone size={15} />} value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="(00) 00000-0000" maxLength={15} type="tel" />
              <button type="submit" disabled={loading} className="btn-gold w-full h-12 flex items-center justify-center gap-2 text-[14px] disabled:opacity-35 rounded-xl">
                {loading ? <Loader2 size={14} className="animate-spin" /> : <><Sparkles size={14} /> Começar</>}
              </button>
              {renderError()}
            </form>
            <button onClick={() => navigate('/agendar')} className="w-full mt-5 text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors underline underline-offset-4 decoration-white/[0.06]">
              Pular cadastro
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  // ─── Main Render ───

  return (
    <div className="min-h-screen bg-[#080808] flex flex-col relative overflow-hidden selection:bg-[#D4AF37]/20 selection:text-white">
      {/* ═══ AMBIENT: Deep rich background that fills the void ═══ */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Base gradient - warm dark */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0c0905] via-[#080808] to-[#050505]" />

        {/* Central gold radiance - fills the center */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] md:w-[700px] lg:w-[900px] xl:w-[1100px] h-[400px] md:h-[500px] lg:h-[600px] rounded-full bg-gradient-to-b from-[#D4AF37]/[0.02] via-[#D4AF37]/[0.01] to-transparent blur-[100px]" />

        {/* Wide gold ambient - spans the screen */}
        <div className="absolute top-1/3 left-0 w-full h-[500px] bg-gradient-to-r from-[#D4AF37]/[0.004] via-[#D4AF37]/[0.008] to-[#D4AF37]/[0.004] blur-[120px]" />

        {/* Warm amber tone from below */}
        <div className="absolute bottom-0 left-1/4 right-1/4 h-[300px] bg-gradient-to-t from-[#8B6914]/[0.005] to-transparent blur-[80px]" />

        {/* Fine noise texture */}
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'radial-gradient(circle, rgba(212,175,55,0.12) 0.5px, transparent 0.5px)', backgroundSize: '24px 24px' }} />
      </div>

      {/* ═══ HEADER ═══ */}
      <div className="relative z-20 px-6 py-5 flex items-center justify-between">
        {screen !== 'menu' && (
          <button onClick={goBack} aria-label="Voltar" className="w-9 h-9 rounded-lg border border-white/[0.06] flex items-center justify-center text-zinc-500 hover:text-white hover:border-white/[0.12] transition-all">
            <ArrowLeft size={15} />
          </button>
        )}
        <div className={`flex items-center gap-2 ${screen === 'menu' ? 'mx-auto' : ''}`}>
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#D4AF37]/15 to-[#D4AF37]/5 border border-[#D4AF37]/20 flex items-center justify-center">
            <img src="/assets/logo.webp" alt="" className="w-[14px] h-[14px] object-contain" />
          </div>
          <span className="text-[10px] font-black tracking-[0.35em] text-zinc-600 uppercase">Black Diamond</span>
        </div>
      </div>

      {/* ═══ MAIN ═══ */}
      <div className="relative z-10 flex-1 flex flex-col justify-center px-6 md:px-10 lg:px-16 pb-12">
        <AnimatePresence mode="wait">
          {screen === 'menu' ? (
            <motion.div key="menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="flex items-center justify-center">
              {renderMenu()}
            </motion.div>
          ) : (
            <motion.div key="forms" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="flex-1 flex flex-col justify-center">
              {renderForm()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ═══ FOOTER ═══ */}
      <div className="relative z-20 border-t border-white/[0.02] py-3 px-6">
        <p className="text-[8px] text-zinc-800 text-center tracking-[0.4em] uppercase font-montserrat">Black Diamond Barbearia</p>
      </div>
    </div>
  );
};

export default BookingPreScreen;
