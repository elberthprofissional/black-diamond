export interface Barber {
  id: string;
  name: string;
  phone?: string;
  photo_url?: string;
  commission: number;
  working_days: Record<string, { enabled: boolean; open?: string; close?: string }>;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

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
  reminder_sent?: boolean;
  notes?: string;
  barber_id?: string | null;
  no_show?: boolean;
  created_at: string;
  clients?: {
    name: string;
    phone: string;
  } | null;
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
  is_favorite?: boolean;
  is_mensalista?: boolean;
  mensalista_plan_id?: string;
  mensalista_expires_at?: string;
  is_blocked?: boolean;
  deleted_at?: string | null;
  manually_added?: boolean;
  historical_visits?: number;
  historical_spent?: number;
  last_visit_date?: string;
  created_at: string;
}

export interface ClientWithStats extends Client {
  lastVisit: string;
  lastVisitDate: Date | null;
  totalSpent: number;
  bookingsCount: number;
  upcomingBooking?: { date: string; time: string } | null;
  isInactive: boolean;
}

export interface MensalistaPlan {
  id: string;
  name: string;
  price: number;
  included_service_ids: string[];
  allowed_days: number[];
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
  created_at: string;
}
