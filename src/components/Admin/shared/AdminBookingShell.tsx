import { type FC, type ReactNode } from 'react';
import type { BookingWithClient, Service } from '../../../types';
import BookingSlidePanel from './BookingSlidePanel';
import RescheduleWizard from './RescheduleWizard';
import BookingDetailPanel from './BookingDetailPanel';
import CompleteModal from './CompleteModal';
import ThankYouModal from './ThankYouModal';
import UnblockModal from './UnblockModal';
import DeleteModal from './DeleteModal';
import ToastNotification from './ToastNotification';
import type { Toast } from '../../../hooks/useToast';

interface RescheduleState {
  isRescheduling: boolean;
  rescheduleStep: number;
  setRescheduleStep: (step: number) => void;
  rescheduleServices: string[];
  setRescheduleServices: (services: string[]) => void;
  rescheduleDate: string;
  setRescheduleDate: (date: string) => void;
  rescheduleTime: string;
  setRescheduleTime: (time: string) => void;
  existingBookingsForReschedule: BookingWithClient[];
  loadingSlots: boolean;
  isSavingReschedule: boolean;
  handleConfirmReschedule: () => Promise<void>;
  handleStartReschedule: () => void;
  cancelReschedule: () => void;
}

interface AdminBookingShellProps {
  selectedBooking: BookingWithClient | null;
  setSelectedBooking: (booking: BookingWithClient | null) => void;
  services: Service[];
  isDesktop: boolean;
  reschedule: RescheduleState;
  completingBooking: BookingWithClient | null;
  setCompletingBooking: (booking: BookingWithClient | null) => void;
  handleComplete: (notes?: string) => Promise<void>;
  thankYouBooking: BookingWithClient | null;
  handleSendThankYou: () => Promise<void>;
  handleCancelThankYou: () => void;
  bookingToDelete: BookingWithClient | null;
  setBookingToDelete: (booking: BookingWithClient | null) => void;
  confirmDelete: () => Promise<void>;
  unblockingBooking: BookingWithClient | null;
  setUnblockingBooking: (booking: BookingWithClient | null) => void;
  confirmUnblock: () => Promise<void>;
  toast: Toast;
  onRenderDetail?: () => ReactNode;
}

const AdminBookingShell: FC<AdminBookingShellProps> = ({
  selectedBooking,
  setSelectedBooking,
  services,
  isDesktop,
  reschedule,
  completingBooking,
  setCompletingBooking,
  handleComplete,
  thankYouBooking,
  handleSendThankYou,
  handleCancelThankYou,
  bookingToDelete,
  setBookingToDelete,
  confirmDelete,
  unblockingBooking,
  setUnblockingBooking,
  confirmUnblock,
  toast,
}) => {
  const closePanel = () => {
    setSelectedBooking(null);
    reschedule.cancelReschedule();
  };

  const renderDetailPanel = () => {
    if (!selectedBooking) return null;

    if (reschedule.isRescheduling) {
      return (
        <RescheduleWizard
          selectedBooking={selectedBooking}
          services={services}
          step={reschedule.rescheduleStep}
          setStep={reschedule.setRescheduleStep}
          rescheduleServices={reschedule.rescheduleServices}
          setRescheduleServices={reschedule.setRescheduleServices}
          rescheduleDate={reschedule.rescheduleDate}
          setRescheduleDate={reschedule.setRescheduleDate}
          rescheduleTime={reschedule.rescheduleTime}
          setRescheduleTime={reschedule.setRescheduleTime}
          existingBookings={reschedule.existingBookingsForReschedule}
          loadingSlots={reschedule.loadingSlots}
          isSaving={reschedule.isSavingReschedule}
          onConfirm={reschedule.handleConfirmReschedule}
          onClose={() => {
            setSelectedBooking(null);
            reschedule.cancelReschedule();
          }}
        />
      );
    }

    return (
      <BookingDetailPanel
        booking={selectedBooking}
        services={services}
        onClose={() => setSelectedBooking(null)}
        onComplete={() => setCompletingBooking(selectedBooking)}
        onReschedule={reschedule.handleStartReschedule}
        onDelete={() => setBookingToDelete(selectedBooking)}
      />
    );
  };

  return (
    <>
      <BookingSlidePanel isOpen={!!selectedBooking} isDesktop={isDesktop} onClose={closePanel}>
        {renderDetailPanel()}
      </BookingSlidePanel>

      <CompleteModal
        booking={completingBooking}
        onConfirm={handleComplete}
        onCancel={() => setCompletingBooking(null)}
      />
      <ThankYouModal
        booking={thankYouBooking}
        services={services}
        onConfirm={handleSendThankYou}
        onCancel={handleCancelThankYou}
      />
      <UnblockModal
        booking={unblockingBooking}
        onConfirm={confirmUnblock}
        onCancel={() => setUnblockingBooking(null)}
      />
      <DeleteModal
        booking={bookingToDelete}
        onConfirm={confirmDelete}
        onCancel={() => setBookingToDelete(null)}
      />

      <ToastNotification toast={toast} />
    </>
  );
};

export default AdminBookingShell;
