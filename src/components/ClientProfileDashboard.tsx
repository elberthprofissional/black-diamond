import { memo, useState, type FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router';
import {
  Calendar,
  Clock,
  Scissors,
  Loader2,
  AlertTriangle,
  CalendarCheck,
  TrendingUp,
  CreditCard,
  ChevronRight,
  History,
  Crown,
  Settings,
  LogOut,
  X,
  CalendarPlus,
  ShieldCheck,
  Mail,
  Lock,
  Download,
  Smartphone,
  User,
} from 'lucide-react';
import { formatPhone, formatDateBR, formatPrice } from '../lib/utils';
import { usePwaInstall } from '../hooks/usePwaInstall';
import type { BookingEntry, ClientStats, MensalistaInfo } from './ClientProfileTypes';
import type { Coupon, MilestoneProgress } from '../types';

// ─── Props ───

interface ClientProfileDashboardProps {
  clientName: string;
  phone: string;
  stats: ClientStats | null;
  mensalistaInfo: MensalistaInfo | null;
  bookings: BookingEntry[];
  loading: boolean;
  error: string;
  cancellingId: string | null;
  confirmCancel: BookingEntry | null;
  historyBookings: BookingEntry[];
  historyLoading: boolean;
  totalFutureSpent: number;
  isLimitedAccess: boolean;
  milestones: MilestoneProgress[];
  coupons: Coupon[];
  onLogout: () => void;
  onCancel: (booking: BookingEntry) => void;
  onReschedule: (booking: BookingEntry) => void;
  onSetConfirmCancel: (booking: BookingEntry | null) => void;
  onSetError: (err: string) => void;
}

// ─── Sidebar Nav Item (admin-style with gold indicator) ───

type NavTab = 'dashboard' | 'history' | 'settings';

const SidebarNavItem: FC<{
  icon: typeof Calendar;
  label: string;
  active?: boolean;
  badge?: number;
  onClick: () => void;
}> = memo(({ icon: Icon, label, active, badge, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all group relative ${
      active ? 'bg-white/5 text-white' : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.02]'
    }`}
  >
    {active && (
      <motion.div
        layoutId="clientActiveIndicator"
        className="absolute left-0 w-1 h-4 bg-gold rounded-r-full"
      />
    )}
    <Icon
      size={16}
      className={`transition-colors ${active ? 'text-gold' : 'text-zinc-600 group-hover:text-zinc-400'}`}
    />
    <span
      className={`text-[12px] font-bold tracking-wide ${active ? 'text-white' : 'text-zinc-500'}`}
    >
      {label}
    </span>
    {badge !== undefined && badge > 0 && (
      <span className="ml-auto text-[10px] font-bold bg-gold/15 text-gold px-2 py-0.5 rounded-full">
        {badge}
      </span>
    )}
  </button>
));
SidebarNavItem.displayName = 'SidebarNavItem';

// ─── Stats Card ───

const StatsGrid: FC<{ stats: ClientStats; totalFutureSpent: number }> = memo(
  ({ stats, totalFutureSpent }) => (
    <div className="grid grid-cols-3 gap-3 sm:gap-4">
      <div className="bg-[#111111] rounded-2xl p-5 sm:p-6 text-center border border-white/[0.06] hover:border-gold/20 transition-colors">
        <CalendarCheck size={20} className="text-gold mx-auto mb-2.5" />
        <p className="text-[24px] sm:text-[28px] font-bold text-white">{stats.total_visits}</p>
        <p className="text-[11px] sm:text-[12px] text-zinc-500 uppercase tracking-wider font-medium mt-1">
          Visitas
        </p>
      </div>
      <div className="bg-[#111111] rounded-2xl p-5 sm:p-6 text-center border border-white/[0.06] hover:border-gold/20 transition-colors">
        <TrendingUp size={20} className="text-gold mx-auto mb-2.5" />
        <p className="text-[20px] sm:text-[24px] font-bold text-white">
          {formatPrice(stats.total_spent, { locale: true })}
        </p>
        <p className="text-[11px] sm:text-[12px] text-zinc-500 uppercase tracking-wider font-medium mt-1">
          Gasto Total
        </p>
      </div>
      <div className="bg-[#111111] rounded-2xl p-5 sm:p-6 text-center border border-white/[0.06] hover:border-gold/20 transition-colors">
        <CreditCard size={20} className="text-gold mx-auto mb-2.5" />
        <p className="text-[20px] sm:text-[24px] font-bold text-white">
          {formatPrice(totalFutureSpent, { locale: true })}
        </p>
        <p className="text-[11px] sm:text-[12px] text-zinc-500 uppercase tracking-wider font-medium mt-1">
          Pendente
        </p>
      </div>
    </div>
  )
);
StatsGrid.displayName = 'StatsGrid';

// ─── Mensalista Info ───

const MensalistaSection: FC<{ info: MensalistaInfo }> = memo(({ info }) => (
  <div className="mt-4 bg-gradient-to-br from-gold/[0.04] to-transparent border border-gold/15 rounded-2xl p-4 sm:p-5">
    <div className="flex items-center gap-3 mb-3">
      <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center">
        <Crown size={16} className="text-gold" />
      </div>
      <div>
        <p className="text-[13px] font-bold text-gold">Plano Mensalista</p>
        <p className="text-[10px] text-zinc-500">{info.planName}</p>
      </div>
      {info.daysLeft > 0 ? (
        <span className="ml-auto text-[10px] font-bold text-gold bg-gold/10 px-2.5 py-1 rounded-full">
          {info.daysLeft}d restantes
        </span>
      ) : (
        <span className="ml-auto text-[10px] font-bold text-red-400 bg-red-500/10 px-2.5 py-1 rounded-full">
          Vencido
        </span>
      )}
    </div>
    {info.services.length > 0 && (
      <div className="space-y-1.5 ml-11">
        <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Serviços inclusos</p>
        <div className="flex flex-wrap gap-1.5">
          {info.services.map((svc, i) => (
            <span
              key={i}
              className="text-[10px] text-zinc-400 bg-white/[0.03] border border-white/[0.06] px-2.5 py-1 rounded-lg"
            >
              {svc}
            </span>
          ))}
        </div>
      </div>
    )}
    {info.expiresAt && (
      <p className="text-[10px] text-zinc-600 ml-11 mt-2">
        Válido até <span className="text-zinc-400">{formatDateBR(info.expiresAt)}</span>
      </p>
    )}
  </div>
));
MensalistaSection.displayName = 'MensalistaSection';

// ─── Booking Card ───

const BookingCard: FC<{
  booking: BookingEntry;
  index: number;
  onReschedule: (b: BookingEntry) => void;
  onCancel: (b: BookingEntry) => void;
}> = memo(({ booking, index, onReschedule, onCancel }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05 }}
    className="group relative bg-[#111111] border border-white/[0.06] rounded-2xl overflow-hidden hover:border-gold/20 transition-colors duration-300"
  >
    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-gold/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    <div className="p-5 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gold/10 border border-gold/15 flex items-center justify-center">
            <Calendar size={18} className="text-gold" />
          </div>
          <div>
            <p className="text-[15px] sm:text-[16px] font-bold text-white tracking-tight">
              {formatDateBR(booking.booking_date)}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Clock size={11} className="text-gold/60" />
              <span className="text-[13px] font-black text-gold tabular-nums">
                {String(booking.booking_time).slice(0, 5)}
              </span>
            </div>
          </div>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${booking.status === 'confirmed' ? 'bg-gold/10 text-gold border border-gold/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}
        >
          {booking.status === 'confirmed' ? 'Confirmado' : 'Pendente'}
        </span>
      </div>
      <div className="flex items-center justify-between pl-[56px]">
        <div className="flex items-center gap-2">
          <Scissors size={13} className="text-zinc-600 shrink-0" />
          <span className="text-[13px] text-zinc-400">
            {booking.service_ids.length} serviço{booking.service_ids.length > 1 ? 's' : ''}
          </span>
        </div>
        <span className="text-[16px] font-bold text-white tabular-nums">
          {formatPrice(booking.total_price, { locale: true })}
        </span>
      </div>
      <div className="flex items-center gap-2.5 pl-[56px]">
        <button
          onClick={() => onReschedule(booking)}
          className="flex-1 h-10 rounded-xl bg-gradient-to-r from-gold to-[#b8944d] text-black font-bold text-[11px] uppercase tracking-[0.15em] hover:from-[#d4b06a] hover:to-gold transition-all cursor-pointer flex items-center justify-center gap-1 shadow-lg shadow-gold/20"
        >
          Reagendar <ChevronRight size={11} />
        </button>
        <button
          onClick={() => onCancel(booking)}
          className="flex-1 h-10 rounded-xl border border-red-500/20 text-red-400/80 hover:bg-red-500/10 hover:text-red-400 text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center"
        >
          Cancelar
        </button>
      </div>
    </div>
  </motion.div>
));
BookingCard.displayName = 'BookingCard';

// ─── Cancel Modal ───

const CancelModal: FC<{
  booking: BookingEntry;
  cancellingId: string | null;
  onConfirm: () => void;
  onClose: () => void;
}> = memo(({ booking, cancellingId, onConfirm, onClose }) => (
  <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
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
          {booking.clients?.name}, {formatDateBR(booking.booking_date)} às{' '}
          {String(booking.booking_time).slice(0, 5)}
        </p>
        <p className="text-[12px] text-zinc-600 mt-2">Esta ação não pode ser desfeita.</p>
      </div>
      <div className="flex border-t border-white/[0.06]">
        <button
          onClick={onClose}
          className="flex-1 py-4 text-[14px] font-medium text-zinc-400 hover:text-white transition-all cursor-pointer"
        >
          Voltar
        </button>
        <div className="w-px bg-white/[0.06]" />
        <button
          onClick={onConfirm}
          disabled={cancellingId === booking.id}
          className="flex-1 py-4 text-[14px] font-semibold text-red-500 hover:text-red-400 transition-all cursor-pointer disabled:opacity-30"
        >
          {cancellingId === booking.id ? (
            <Loader2 size={14} className="animate-spin mx-auto" />
          ) : (
            'Confirmar Cancelamento'
          )}
        </button>
      </div>
    </motion.div>
  </div>
));
CancelModal.displayName = 'CancelModal';

// ─── History Item ───

const HistoryItem: FC<{ booking: BookingEntry; onRebook: () => void }> = memo(
  ({ booking, onRebook }) => (
    <div className="bg-[#111111] border border-white/[0.06] rounded-xl p-4 sm:p-5 flex items-center justify-between hover:border-white/[0.1] transition-colors flex-wrap gap-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-white/[0.03] border border-white/[0.05] flex items-center justify-center">
          <Calendar size={14} className="text-zinc-500" />
        </div>
        <div>
          <p className="text-[13px] sm:text-[14px] text-zinc-300 font-medium">
            {formatDateBR(booking.booking_date)}
          </p>
          <p className="text-[11px] text-zinc-600">{String(booking.booking_time).slice(0, 5)}</p>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 ml-auto">
        <div className="flex items-center gap-3">
          <span className="text-[14px] font-bold text-zinc-300 tabular-nums">
            {formatPrice(booking.total_price, { locale: true })}
          </span>
          <span
            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${booking.status === 'completed' ? 'bg-gold/10 text-gold' : 'bg-red-500/10 text-red-400'}`}
          >
            {booking.status === 'completed' ? 'Concluído' : 'Cancelado'}
          </span>
        </div>
        {booking.status === 'completed' && (
          <button
            onClick={onRebook}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-gold hover:text-black hover:border-gold text-zinc-400 transition-colors text-[11px] font-bold cursor-pointer"
          >
            Agendar Novamente <ChevronRight size={12} />
          </button>
        )}
      </div>
    </div>
  )
);
HistoryItem.displayName = 'HistoryItem';

