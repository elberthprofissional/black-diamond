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
  barber_id?: string | null;
  service_ids: string[];
  booking_date: string;
  booking_time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  total_price: number;
  total_duration: number;
  is_blocked?: boolean;
  no_show?: boolean;
  coupon_id?: string | null;
  discount_amount?: number;
  reminder_sent?: boolean;
  notes?: string;
  stats_preserved?: boolean;
  google_event_id?: string | null;
  created_at: string;
  clients?: {
    name: string;
    phone: string;
  } | null;
  barbers?: {
    name: string;
    phone?: string;
    photo_url?: string;
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
  duration_days: number;
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
  created_at: string;
}

export interface Coupon {
  id: string;
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed' | 'free';
  discount_value: number;
  valid_from: string;
  valid_until: string | null;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  applicable_service_ids: string[];
  created_at: string;
}

export interface LoyaltyMilestone {
  id: string;
  visits_required: number;
  reward_service_id: string;
  is_active: boolean;
  created_at: string;
}

// Progresso de um cliente em relação a uma milestone
export interface MilestoneProgress {
  milestone: LoyaltyMilestone;
  progress: number; // visitas atuais do cliente
  already_claimed: boolean;
}

export interface Testimonial {
  id: string;
  name: string;
  rating: number;
  text: string;
  is_active: boolean;
  sort_order: number;
  publish_time?: string | null;
  source?: string;
  created_at: string;
}

export interface CouponValidation {
  valid: boolean;
  coupon_id?: string;
  code?: string;
  discount_type?: string;
  discount_value?: number;
  discount_amount?: number;
  original_price?: number;
  error?: string;
}

export interface Barber {
  id: string;
  user_id?: string;
  name: string;
  phone?: string;
  photo_url?: string;
  bio?: string;
  quote?: string;
  is_hidden?: boolean;
  is_active: boolean;
  is_owner: boolean;
  sort_order: number;
  created_at: string;
  /** Dias de trabalho por barbeiro ({ '0': boolean, ..., '6': boolean }). */
  working_days?: Record<string, boolean> | null;
  /** Horário próprio do barbeiro; null/ausente = horário padrão da barbearia. */
  barber_hours?: Record<string, unknown> | null;
}

export interface WhatsAppTemplate {
  id: string;
  key: string;
  name: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  tag: string | null;
  url: string | null;
  read: boolean;
  created_at: string;
}

export interface GalleryImage {
  id: string;
  image_url: string;
  alt: string;
  position: number;
  created_at?: string;
}
