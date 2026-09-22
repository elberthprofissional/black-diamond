// Tipos de domínio do BLACK DIAMOND — espelham o schema PostgreSQL.

export type AppointmentStatus =
  | "agendado"
  | "confirmado"
  | "em_atendimento"
  | "concluido"
  | "cancelado"
  | "faltou";

export type MemberRole = "owner" | "barber";

export type EffectiveRole = "superadmin" | MemberRole;

export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  is_superadmin: boolean;
  created_at: string;
  updated_at: string;
}

export interface BarbershopSettings {
  show_address: boolean;
  show_instagram: boolean;
  show_whatsapp: boolean;
  show_credits: boolean;
  credits_text: string;
  barberflow_branding: boolean;
}

export interface Barbershop {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  about: string | null;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  logo_url: string | null;
  hero_image_url: string | null;
  primary_color: string;
  is_active: boolean;
  settings: BarbershopSettings;
  created_at: string;
  updated_at: string;
}

export interface Member {
  id: string;
  barbershop_id: string;
  user_id: string | null;
  role: MemberRole;
  is_active: boolean;
  full_name: string;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  barbershop_id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BusinessHour {
  id: string;
  barbershop_id: string;
  weekday: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

export interface GalleryItem {
  id: string;
  barbershop_id: string;
  image_url: string | null;
  caption: string | null;
  position: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BarberHour {
  id: string;
  member_id: string;
  barbershop_id: string;
  weekday: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

export interface BlockedTime {
  id: string;
  barbershop_id: string;
  member_id: string | null;
  start_at: string;
  end_at: string;
  reason: string | null;
  created_at: string;
}

export interface Client {
  id: string;
  barbershop_id: string;
  name: string;
  whatsapp: string;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  barbershop_id: string;
  service_id: string;
  member_id: string;
  client_id: string | null;
  client_name: string;
  client_whatsapp: string;
  start_at: string;
  end_at: string;
  status: AppointmentStatus;
  price: number;
  coupon_id: string | null;
  discount: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppointmentWithRelations extends Appointment {
  service: Service | null;
  member: Member | null;
}

export interface Membership {
  barbershop_id: string;
  barbershop_name: string;
  barbershop_slug: string;
  barbershop_active: boolean;
  role: MemberRole;
  member_id: string;
}

export interface Slot {
  start_at: string;
}

export interface BookResult {
  id: string;
  barbershop_id: string;
  service_id: string;
  service_name: string;
  service_price: number;
  duration_minutes: number;
  member_id: string;
  member_name: string;
  client_name: string;
  client_whatsapp: string;
  start_at: string;
  end_at: string;
  status: AppointmentStatus;
  coupon_id: string | null;
  discount: number;
}

export interface ClientAppointment {
  id: string;
  service_id: string;
  member_id: string;
  service_name: string;
  member_name: string;
  start_at: string;
  end_at: string;
  status: AppointmentStatus;
  price: number;
  duration_minutes: number;
}

export interface CancelResult {
  id: string;
  cancelled: boolean;
  start_at: string;
}

export interface RescheduleResult {
  id: string;
  old_id: string;
  service_id: string;
  service_name: string;
  member_id: string;
  member_name: string;
  client_name: string;
  start_at: string;
  end_at: string;
  status: AppointmentStatus;
}

export type CouponDiscountType = "fixed" | "percent";

export interface Coupon {
  id: string;
  barbershop_id: string;
  code: string;
  title: string | null;
  discount_type: CouponDiscountType;
  discount_value: number;
  max_uses: number;
  used_count: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CouponValidation {
  is_valid: boolean;
  reason?: string;
  coupon_id: string | null;
  code?: string;
  title?: string | null;
  discount_type?: CouponDiscountType;
  discount_value?: number;
  uses_left?: number;
}

export const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  "agendado",
  "confirmado",
  "em_atendimento",
  "concluido",
  "cancelado",
  "faltou",
];

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  agendado: "Agendado",
  confirmado: "Confirmado",
  em_atendimento: "Em atendimento",
  concluido: "Concluído",
  cancelado: "Cancelado",
  faltou: "Faltou",
};