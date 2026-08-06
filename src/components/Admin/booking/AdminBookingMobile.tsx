import { Suspense, lazy, type FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import BottomTabs from '../BottomTabs';
import {
  BookingStepIndicator,
  ResponsiveClientStep,
  ResponsiveServicesStep,
  ResponsiveDateTimeStep,
} from './index';
import type { UseAdminBookingReturn } from '../../../hooks/useAdminBookingState';

const BookingSearchModal = lazy(() => import('../shared/BookingSearchModal'));

interface Props {
  booking: UseAdminBookingReturn;
}

const AdminBookingMobile: FC<Props> = ({ booking }) => {
  const b = booking;

  return (
    <div className="h-screen lg:min-h-screen bg-[#121212] text-white font-sans selection:bg-gold/30 flex flex-col relative overflow-hidden">
      <div className="lg:hidden flex-1 flex flex-col relative z-10 overflow-hidden h-[calc(100dvh-60px)] bg-[#050505]">
        <header className="sticky top-0 z-30 bg-[#050505] border-b border-white/[0.06]">
          <div className="px-5 py-4 flex items-center gap-3">
            <button
              onClick={() =>
                b.currentStep > 1 && !b.rescheduleBooking
                  ? b.setCurrentStep(b.currentStep - 1)
                  : b.navigate('/admin')
              }
              className="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-white transition-all active:scale-95 shrink-0"
            >
              <ArrowLeft size={16} />
            </button>
            <h1 className="text-sm font-semibold tracking-[0.15em] text-white uppercase">
              {b.rescheduleBooking ? 'Reagendar' : 'Novo Agendamento'}
            </h1>
          </div>
          {!b.rescheduleBooking && (
            <BookingStepIndicator steps={b.STEPS} currentStep={b.currentStep} variant="mobile" />
          )}
        </header>

        <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-5 pt-5 pb-44 flex flex-col scrollbar-hide">
          <AnimatePresence mode="wait">
            {b.currentStep === 1 && (
              <motion.div
                key="m-step-client"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-4 h-full flex flex-col"
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
                  isStepValid={b.isStepValid}
                  onOpenSearch={() => b.setIsSearchOpen(true)}
                />
              </motion.div>
            )}
            {b.currentStep === 2 && (
              <motion.div
                key="m-step-services"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-4 h-full flex flex-col"
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
                key="m-step-calendar"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-4 h-full flex flex-col"
              >
                <ResponsiveDateTimeStep
                  nextDays={b.nextDays}
                  selectedDate={b.selectedDate}
                  selectedTime={b.selectedTime}
                  existingBookings={b.existingBookings}
                  rescheduleBookingId={b.rescheduleBooking?.id}
                  rescheduleBooking={b.rescheduleBooking}
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

        <div
          className="fixed left-0 right-0 z-[90] bg-[#050505]/95 backdrop-blur-sm border-t border-white/[0.06] pb-3"
          style={{ bottom: 'calc(76px + env(safe-area-inset-bottom, 0px))' }}
        >
          <div className="px-5 pt-3">
            <button
              onClick={() => (b.currentStep < 3 ? b.handleNextStep() : b.handleFinish())}
              disabled={!b.isStepValid(b.currentStep) || b.isSubmitting}
              className={`w-full h-12 rounded-xl font-bold uppercase tracking-[0.2em] text-[12px] transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] ${
                !b.isStepValid(b.currentStep)
                  ? 'bg-white/[0.04] border border-white/[0.04] text-zinc-700 cursor-not-allowed'
                  : 'bg-gold text-black hover:bg-gold/90 shadow-lg shadow-gold/20'
              }`}
            >
              <span>
                {b.isSubmitting
                  ? 'CONFIRMANDO...'
                  : b.rescheduleBooking
                    ? 'CONFIRMAR REAGENDAMENTO'
                    : b.currentStep < 3
                      ? 'CONTINUAR'
                      : 'CONFIRMAR AGENDAMENTO'}
              </span>
            </button>
          </div>
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

      <BottomTabs />
    </div>
  );
};

export default AdminBookingMobile;