// ─── Main Dashboard ───

const ClientProfileDashboard: FC<ClientProfileDashboardProps> = ({
  clientName,
  phone,
  stats,
  mensalistaInfo,
  bookings,
  loading,
  error,
  cancellingId,
  confirmCancel,
  historyBookings,
  historyLoading,
  totalFutureSpent,
  isLimitedAccess,
  milestones,
  coupons,
  onLogout,
  onCancel,
  onReschedule,
  onSetConfirmCancel,
  onSetError,
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [settingsSection, setSettingsSection] = useState<'conta' | 'seguranca' | 'app'>('conta');
  const { canInstall, isStandalone, handleInstall } = usePwaInstall();

  const initials = clientName
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="min-h-dvh min-h-[100dvh] bg-[#0A0A0A] text-white font-sans flex selection:bg-gold/30">
      {/* ═══════════════════════════════════════════════════════════
       *  SIDEBAR — desktop (>=1024px) — admin-style
       * ═══════════════════════════════════════════════════════════ */}
      <aside className="hidden lg:flex flex-col w-[260px] h-screen fixed left-0 top-0 bg-[#0A0A0A] border-r border-white/5 z-[100]">
        {/* Branding — same as admin */}
        <div className="h-28 flex items-center px-6">
          <div className="flex items-center gap-3">
            <img
              src="/assets/logo.webp"
              alt="Black Diamond"
              loading="lazy"
              decoding="async"
              className="w-10 h-10 object-contain"
            />
            <div className="flex items-baseline gap-1">
              <span className="text-[14px] font-bebas tracking-[0.06em] text-white uppercase leading-none">
                BLACK
              </span>
              <span className="text-[14px] font-bebas tracking-[0.05em] leading-none uppercase text-gold">
                DIAMOND
              </span>
            </div>
          </div>
        </div>

        {/* Navigation — admin-style with gold indicator */}
        <div className="flex-1 px-6 py-4 overflow-y-auto scrollbar-hide">
          <nav className="space-y-1.5">
            <SidebarNavItem
              icon={Calendar}
              label="Agendamentos"
              active={activeTab === 'dashboard'}
              badge={bookings.length}
              onClick={() => setActiveTab('dashboard')}
            />
            {!isLimitedAccess && (
              <SidebarNavItem
                icon={History}
                label="Histórico"
                active={activeTab === 'history'}
                badge={historyBookings.length}
                onClick={() => setActiveTab('history')}
              />
            )}
            <SidebarNavItem
              icon={Settings}
              label="Configurações"
              active={activeTab === 'settings'}
              onClick={() => setActiveTab('settings')}
            />
          </nav>
        </div>

        {/* Profile + Logout — admin-style */}
        <div className="mt-auto border-t border-white/5 p-4">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-500/[0.04] transition-all cursor-pointer"
          >
            <LogOut size={16} className="text-zinc-600" />
            <span className="text-[12px] font-bold tracking-wide">Sair da conta</span>
          </button>
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════════════════
       *  CONTEÚDO PRINCIPAL — admin-style layout
       * ═══════════════════════════════════════════════════════════ */}
      <main className="flex-1 lg:ml-[260px] min-w-0 pb-20 lg:pb-0">
        {/* Header mobile */}
        <div className="lg:hidden sticky top-0 z-30 bg-[#0A0A0A]/90 backdrop-blur-xl border-b border-white/[0.05] px-5 py-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-[11px] font-bold text-gold">
                {initials}
              </div>
              <div>
                <p className="text-[13px] font-bold text-white">{clientName}</p>
                <p className="text-[10px] text-zinc-500">{formatPhone(phone)}</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/')}
              className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Content — admin-style max-width and padding */}
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 pt-6 lg:pt-8 pb-10 max-w-[1440px]">
          <AnimatePresence mode="wait">
            {/* ── TAB: Dashboard ── */}
            {activeTab === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-6 lg:space-y-8"
              >
                {/* Page Header — admin-style */}
                <div className="flex items-center justify-between gap-3 pb-4 border-b border-white/[0.06]">
                  <div>
                    <h1 className="text-lg lg:text-2xl font-bold tracking-tight text-white uppercase">
                      Meus Agendamentos
                    </h1>
                    <p className="text-[13px] text-zinc-500 mt-1">
                      Olá, {clientName.split(' ')[0]}! Acompanhe seus horários na Black Diamond.
                    </p>
                  </div>
                </div>

                {/* Restricted Access Banner */}
                {isLimitedAccess && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 sm:p-5 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Lock size={18} className="text-amber-500" />
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-amber-500 mb-1">Acesso Restrito</p>
                      <p className="text-[12px] text-amber-500/80 leading-relaxed mb-3">
                        Você acessou apenas com o seu telefone. Para ver seu histórico de
                        atendimentos, total gasto e editar seu perfil, crie uma senha.
                      </p>
                      <button
                        onClick={() => {
                          setActiveTab('settings');
                          setSettingsSection('seguranca');
                        }}
                        className="text-[12px] font-bold text-amber-500 hover:text-amber-400 flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        Criar Senha de Acesso <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Stats */}
                {stats && !loading && !isLimitedAccess && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-1.5 h-1.5 rotate-45 bg-gold/60" />
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
                        Seus números
                      </p>
                    </div>
                    <StatsGrid stats={stats} totalFutureSpent={totalFutureSpent} />
                    {mensalistaInfo && <MensalistaSection info={mensalistaInfo} />}

                    {/* Loyalty Milestones */}
                    {milestones.length > 0 && (
                      <div className="mt-4 bg-[#111111] border border-white/[0.06] rounded-2xl p-4 sm:p-5">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center">
                            <Crown size={16} className="text-gold" />
                          </div>
                          <div>
                            <p className="text-[13px] font-bold text-gold">Cartão Fidelidade</p>
                            <p className="text-[10px] text-zinc-500">
                              Seu progresso para ganhar recompensas
                            </p>
                          </div>
                        </div>
                        <div className="space-y-4">
                          {milestones.map((m, i) => {
                            const progressPercent = Math.min(
                              100,
                              Math.round((m.progress / m.milestone.visits_required) * 100)
                            );
                            return (
                              <div key={i} className="relative">
                                <div className="flex justify-between text-[11px] mb-1.5">
                                  <span className="text-zinc-400 font-medium">
                                    {m.progress} de {m.milestone.visits_required} cortes
                                  </span>
                                  <span
                                    className={
                                      m.already_claimed ? 'text-gold font-bold' : 'text-zinc-500'
                                    }
                                  >
                                    {m.already_claimed ? 'Resgatado!' : `${progressPercent}%`}
                                  </span>
                                </div>
                                <div className="h-2 w-full bg-white/[0.03] rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-1000 ${m.already_claimed ? 'bg-gold/50' : 'bg-gradient-to-r from-gold/50 to-gold'}`}
                                    style={{ width: `${progressPercent}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Coupons */}
                    {coupons.length > 0 && (
                      <div className="mt-4 bg-[#111111] border border-white/[0.06] rounded-2xl p-4 sm:p-5">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                            <CalendarCheck size={16} className="text-emerald-500" />
                          </div>
                          <div>
                            <p className="text-[13px] font-bold text-emerald-500">Meus Cupons</p>
                            <p className="text-[10px] text-zinc-500">
                              Ofertas disponíveis para você
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          {coupons.map((c) => (
                            <div
                              key={c.id}
                              className="flex items-center justify-between bg-white/[0.02] border border-white/[0.04] p-3 rounded-xl border-dashed"
                            >
                              <div>
                                <p className="text-[12px] font-bold text-white uppercase tracking-wider">
                                  {c.code}
                                </p>
                                <p className="text-[10px] text-zinc-500 mt-0.5">{c.description}</p>
                              </div>
                              <div className="text-right">
                                <span className="text-[14px] font-black text-emerald-400 block">
                                  {c.discount_type === 'percentage'
                                    ? `${c.discount_value}% OFF`
                                    : c.discount_type === 'fixed'
                                      ? `R$ ${c.discount_value} OFF`
                                      : 'GRÁTIS'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Loading */}
                {loading && (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 size={24} className="animate-spin text-gold" />
                  </div>
                )}

                {/* Upcoming Bookings */}
                {!loading && bookings.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-px flex-1 bg-gradient-to-r from-gold/20 to-transparent" />
                      <p className="text-[10px] font-bold text-gold/50 uppercase tracking-[0.25em]">
                        Próximos agendamentos
                      </p>
                      <div className="h-px flex-1 bg-gradient-to-l from-gold/20 to-transparent" />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
                      {bookings.map((booking, index) => (
                        <BookingCard
                          key={booking.id}
                          booking={booking}
                          index={index}
                          onReschedule={onReschedule}
                          onCancel={(b) => onSetConfirmCancel(b)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {!loading && bookings.length === 0 && (
                  <div className="bg-[#111111] border border-white/[0.06] rounded-2xl p-10 sm:p-12 lg:p-16 text-center">
                    <div className="w-20 h-20 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-5">
                      <Calendar size={32} className="text-zinc-600" />
                    </div>
                    <p className="text-[16px] sm:text-[18px] font-bold text-zinc-300 mb-2">
                      Nenhum agendamento marcado
                    </p>
                    <p className="text-[13px] sm:text-[14px] text-zinc-600 mb-6">
                      Que tal reservar seu próximo horário?
                    </p>
                    <button
                      onClick={() => navigate('/agendar')}
                      className="btn-gold inline-flex items-center gap-2 px-8 h-12"
                    >
                      <CalendarPlus size={16} />
                      Agendar Agora
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── TAB: Histórico ── */}
            {activeTab === 'history' && (
              <motion.div
                key="history"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-4 lg:space-y-5"
              >
                {/* Page Header — admin-style */}
                <div className="pb-4 border-b border-white/[0.06]">
                  <h1 className="text-lg lg:text-2xl font-bold tracking-tight text-white uppercase">
                    Histórico
                  </h1>
                  <p className="text-[13px] text-zinc-500 mt-1">
                    Consulte seus atendimentos anteriores na Black Diamond.
                  </p>
                </div>

                {historyLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 size={20} className="animate-spin text-zinc-500" />
                  </div>
                ) : historyBookings.length > 0 ? (
                  <div className="space-y-2">
                    {historyBookings.map((b) => (
                      <HistoryItem key={b.id} booking={b} onRebook={() => navigate('/agendar')} />
                    ))}
                  </div>
                ) : (
                  <div className="bg-[#111111] border border-white/[0.06] rounded-2xl p-10 sm:p-12 lg:p-16 text-center">
                    <div className="w-20 h-20 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-5">
                      <History size={32} className="text-zinc-600" />
                    </div>
                    <p className="text-[16px] sm:text-[18px] font-bold text-zinc-300 mb-2">
                      Nenhum atendimento por aqui ainda
                    </p>
                    <p className="text-[13px] sm:text-[14px] text-zinc-600 mb-6">
                      Seus atendimentos concluídos aparecerão aqui.
                    </p>
                    <button
                      onClick={() => navigate('/agendar')}
                      className="btn-gold inline-flex items-center gap-2 px-8 h-12"
                    >
                      <CalendarPlus size={16} />
                      Agendar Horário
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── TAB: Configurações ── */}
            {activeTab === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-6 lg:space-y-8 max-w-[1000px]"
              >
                {/* Page Header — admin-style */}
                <div className="pb-4 border-b border-white/[0.06]">
                  <h1 className="text-lg lg:text-2xl font-bold tracking-tight text-white uppercase">
                    Configurações
                  </h1>
                  <p className="text-[13px] text-zinc-500 mt-1">
                    Gerencie seus dados e preferências da conta.
                  </p>
                </div>

                {/* Container: Submenu Lateral + Conteúdo Principal */}
                <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 items-start">
                  {/* Submenu Lateral (Apenas Desktop) */}
                  <div className="hidden lg:block w-[220px] shrink-0 sticky top-24">
                    <div className="space-y-1.5">
                      <button
                        onClick={() => setSettingsSection('conta')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] transition-all cursor-pointer ${settingsSection === 'conta' ? 'bg-white/5 text-white font-medium' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02]'}`}
                      >
                        <User
                          size={16}
                          className={settingsSection === 'conta' ? 'text-gold' : 'text-zinc-600'}
                        />
                        Conta
                      </button>
                      <button
                        onClick={() => setSettingsSection('seguranca')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] transition-all cursor-pointer ${settingsSection === 'seguranca' ? 'bg-white/5 text-white font-medium' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02]'}`}
                      >
                        <ShieldCheck
                          size={16}
                          className={
                            settingsSection === 'seguranca' ? 'text-gold' : 'text-zinc-600'
                          }
                        />
                        Segurança
                      </button>
                      {canInstall && !isStandalone && (
                        <button
                          onClick={() => setSettingsSection('app')}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] transition-all cursor-pointer ${settingsSection === 'app' ? 'bg-white/5 text-white font-medium' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02]'}`}
                        >
                          <Smartphone
                            size={16}
                            className={settingsSection === 'app' ? 'text-gold' : 'text-zinc-600'}
                          />
                          Aplicativo
                        </button>
                      )}

                      <div className="pt-3 mt-3 border-t border-white/[0.04]">
                        <button
                          onClick={onLogout}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] transition-all cursor-pointer text-red-400/70 hover:text-red-400 hover:bg-red-500/[0.04]"
                        >
                          <LogOut size={16} />
                          Sair da conta
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Submenu Mobile (Scroll horizontal) */}
                  <div className="lg:hidden w-full overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                    <div className="flex gap-2 min-w-max pb-2">
                      <button
                        onClick={() => setSettingsSection('conta')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-colors ${settingsSection === 'conta' ? 'bg-white/10 text-white' : 'bg-white/[0.03] text-zinc-400 border border-white/[0.05]'}`}
                      >
                        <User
                          size={14}
                          className={settingsSection === 'conta' ? 'text-gold' : 'text-zinc-500'}
                        />
                        Conta
                      </button>
                      <button
                        onClick={() => setSettingsSection('seguranca')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-colors ${settingsSection === 'seguranca' ? 'bg-white/10 text-white' : 'bg-white/[0.03] text-zinc-400 border border-white/[0.05]'}`}
                      >
                        <ShieldCheck
                          size={14}
                          className={
                            settingsSection === 'seguranca' ? 'text-gold' : 'text-zinc-500'
                          }
                        />
                        Segurança
                      </button>
                      {canInstall && !isStandalone && (
                        <button
                          onClick={() => setSettingsSection('app')}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-colors ${settingsSection === 'app' ? 'bg-white/10 text-white' : 'bg-white/[0.03] text-zinc-400 border border-white/[0.05]'}`}
                        >
                          <Smartphone
                            size={14}
                            className={settingsSection === 'app' ? 'text-gold' : 'text-zinc-500'}
                          />
                          Aplicativo
                        </button>
                      )}

                      <div className="w-px h-6 bg-white/[0.06] mx-1 self-center" />

                      <button
                        onClick={onLogout}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-colors bg-white/[0.02] text-red-400/70 border border-red-500/10 hover:bg-red-500/[0.04] hover:text-red-400"
                      >
                        <LogOut size={14} />
                        Sair
                      </button>
                    </div>
                  </div>

                  {/* Conteúdo Principal */}
                  <div className="flex-1 min-w-0 w-full space-y-6">
                    <AnimatePresence mode="wait">
                      {/* --- SEÇÃO CONTA --- */}
                      {settingsSection === 'conta' && (
                        <motion.div
                          key="conta"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          transition={{ duration: 0.15 }}
                          className="space-y-6"
                        >
                          <div className="bg-[#111111] border border-white/[0.06] rounded-2xl overflow-hidden">
                            <div className="p-6 flex flex-col sm:flex-row items-center gap-5 border-b border-white/[0.04]">
                              <div className="relative">
                                <div className="w-20 h-20 rounded-full bg-gold/10 border-2 border-gold/20 flex items-center justify-center text-[24px] font-bold text-gold">
                                  {initials}
                                </div>
                                <div className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 border-2 border-[#111111] rounded-full" />
                              </div>
                              <div className="text-center sm:text-left">
                                <h2 className="text-xl font-bold text-white tracking-tight">
                                  {clientName}
                                </h2>
                                <p className="text-[13px] text-zinc-500 mt-1">
                                  Cliente Black Diamond
                                </p>
                              </div>
                            </div>

                            <div className="divide-y divide-white/[0.04]">
                              <div className="p-5 flex items-center justify-between hover:bg-white/[0.01] transition-colors cursor-default">
                                <div>
                                  <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1">
                                    Nome completo
                                  </p>
                                  <p className="text-[14px] text-white">{clientName}</p>
                                </div>
                                <ChevronRight size={16} className="text-zinc-600" />
                              </div>
                              <div className="p-5 flex items-center justify-between hover:bg-white/[0.01] transition-colors cursor-default">
                                <div>
                                  <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1">
                                    WhatsApp
                                  </p>
                                  <p className="text-[14px] text-white">{formatPhone(phone)}</p>
                                </div>
                                <ChevronRight size={16} className="text-zinc-600" />
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* --- SEÇÃO SEGURANÇA --- */}
                      {settingsSection === 'seguranca' && (
                        <motion.div
                          key="seguranca"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          transition={{ duration: 0.15 }}
                          className="space-y-6"
                        >
                          <div className="bg-[#111111] border border-white/[0.06] rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
                            <div className="p-5 flex items-center justify-between hover:bg-white/[0.02] transition-colors cursor-pointer group">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center group-hover:bg-white/[0.05] transition-colors">
                                  <Lock
                                    size={16}
                                    className="text-zinc-400 group-hover:text-gold transition-colors"
                                  />
                                </div>
                                <div>
                                  <p className="text-[14px] font-bold text-white mb-0.5">
                                    Senha de acesso
                                  </p>
                                  <p className="text-[12px] text-zinc-500">
                                    Proteja seu login com uma senha
                                  </p>
                                </div>
                              </div>
                              <ChevronRight
                                size={16}
                                className="text-zinc-600 group-hover:text-zinc-400 transition-colors"
                              />
                            </div>

                            <div className="p-5 flex items-center justify-between hover:bg-white/[0.02] transition-colors cursor-pointer group">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center group-hover:bg-white/[0.05] transition-colors">
                                  <Mail
                                    size={16}
                                    className="text-zinc-400 group-hover:text-gold transition-colors"
                                  />
                                </div>
                                <div>
                                  <p className="text-[14px] font-bold text-white mb-0.5">
                                    E-mail de recuperação
                                  </p>
                                  <p className="text-[12px] text-zinc-500">
                                    Recupere sua senha por e-mail
                                  </p>
                                </div>
                              </div>
                              <ChevronRight
                                size={16}
                                className="text-zinc-600 group-hover:text-zinc-400 transition-colors"
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* --- SEÇÃO APP --- */}
                      {settingsSection === 'app' && canInstall && !isStandalone && (
                        <motion.div
                          key="app"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          transition={{ duration: 0.15 }}
                        >
                          <div className="bg-gradient-to-br from-gold/[0.06] to-transparent border border-gold/15 rounded-2xl p-6 sm:p-8">
                            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
                              <div className="w-16 h-16 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0">
                                <Smartphone size={28} className="text-gold" />
                              </div>
                              <div className="flex-1">
                                <h3 className="text-lg font-bold text-white mb-2">
                                  Instalar Black Diamond
                                </h3>
                                <p className="text-[13px] text-zinc-400 leading-relaxed mb-5 max-w-md">
                                  Acesse seus agendamentos direto do seu celular, com a experiência
                                  rápida e nativa de um aplicativo.
                                </p>
                                <button
                                  onClick={handleInstall}
                                  className="h-11 px-6 rounded-xl bg-gradient-to-r from-gold to-[#b8944d] text-black font-bold text-[12px] uppercase tracking-[0.15em] hover:brightness-110 transition-all cursor-pointer flex items-center justify-center sm:justify-start gap-2 shadow-lg shadow-gold/20 w-full sm:w-auto"
                                >
                                  <Download size={14} />
                                  Instalar Agora
                                </button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* ═══════════════════════════════════════════════════════════
       *  BOTTOM TABS — mobile (<1024px)
       * ═══════════════════════════════════════════════════════════ */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0A0A0A]/95 backdrop-blur-xl border-t border-white/[0.05] pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around px-2 py-2.5">
          {[
            { tab: 'dashboard' as const, icon: Calendar, label: 'Início', badge: bookings.length },
            ...(isLimitedAccess
              ? []
              : [
                  {
                    tab: 'history' as const,
                    icon: History,
                    label: 'Histórico',
                    badge: historyBookings.length,
                  },
                ]),
            { tab: 'settings' as const, icon: Settings, label: 'Config' },
          ].map((item) => (
            <button
              key={item.tab}
              onClick={() => setActiveTab(item.tab)}
              className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeTab === item.tab ? 'text-gold' : 'text-zinc-500'
              }`}
            >
              <div className="relative">
                <item.icon size={18} />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 w-3.5 h-3.5 rounded-full bg-gold text-black text-[8px] font-bold flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-semibold">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Cancel Modal */}
      <AnimatePresence>
        {confirmCancel && (
          <CancelModal
            booking={confirmCancel}
            cancellingId={cancellingId}
            onConfirm={() => onCancel(confirmCancel)}
            onClose={() => onSetConfirmCancel(null)}
          />
        )}
      </AnimatePresence>

      {/* Error Toast */}
      <AnimatePresence>
        {error && bookings.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-20 lg:bottom-8 left-4 right-4 z-[200]"
          >
            <div className="max-w-lg mx-auto bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-center gap-3 backdrop-blur-sm">
              <span className="text-[12px] text-red-400">{error}</span>
              <button
                onClick={() => onSetError('')}
                className="ml-auto text-red-400 hover:text-red-300 cursor-pointer"
              >
                <AlertTriangle size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ClientProfileDashboard;
