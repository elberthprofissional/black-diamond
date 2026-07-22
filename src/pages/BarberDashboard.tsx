import { type FC } from 'react';
import { useBarberContext } from '../contexts/BarberContext';
import { useBookings } from '../hooks/useBookings';
import { useBookingModals } from '../hooks/useBookingModals';
import { getLocalDateString, formatDisplayName } from '../lib/utils';
import AdminLayout from '../components/Admin/AdminLayout';
import OfflineBanner from '../components/Admin/shared/OfflineBanner';
import { SkeletonDashboard } from '../components/Skeleton';
import { Check } from 'lucide-react';

const BarberDashboard: FC = () => {
  const { currentBarber } = useBarberContext();
  const barberId = currentBarber?.id;

  const today = getLocalDateString(new Date());
  const { bookings, loading, isCached, refetch } = useBookings(today, barberId);
  const mgmt = useBookingModals(refetch);

  const todayBookings = bookings.filter((b) => b.status !== 'cancelled' && !b.is_blocked);

  const completedCount = bookings.filter((b) => b.status === 'completed').length;
  const pendingCount = todayBookings.filter(
    (b) => b.status === 'confirmed' || b.status === 'pending'
  ).length;

  return (
    <AdminLayout
      hideBottomTabs={false}
      mainClassName="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 pt-28 lg:pt-8 pb-40"
    >
      <div className="space-y-6">
        <OfflineBanner isCached={isCached} onRetry={refetch} />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">
              Olá, {currentBarber?.name?.split(' ')[0] || 'Barbeiro'} 👋
            </h1>
            <p className="text-[11px] text-zinc-500 mt-1">
              {new Date().toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center">
              <p className="text-lg font-bold text-[#D4AF37]">{pendingCount}</p>
              <p className="text-[9px] text-zinc-500 uppercase tracking-wider">Pendentes</p>
            </div>
            <div className="w-px h-8 bg-white/5" />
            <div className="text-center">
              <p className="text-lg font-bold text-emerald-400">{completedCount}</p>
              <p className="text-[9px] text-zinc-500 uppercase tracking-wider">Finalizados</p>
            </div>
          </div>
        </div>

        {/* Today's Bookings */}
        <div>
          <h2 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-3">
            Meus Agendamentos de Hoje
          </h2>

          {loading ? (
            <SkeletonDashboard />
          ) : todayBookings.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
                <Check size={24} className="text-zinc-600" />
              </div>
              <p className="text-[13px] text-zinc-500">Nenhum agendamento hoje</p>
              <p className="text-[10px] text-zinc-600 mt-1">Aproveite para organizar o salão!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center rounded-lg border border-white/5 bg-[#111111] p-3"
                >
                  <span className="text-sm font-bold text-zinc-400 tabular-nums w-10 shrink-0">
                    {booking.booking_time.slice(0, 5)}
                  </span>
                  <div className="w-px h-3.5 bg-white/10 mx-3 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-white truncate">
                      {formatDisplayName(booking.clients?.name)}
                    </p>
                    <p className="text-[10px] text-zinc-500">
                      {booking.status === 'completed' ? '✅ Finalizado' : '⏳ Pendente'}
                    </p>
                  </div>
                  {booking.status !== 'completed' && (
                    <button
                      onClick={() => mgmt.setCompletingBooking(booking)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-[10px] font-bold hover:bg-emerald-500/20 transition-all cursor-pointer"
                    >
                      Finalizar
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Complete Modal */}
      {mgmt.completingBooking && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60"
          onClick={() => mgmt.setCompletingBooking(null)}
        >
          <div
            className="bg-[#1A1A1A] rounded-2xl w-full max-w-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <Check size={24} className="text-emerald-400" />
              </div>
              <p className="text-[15px] font-bold text-white mb-1">Finalizar Atendimento?</p>
              <p className="text-[12px] text-zinc-400">
                {formatDisplayName(mgmt.completingBooking.clients?.name)} às{' '}
                {mgmt.completingBooking.booking_time.slice(0, 5)}
              </p>
            </div>
            <div className="border-t border-white/[0.06] flex">
              <button
                onClick={() => mgmt.setCompletingBooking(null)}
                className="flex-1 py-3.5 text-[11px] font-bold text-zinc-400 hover:bg-white/[0.03] transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <div className="w-px bg-white/[0.06]" />
              <button
                onClick={() => {
                  mgmt.handleComplete();
                }}
                className="flex-1 py-3.5 text-[11px] font-bold text-emerald-400 hover:bg-white/[0.03] transition-colors cursor-pointer"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thank You Modal */}
      {mgmt.thankYouBooking && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60"
          onClick={mgmt.handleCancelThankYou}
        >
          <div
            className="bg-[#1A1A1A] rounded-2xl w-full max-w-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 text-center">
              <p className="text-[15px] font-bold text-white mb-2">Enviar agradecimento?</p>
              <p className="text-[12px] text-zinc-400">
                Abrir WhatsApp para agradecer{' '}
                {formatDisplayName(mgmt.thankYouBooking.clients?.name)}?
              </p>
            </div>
            <div className="border-t border-white/[0.06] flex">
              <button
                onClick={mgmt.handleCancelThankYou}
                className="flex-1 py-3.5 text-[11px] font-bold text-zinc-400 hover:bg-white/[0.03] transition-colors cursor-pointer"
              >
                Pular
              </button>
              <div className="w-px bg-white/[0.06]" />
              <button
                onClick={mgmt.handleSendThankYou}
                className="flex-1 py-3.5 text-[11px] font-bold text-emerald-400 hover:bg-white/[0.03] transition-colors cursor-pointer"
              >
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default BarberDashboard;
