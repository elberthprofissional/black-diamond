export interface BookingEntry {
  id: string;
  booking_date: string;
  booking_time: string;
  status: string;
  total_price: number;
  total_duration: number;
  service_ids: string[];
  clients: { name: string; phone: string };
  token?: string;
}

export interface ClientStats {
  total_visits: number;
  total_spent: number;
  last_visit: string | null;
}

export interface MensalistaInfo {
  planName: string;
  services: string[];
  expiresAt: string | null;
  daysLeft: number;
}

export type Step = 'phone' | 'dashboard';
