import { type FC } from 'react';
import { useToast } from '../hooks/useToast';
import { BookingWizardProvider } from '../hooks/BookingWizardContext';
import ToastNotification from '../components/Admin/shared/ToastNotification';
import BookingPageContent from '../components/Booking/BookingPageContent';

const BookingPage: FC = () => {
  const { toast, showError } = useToast();

  return (
    <BookingWizardProvider showError={showError}>
      <div className="font-sans relative min-h-screen bg-[#050505] flex flex-col selection:bg-[#D4AF37] selection:text-black overflow-x-hidden">
        <main id="main-content" className="flex-1 relative z-10 h-full flex flex-col">
          <BookingPageContent />
        </main>

        <ToastNotification toast={toast} />
      </div>
    </BookingWizardProvider>
  );
};

export default BookingPage;
