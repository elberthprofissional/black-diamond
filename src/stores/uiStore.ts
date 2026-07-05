import { create } from 'zustand';

interface Toast {
  message: string;
  type: 'success' | 'error';
}

interface UIState {
  toast: Toast | null;
  selectedBookingId: string | null;
  completingBookingId: string | null;
  bookingToDeleteId: string | null;
  showRescheduleWizard: boolean;
  showToast: (message: string, type: Toast['type']) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  clearToast: () => void;
  setSelectedBooking: (id: string | null) => void;
  setCompletingBooking: (id: string | null) => void;
  setBookingToDelete: (id: string | null) => void;
  setShowRescheduleWizard: (show: boolean) => void;
  reset: () => void;
}

export const useUIStore = create<UIState>((set) => {
  let toastTimer: ReturnType<typeof setTimeout> | null = null;

  const clearTimer = () => {
    if (toastTimer) {
      clearTimeout(toastTimer);
      toastTimer = null;
    }
  };

  return {
    toast: null,
    selectedBookingId: null,
    completingBookingId: null,
    bookingToDeleteId: null,
    showRescheduleWizard: false,

    showToast: (message, type) => {
      clearTimer();
      set({ toast: { message, type } });
      toastTimer = setTimeout(() => set({ toast: null }), 3000);
    },

    showSuccess: (message) => {
      clearTimer();
      set({ toast: { message, type: 'success' } });
      toastTimer = setTimeout(() => set({ toast: null }), 3000);
    },

    showError: (message) => {
      clearTimer();
      set({ toast: { message, type: 'error' } });
      toastTimer = setTimeout(() => set({ toast: null }), 3000);
    },

    clearToast: () => {
      clearTimer();
      set({ toast: null });
    },

    setSelectedBooking: (id) => set({ selectedBookingId: id }),
    setCompletingBooking: (id) => set({ completingBookingId: id }),
    setBookingToDelete: (id) => set({ bookingToDeleteId: id }),
    setShowRescheduleWizard: (show) => set({ showRescheduleWizard: show }),

    reset: () => {
      clearTimer();
      set({
        toast: null,
        selectedBookingId: null,
        completingBookingId: null,
        bookingToDeleteId: null,
        showRescheduleWizard: false,
      });
    },
  };
});
