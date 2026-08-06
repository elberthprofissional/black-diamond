import { Fragment, Suspense, lazy, type FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import AdminLayout from '../AdminLayout';
import {
  RescheduleBanner,
  ResponsiveClientStep,
  ResponsiveServicesStep,
  ResponsiveDateTimeStep,
} from './index';
import type { UseAdminBookingReturn } from '../../../hooks/useAdminBookingState';

const BookingSearchModal = lazy(() => import('../shared/BookingSearchModal'));

interface Props {
  booking: UseAdminBookingReturn;
}

const AdminBookingDesktop: FC<Props> = ({ booking }) => {
  const b = booking;

  return (
    <AdminLayout mainClassName="w-full mx-auto px-4 sm:px-6 lg:px-8 pt-24 lg:pt-8 pb-10 max-w-[1100px]">
      <div className="space-y-6">
        {/* Header */}
        <div className="pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => b.navigate('/admin')}
              className="w-11 h-11 rounded-xl border border-white/[0.06] flex items-center justify-center text-zinc-400 hover:text-white hover:border-white/[0.12] transition-all cursor-pointer"
              aria-label="Voltar para a Agenda"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-4xl font-black tracking-tight text-white uppercase">
                {b.rescheduleBooking ? 'Reagendar' : 'Novo Agendamento'}
              </h1>
              <p className="text-[14px] text-zinc-500 mt-1">
                {b.rescheduleBooking
                  ? 'Altere a data ou horário do agendamento'
                  : 'Preencha os dados para criar um novo agendamento'}
              </p>
            </div>
          </div>
          <div className="mt-3 h-px bg-gradient-to-r from-gold/40 via-gold/10 to-transparent" />
        </div>

        {/* Step Indicator */}
        {!b.rescheduleBooking && (
          <div className="hidden lg:flex items-center gap-1">
            {b.STEPS.map((s, i) => (
              <Fragment key={s.step}>
                <button
                  onClick={() => s.step <= b.currentStep && b.setCurrentStep(s.step)}
                  disabled={s.step > b.currentStep}
                  className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-[12px] font-medium transition-all cursor-pointer ${
                    b.currentStep === s.step
                      ? 'bg-gold/15 border border-gold/40 text-gold'
                      : s.step < b.currentStep
                        ? 'bg-white/[0.04] border border-white/[0.08] text-zinc-300 hover:text-white'
                        : 'bg-white/[0.02] border border-white/[0.04] text-zinc-500'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      b.currentStep === s.step
                        ? 'bg-gold text-black shadow-lg shadow-gold/20'
                        : s.step < b.currentStep
                          ? 'bg-gold/30 text-gold'
                          : 'bg-white/[0.06] text-zinc-500'
                    }`}
                  >
                    {s.step < b.currentStep ? '✓' : s.num}
                  </span>
                  <span className="hidden xl:inline">{s.label}</span>
                </button>
                {i < b.STEPS.length - 1 && (
                  <div
                    className={`w-10 h-px ${s.step < b.currentStep ? 'bg-gold/50' : 'bg-white/[0.08]'}`}
                  />
                )}
              </Fragment>
            ))}
          </div>
        )}

        {b.rescheduleBooking && <RescheduleBanner booking={b.rescheduleBooking} />}

        {/* Step Content */}
        <div className="bg-[#0C0C0C]/80 border border-white/[0.05] p-6 rounded-2xl backdrop-blur-xl min-h-[420px]">
          <AnimatePresence mode="wait">
            {b.currentStep === 1 && (
              <motion.div
                key="step-client"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <ResponsiveClientStep
                  selectedClient={b.selectedClient}
                  newClient={b.newClient}
                  searchQuery={b.searchQuery}
                  multipleMatches={b.multipleMatches}
                  isManualEntry={b.isManualEntry}
                  isSearchingClient={b.isSearchingClient}
                  isMensalista={b.isMensalista}
                  onSetNewClient={b.setNewClient}
                  onSetSearchQuery={b.setSearchQuery}
                  onSetIsManualEntry={b.setIsManualEntry}
                  onSetMultipleMatches={b.setMultipleMatches}
                  onSetSelectedClient={b.setSelectedClient}
                  onSearch={b.handleSearch}
                  onNextStep={b.handleNextStep}
                  onOpenSearch={() => b.setIsSearchOpen(true)}
                  isStepValid={b.isStepValid}
                />
              </motion.div>
            )}

            {b.currentStep === 2 && (
              <motion.div
                key="step-services"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <ResponsiveServicesStep
                  services={b.services}
                  selectedServices={b.selectedServices}
                  isMensalista={b.isMensalista}
                  planName={b.currentPlan?.name}
                  onToggleService={b.toggleService}
                  onNextStep={b.handleNextStep}
                  barbers={b.barbers}
                  selectedBarber={b.selectedBarber}
                  onSelectBarber={b.setSelectedBarber}
                />
              </motion.div>
            )}

            {b.currentStep === 3 && (
              <motion.div
                key="step-datetime"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <ResponsiveDateTimeStep
                  nextDays={b.nextDays}
                  selectedDate={b.selectedDate}
                  selectedTime={b.selectedTime}
                  existingBookings={b.existingBookings}
                  rescheduleBookingId={b.rescheduleBooking?.id}
                  onSelectDate={b.handleSelectDate}
                  onSelectTime={b.setSelectedTime}
                  onFinish={b.handleFinish}
                  isSubmitting={b.isSubmitting}
                  isStepValid={b.isStepValid}
                  isPreFilled={b.isPreFilled}
                  selectedServices={b.selectedServices}
                  totalPrice={b.totalPrice}
                  clientName={b.selectedClient?.name || b.newClient.name}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <Suspense fallback={null}>
        <BookingSearchModal
          isOpen={b.isSearchOpen}
          onClose={() => b.setIsSearchOpen(false)}
          onSelectClient={(client) => {
            b.selectClient(client);
            b.setIsSearchOpen(false);
          }}
          clients={b.filteredClientsForModal}
        />
      </Suspense>
    </AdminLayout>
  );
};

export default AdminBookingDesktop;
