import { memo, type FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router';
import {
  Calendar,
  Clock,
  Scissors,
  Loader2,
  User,
  AlertTriangle,
  CalendarCheck,
  TrendingUp,
  CreditCard,
  ChevronRight,
  History,
  Crown,
} from 'lucide-react';
import { formatPhone, formatDateBR, formatPrice } from '../lib/utils';
import type { BookingEntry, ClientStats, MensalistaInfo } from './ClientProfileTypes';

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
  showHistory: boolean;
  historyLoading: boolean;
  totalFutureSpent: number;
  onLogout: () => void;
  onCancel: (booking: BookingEntry) => void;
  onReschedule: (booking: BookingEntry) => void;
  onSetConfirmCancel: (booking: BookingEntry | null) => void;
  onToggleHistory: () => void;
  onSetError: (err: string) => void;
}

// ─── Stats Card ───

const StatsGrid: FC<{ stats: ClientStats; totalFutureSpent: number }> = memo(
  ({ stats, totalFutureSpent }) => (
    <div className="grid grid-cols-3 gap-3">
      <div className="bg-white/[0.03] rounded-xl p-3 text-center border border-white/[0.04]">
        <CalendarCheck size={14} className="text-gold mx-auto mb-1" />
        <p className="text-[16px] font-bold text-white">{stats.total_visits}</p>
        <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Visitas</p>
      </div>
      <div className="bg-white/[0.03] rounded-xl p-3 text-center border border-white/[0.04]">
        <TrendingUp size={14} className="text-gold mx-auto mb-1" />
        <p className="text-[16px] font-bold text-white">
          {formatPrice(stats.total_spent, { locale: true })}
        </p>
        <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Gasto Total</p>
      </div>
      <div className="bg-white/[0.03] rounded-xl p-3 text-center border border-white/[0.04]">
        <CreditCard size={14} className="text-gold mx-auto mb-1" />
        <p className="text-[16px] font-bold text-white">
          {formatPrice(totalFutureSpent, { locale: true })}
        </p>
        <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Pendente</p>
      </div>
    </div>
  )
);
StatsGrid.displayName = 'StatsGrid';

// ─── Mensalista Info ───

const MensalistaSection: FC<{ info: MensalistaInfo }> = memo(({ info }) => (
  <div className="mt-4 bg-gradient-to-br from-gold/[0.04] to-transparent border border-gold/15 rounded-2xl p-4">
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
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/15 flex items-center justify-center">
            <Calendar size={16} className="text-gold" />
          </div>
          <div>
            <p className="text-[15px] font-bold text-white tracking-tight">
              {formatDateBR(booking.booking_date)}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Clock size={10} className="text-gold/60" />
              <span className="text-[12px] font-black text-gold tabular-nums">
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
      <div className="flex items-center justify-between pl-[52px]">
        <div className="flex items-center gap-2">
          <Scissors size={12} className="text-zinc-600 shrink-0" />
          <span className="text-[12px] text-zinc-400">
            {booking.service_ids.length} serviço{booking.service_ids.length > 1 ? 's' : ''}
          </span>
        </div>
        <span className="text-[15px] font-bold text-white tabular-nums">
          {formatPrice(booking.total_price, { locale: true })}
        </span>
      </div>
      <div className="flex items-center gap-2.5 pl-[52px]">
        <button
          onClick={() => onReschedule(booking)}
          className="flex-1 h-9 rounded-xl bg-gradient-to-r from-gold to-[#b8944d] text-black font-bold text-[10px] uppercase tracking-[0.15em] hover:from-[#d4b06a] hover:to-gold transition-all cursor-pointer flex items-center justify-center gap-1 shadow-lg shadow-gold/20"
        >
          Reagendar <ChevronRight size={10} />
        </button>
        <button
          onClick={() => onCancel(booking)}
          className="flex-1 h-9 rounded-xl border border-red-500/20 text-red-400/80 hover:bg-red-500/10 hover:text-red-400 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center"
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

const HistoryItem: FC<{ booking: BookingEntry }> = memo(({ booking }) => (
  <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-3 flex items-center justify-between">
    <div className="flex items-center gap-3">
      <Calendar size={12} className="text-zinc-600" />
      <div>
        <p className="text-[12px] text-zinc-400">{formatDateBR(booking.booking_date)}</p>
        <p className="text-[10px] text-zinc-600">{String(booking.booking_time).slice(0, 5)}</p>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <span className="text-[12px] font-bold text-zinc-400">
        {formatPrice(booking.total_price, { locale: true })}
      </span>
      <span
        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${booking.status === 'completed' ? 'bg-gold/10 text-gold' : 'bg-red-500/10 text-red-400'}`}
      >
        {booking.status === 'completed' ? 'Concluído' : 'Cancelado'}
      </span>
    </div>
  </div>
));
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
  showHistory,
  historyLoading,
  totalFutureSpent,
  onLogout,
  onCancel,
  onReschedule,
  onSetConfirmCancel,
  onToggleHistory,
  onSetError,
}) => {
  const navigate = useNavigate();

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      {/* Welcome + Stats */}
      <div className="bg-[#111111] border border-white/[0.06] rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center">
              <User size={16} className="text-gold" />
            </div>
            <div>
              <p className="text-[16px] font-bold text-white">Olá, {clientName}!</p>
              <p className="text-[10px] text-zinc-500">{formatPhone(phone)}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer uppercase tracking-wider"
          >
            Sair
          </button>
        </div>
        {stats && !loading && <StatsGrid stats={stats} totalFutureSpent={totalFutureSpent} />}
        {!loading && mensalistaInfo && <MensalistaSection info={mensalistaInfo} />}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={20} className="animate-spin text-gold" />
        </div>
      )}

      {/* Upcoming Bookings */}
      {!loading && bookings.length > 0 && (
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-gradient-to-r from-gold/20 to-transparent" />
            <p className="text-[10px] font-bold text-gold/50 uppercase tracking-[0.25em]">
              Próximos agendamentos
            </p>
            <div className="h-px flex-1 bg-gradient-to-l from-gold/20 to-transparent" />
          </div>
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
      )}

      {/* History */}
      {!loading && (
        <div className="mb-6">
          <button
            onClick={onToggleHistory}
            className="w-full flex items-center justify-between bg-[#111111] border border-white/[0.06] rounded-2xl p-4 hover:border-gold/20 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center group-hover:border-gold/20 transition-colors">
                <History
                  size={16}
                  className="text-zinc-500 group-hover:text-gold transition-colors"
                />
              </div>
              <div className="text-left">
                <p className="text-[14px] font-bold text-white group-hover:text-gold transition-colors">
                  Histórico
                </p>
                <p className="text-[10px] text-zinc-500">Agendamentos passados</p>
              </div>
            </div>
            <ChevronRight
              size={16}
              className={`text-zinc-500 transition-transform duration-300 ${showHistory ? 'rotate-90' : ''}`}
            />
          </button>
          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-3 space-y-2">
                  {historyLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 size={16} className="animate-spin text-zinc-500" />
                    </div>
                  ) : historyBookings.length > 0 ? (
                    historyBookings.map((hb) => <HistoryItem key={hb.id} booking={hb} />)
                  ) : (
                    <p className="text-[12px] text-zinc-600 text-center py-4">
                      Nenhum histórico encontrado.
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
        {error && bookings.length === 0 && (
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

      {error && bookings.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-8 left-4 right-4 z-[200]"
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
    </motion.div>
  );
};

export default ClientProfileDashboard;
