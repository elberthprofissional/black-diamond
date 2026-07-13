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
  no_show?: boolean;
  coupon_id?: string | null;
  discount_amount?: number;
  reminder_sent?: boolean;
  notes?: string;
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
  _isNoShowBlocked?: boolean;
}

export interface ClientWithStats extends Client {
  lastVisit: string;
  lastVisitDate: Date | null;
  totalSpent: number;
  bookingsCount: number;
  upcomingBooking?: { date: string; time: string } | null;
  isInactive: boolean;
  isNoShowBlocked?: boolean;
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

export interface ClientMilestone {
  id: string;
  client_id: string;
  milestone_id: string;
  claimed_at: string;
}

// Progresso de um cliente em relação a uma milestone
export interface MilestoneProgress {
  milestone: LoyaltyMilestone;
  progress: number; // visitas atuais do cliente
  already_claimed: boolean;
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
