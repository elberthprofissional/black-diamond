import { create } from 'zustand';
import { getBookings, autoCompleteExpiredBookings } from '../lib/api';
import type { BookingWithClient } from '../types';

interface BookingState {
  bookings: BookingWithClient[];
  loading: boolean;
  error: Error | null;
  selectedDate: string;
  filter: 'occupied' | 'free' | 'blocked';
  setBookings: (bookings: BookingWithClient[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: Error | null) => void;
  setSelectedDate: (date: string) => void;
  setFilter: (filter: 'occupied' | 'free' | 'blocked') => void;
  fetchBookings: (date?: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export const useBookingStore = create<BookingState>((set, get) => ({
  bookings: [],
  loading: true,
  error: null,
  selectedDate: '',
  filter: 'occupied',

  setBookings: (bookings) => set({ bookings }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setSelectedDate: (date) => set({ selectedDate: date }),
  setFilter: (filter) => set({ filter }),

  fetchBookings: async (date?: string) => {
    set({ loading: true, error: null });
    try {
      const data = await getBookings(date);
      set({ bookings: (data || []) as BookingWithClient[], loading: false });

      if (date) {
        autoCompleteExpiredBookings(date)
          .then((count) => {
            if (count > 0) {
              get().fetchBookings(date);
            }
          })
          .catch(() => {});
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err : new Error('Failed to fetch bookings'),
        loading: false,
      });
    }
  },

  refetch: async () => {
    const { selectedDate } = get();
    await get().fetchBookings(selectedDate);
  },
}));
