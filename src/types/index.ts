export interface Service {
  id: string;
  name: string;
  price: number;
  duration: number; // in minutes
  description?: string;
}

export interface Booking {
  id: string;
  client_id: string;
  service_ids: string[];
  booking_date: string;
  booking_time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  total_price: number;
  total_duration: number;
  is_blocked?: boolean;
  notes?: string;
  created_at: string;
  clients?: {
    name: string;
    phone: string;
  };
}

export interface BookingWithClient extends Booking {
  clients: {
    name: string;
    phone: string;
  };
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  created_at: string;
}

export interface ClientWithStats extends Client {
  lastVisit: string;
  totalSpent: number;
  bookingsCount: number;
  upcomingBooking?: { date: string; time: string } | null;
}

export interface Review {
  id: string;
  booking_id: string;
  client_id: string;
  rating: number;
  comment?: string;
  created_at: string;
}

export interface ReviewWithClient extends Review {
  client_name: string;
}

