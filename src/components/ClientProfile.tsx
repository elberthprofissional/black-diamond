import { useState, useEffect, useRef, type FC, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  Scissors,
  Loader2,
  ArrowLeft,
  Phone,
  User,
  AlertTriangle,
  ShieldCheck,
  KeyRound,
  Smartphone,
  CalendarCheck,
  TrendingUp,
  CreditCard,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getBookingsByPhone, cancelBooking } from '../lib/api';
import { formatPhone, formatDateBR, formatPrice } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { logError } from '../lib/logger';

interface BookingEntry {
  id: string;
  booking_date: string;
  booking_time: string;
  status: string;
  total_price: number;
  total_duration: number;
  service_ids: string[];
  clients: { name: string; phone: string };
  token?: string;
}

interface ClientStats {
  total_visits: number;
  total_spent: number;
  last_visit: string | null;
}

type Step = 'phone' | 'verify' | 'dashboard';

const CLIENT_SESSION_KEY = 'bd_client_session';
const CODE_EXPIRY_MS = 5 * 60 * 1000;

function generateCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

const ClientProfile: FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [codeExpiresAt, setCodeExpiresAt] = useState<number>(0);
  const [clientName, setClientName] = useState('');
  const [bookings, setBookings] = useState<BookingEntry[]>([]);
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<BookingEntry | null>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);

  const fetchClientStats = async (phoneNumber: string): Promise<ClientStats | null> => {
    try {
      const { data, error } = await supabase.rpc('lookup_client_by_phone_rate_limited', {
        p_phone: phoneNumber,
      });
      if (error || !data || !Array.isArray(data) || data.length === 0) return null;

      // Busca históricos do cliente via consulta direta
      // Se falhar (RLS), retorna null e o dashboard só não mostra stats
      const clientId = (data as Array<{ id: string }>)[0]?.id;
      if (!clientId) return null;

      const { data: stats } = await supabase
        .from('clients')
        .select('historical_visits, historical_spent, last_visit_date')
        .eq('id', clientId)
        .single();

      if (!stats) return null;
      return {
        total_visits: (stats as { historical_visits?: number }).historical_visits || 0,
        total_spent: (stats as { historical_spent?: number }).historical_spent || 0,
        last_visit: (stats as { last_visit_date?: string | null }).last_visit_date || null,
      };
    } catch {
      return null;
    }
  };

  const loadBookings = async (phoneNumber: string) => {
    setLoading(true);
    setError('');
    try {
      const [bookingData, statsData] = await Promise.all([
        getBookingsByPhone(phoneNumber),
        fetchClientStats(phoneNumber),
      ]);
      setBookings(bookingData as BookingEntry[]);
      setStats(statsData);
      if (bookingData.length === 0) {
        setError('Nenhum agendamento futuro encontrado para este telefone.');
      }
    } catch (e) {
      logError(e);
      setError('Erro ao buscar agendamentos. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Restaura sessão ativa do localStorage ao montar
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CLIENT_SESSION_KEY);
      if (saved) {
        const session = JSON.parse(saved);
        if (session.expiresAt > Date.now()) {
          setPhone(session.phone);
          setClientName(session.name);
          setStep('dashboard');
          loadBookings(session.phone);
        } else {
          localStorage.removeItem(CLIENT_SESSION_KEY);
        }
      }
    } catch {
      localStorage.removeItem(CLIENT_SESSION_KEY);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRequestCode = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const digits = phone.replace(/\D/g, '');
    if (digits.length < 11) {
      setError('Informe um celular válido com DDD (11 dígitos).');
      return;
    }

    setLoading(true);

    try {
      const data = await getBookingsByPhone(digits);
      const foundBookings = data as BookingEntry[];

      if (foundBookings.length === 0) {
        setError('Nenhum agendamento encontrado para este telefone. Faça um agendamento primeiro!');
        setLoading(false);
        return;
      }

      const name = foundBookings[0]?.clients?.name || 'Cliente';
      setClientName(name);

      const newCode = generateCode();
      setGeneratedCode(newCode);
      setCodeExpiresAt(Date.now() + CODE_EXPIRY_MS);
      setStep('verify');

      setTimeout(() => codeInputRef.current?.focus(), 100);
    } catch (e) {
      logError(e);
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
      setError('Código expirado. Solicite um novo.');
      setStep('phone');
      setGeneratedCode('');
      setCode('');
      return;
    }

    const digits = phone.replace(/\D/g, '');
    const session = {
      phone: digits,
      name: clientName,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    };
    localStorage.setItem(CLIENT_SESSION_KEY, JSON.stringify(session));

    setStep('dashboard');
    loadBookings(digits);
  };

  const handleCancel = async (booking: BookingEntry) => {
    setCancellingId(booking.id);
    setConfirmCancel(null);
    try {
      await cancelBooking(booking.id);
      setBookings((prev) => prev.filter((b) => b.id !== booking.id));
    } catch (e) {
      logError(e);
      setError('Erro ao cancelar. Tente novamente.');
    } finally {
      setCancellingId(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(CLIENT_SESSION_KEY);
    setStep('phone');
    setPhone('');
    setCode('');
    setGeneratedCode('');
    setClientName('');
    setBookings([]);
    setStats(null);
    setError('');
  };

  const handleNewCode = () => {
    const newCode = generateCode();
    setGeneratedCode(newCode);
    setCodeExpiresAt(Date.now() + CODE_EXPIRY_MS);
    setCode('');
    setError('');
    setTimeout(() => codeInputRef.current?.focus(), 100);
  };

  const timeLeft = Math.max(0, Math.floor((codeExpiresAt - Date.now()) / 1000));
  const totalFutureSpent = bookings.reduce((sum, b) => sum + b.total_price, 0);

  return (
    <div className="min-h-screen bg-[#050505] px-4 py-8">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => {
              if (step === 'verify') {
                setStep('phone');
                setError('');
                setGeneratedCode('');
                setCode('');
              } else if (step === 'dashboard') {
                handleLogout();
              } else {
                navigate('/');
              }
            }}
            className="w-10 h-10 rounded-xl border border-white/[0.06] flex items-center justify-center text-zinc-400 hover:text-white hover:border-white/[0.12] transition-all cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white">Meus Agendamentos</h1>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Black Diamond</p>
          </div>
        </div>

        {/* STEP 1: Phone Input */}
        {step === 'phone' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <form onSubmit={handleRequestCode} className="space-y-4">
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center mx-auto mb-4">
                  <Smartphone size={28} className="text-[#D4AF37]" />
                </div>
                <p className="text-[14px] text-zinc-400 leading-relaxed">
                  Digite seu telefone para acessar seus agendamentos.
                </p>
              </div>

              <div className="relative">
                <Phone
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
                />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                  className="w-full h-12 bg-white/[0.03] border border-white/[0.08] rounded-xl pl-11 pr-4 text-[16px] text-white outline-none focus:border-[#D4AF37] transition-all placeholder:text-zinc-600"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading || phone.replace(/\D/g, '').length < 11}
                className="btn-gold w-full h-11 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <>
                    <ShieldCheck size={14} />
                    Entrar
                  </>
                )}
              </button>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  <p className="text-[12px] text-red-400/80 text-center">{error}</p>
                </div>
              )}
            </form>
          </motion.div>
        )}

        {/* STEP 2: Code Verification */}
        {step === 'verify' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                  <KeyRound size={28} className="text-emerald-400" />
                </div>
                <p className="text-[14px] text-zinc-400 leading-relaxed mb-1">
                  Código de acesso para <strong className="text-white">{phone}</strong>
                </p>
                <p className="text-[11px] text-zinc-600">
                  Use o código abaixo para verificar sua identidade
                </p>
              </div>

              <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-2xl p-6 text-center">
                <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-3">
                  Seu código de acesso
                </p>
                <div className="flex justify-center gap-3 mb-3">
                  {generatedCode.split('').map((digit, i) => (
                    <div
                      key={i}
                      className="w-12 h-14 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-xl flex items-center justify-center"
                    >
                      <span className="text-2xl font-bold text-[#D4AF37] tabular-nums">
                        {digit}
                      </span>
                    </div>
                  ))}
                </div>
                {timeLeft > 0 && (
                  <p className="text-[10px] text-zinc-600">
                    Código expira em {Math.floor(timeLeft / 60)}:
                    {String(timeLeft % 60).padStart(2, '0')}
                  </p>
                )}
              </div>

              <div className="relative">
                <KeyRound
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
                />
                <input
                  ref={codeInputRef}
                  type="text"
                  value={code}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setCode(val);
                  }}
                  placeholder="Digite o código acima"
                  maxLength={4}
                  inputMode="numeric"
                  className="w-full h-12 bg-white/[0.03] border border-white/[0.08] rounded-xl pl-11 pr-4 text-[20px] text-white text-center tracking-[0.3em] outline-none focus:border-[#D4AF37] transition-all placeholder:text-zinc-600 placeholder:tracking-normal"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={code.length < 4}
                className="btn-gold w-full h-11 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <ShieldCheck size={14} />
                Verificar
              </button>

              <button
                type="button"
                onClick={handleNewCode}
                className="w-full py-2 text-[12px] text-zinc-500 hover:text-white transition-colors cursor-pointer"
              >
                Gerar novo código
              </button>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  <p className="text-[12px] text-red-400/80 text-center">{error}</p>
                </div>
              )}
            </form>
          </motion.div>
        )}

        {/* STEP 3: Dashboard */}
        {step === 'dashboard' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {/* Welcome + Stats Row */}
            <div className="bg-[#111111] border border-white/[0.06] rounded-2xl p-5 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center">
                    <User size={16} className="text-[#D4AF37]" />
                  </div>
                  <div>
                    <p className="text-[16px] font-bold text-white">Olá, {clientName}!</p>
                    <p className="text-[10px] text-zinc-500">{formatPhone(phone)}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer uppercase tracking-wider"
                >
                  Sair
                </button>
              </div>

              {/* Stats Cards */}
              {stats && !loading && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white/[0.03] rounded-xl p-3 text-center border border-white/[0.04]">
                    <CalendarCheck size={14} className="text-[#D4AF37] mx-auto mb-1" />
                    <p className="text-[16px] font-bold text-white">{stats.total_visits}</p>
                    <p className="text-[8px] text-zinc-600 uppercase tracking-wider">Visitas</p>
                  </div>
                  <div className="bg-white/[0.03] rounded-xl p-3 text-center border border-white/[0.04]">
                    <TrendingUp size={14} className="text-emerald-400 mx-auto mb-1" />
                    <p className="text-[16px] font-bold text-white">
                      {formatPrice(stats.total_spent, { locale: true })}
                    </p>
                    <p className="text-[8px] text-zinc-600 uppercase tracking-wider">Gasto Total</p>
                  </div>
                  <div className="bg-white/[0.03] rounded-xl p-3 text-center border border-white/[0.04]">
                    <CreditCard size={14} className="text-[#D4AF37] mx-auto mb-1" />
                    <p className="text-[16px] font-bold text-white">
                      {formatPrice(totalFutureSpent, { locale: true })}
                    </p>
                    <p className="text-[8px] text-zinc-600 uppercase tracking-wider">Pendente</p>
                  </div>
                </div>
              )}
            </div>

            {/* Loading */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={20} className="animate-spin text-[#D4AF37]" />
              </div>
            )}

            {/* Upcoming Bookings */}
            {!loading && bookings.length > 0 && (
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px flex-1 bg-gradient-to-r from-[#D4AF37]/20 to-transparent" />
                  <p className="text-[10px] font-bold text-[#D4AF37]/50 uppercase tracking-[0.25em]">
                    Próximos agendamentos
                  </p>
                  <div className="h-px flex-1 bg-gradient-to-l from-[#D4AF37]/20 to-transparent" />
                </div>

                {bookings.map((booking, index) => (
                  <motion.div
                    key={booking.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group relative bg-[#111111] border border-white/[0.06] rounded-2xl overflow-hidden hover:border-[#D4AF37]/20 transition-colors duration-300"
                  >
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="p-5 space-y-4">
                      {/* Date + Time + Status */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/15 flex items-center justify-center">
                            <Calendar size={16} className="text-[#D4AF37]" />
                          </div>
                          <div>
                            <p className="text-[15px] font-bold text-white tracking-tight">
                              {formatDateBR(booking.booking_date)}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Clock size={10} className="text-[#D4AF37]/60" />
                              <span className="text-[12px] font-black text-[#D4AF37] tabular-nums">
                                {String(booking.booking_time).slice(0, 5)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            booking.status === 'confirmed'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {booking.status === 'confirmed' ? 'Confirmado' : 'Pendente'}
                        </span>
                      </div>

                      {/* Service count + Price */}
                      <div className="flex items-center justify-between pl-[52px]">
                        <div className="flex items-center gap-2">
                          <Scissors size={12} className="text-zinc-600 shrink-0" />
                          <span className="text-[12px] text-zinc-400">
                            {booking.service_ids.length} servico
                            {booking.service_ids.length > 1 ? 's' : ''}
                          </span>
                        </div>
                        <span className="text-[15px] font-bold text-white tabular-nums">
                          {formatPrice(booking.total_price, { locale: true })}
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2.5 pl-[52px]">
                        <button
                          onClick={() => setConfirmCancel(booking)}
                          disabled={cancellingId === booking.id}
                          className="flex-1 h-9 rounded-xl border border-red-500/20 text-red-400/80 hover:bg-red-500/10 hover:text-red-400 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center"
                        >
                          {cancellingId === booking.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            'Cancelar'
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!loading && bookings.length === 0 && error && (
              <div className="bg-[#111111] border border-white/[0.06] rounded-2xl p-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
                  <Calendar size={24} className="text-zinc-600" />
                </div>
                <p className="text-[14px] text-zinc-400 mb-2">{error}</p>
                <p className="text-[11px] text-zinc-600 mb-5">Que tal fazer um novo agendamento?</p>
                <button
                  onClick={() => navigate('/agendar')}
                  className="btn-gold inline-flex items-center gap-2 px-6 h-11"
                >
                  Agendar Agora
                </button>
              </div>
            )}

            {/* New Booking CTA */}
            {!loading && bookings.length > 0 && (
              <button
                onClick={() => navigate('/agendar')}
                className="w-full h-11 rounded-xl bg-white/[0.03] border border-white/[0.06] text-zinc-400 hover:text-white hover:bg-white/[0.06] text-[10px] font-bold uppercase tracking-[0.15em] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                + Novo Agendamento
              </button>
            )}
          </motion.div>
        )}

        {/* Confirm Cancel Modal */}
        <AnimatePresence>
          {confirmCancel && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setConfirmCancel(null)}
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              />
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative z-10 w-full max-w-sm bg-[#1C1C1E] rounded-2xl overflow-hidden"
              >
                <div className="px-6 pt-6 pb-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle size={24} className="text-red-400" />
                  </div>
                  <p className="text-[16px] font-bold text-white mb-2">Cancelar Agendamento?</p>
                  <p className="text-[12px] text-zinc-500 leading-relaxed">
                    {confirmCancel.clients?.name}, {formatDateBR(confirmCancel.booking_date)} às{' '}
                    {String(confirmCancel.booking_time).slice(0, 5)}
                  </p>
                  <p className="text-[12px] text-zinc-600 mt-2">Esta ação não pode ser desfeita.</p>
                </div>
                <div className="flex border-t border-white/[0.06]">
                  <button
                    onClick={() => setConfirmCancel(null)}
                    className="flex-1 py-4 text-[14px] font-medium text-zinc-400 hover:text-white transition-all cursor-pointer"
                  >
                    Voltar
                  </button>
                  <div className="w-px bg-white/[0.06]" />
                  <button
                    onClick={() => handleCancel(confirmCancel)}
                    disabled={cancellingId === confirmCancel.id}
                    className="flex-1 py-4 text-[14px] font-semibold text-red-500 hover:text-red-400 transition-all cursor-pointer disabled:opacity-30"
                  >
                    {cancellingId === confirmCancel.id ? (
                      <Loader2 size={14} className="animate-spin mx-auto" />
                    ) : (
                      'Confirmar Cancelamento'
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Error Toast */}
        <AnimatePresence>
          {error && step === 'dashboard' && bookings.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="mt-6"
            >
              <div className="bg-zinc-900 border border-white/[0.06] rounded-xl p-6 text-center">
                <p className="text-[14px] text-zinc-400">{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Generic Error Toast */}
        <AnimatePresence>
          {error && step === 'dashboard' && bookings.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-8 left-4 right-4 z-[200]"
            >
              <div className="max-w-lg mx-auto bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-center gap-3 backdrop-blur-sm">
                <span className="text-[12px] text-red-400">{error}</span>
                <button
                  onClick={() => setError('')}
                  className="ml-auto text-red-400 hover:text-red-300 cursor-pointer"
                >
                  <AlertTriangle size={14} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ClientProfile;
