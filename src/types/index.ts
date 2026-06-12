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
  date: string; // ISO string
  time: string; // HH:mm
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  total_price: number;
  total_duration: number;
  notes?: string;
  created_at: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  created_at: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
}
