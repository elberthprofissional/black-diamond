// Camada de acesso a dados. Nome, assinatura e RLS seguem as migrações;
// nunca busca dados que o banco não autorizou.

import { supabase, BUSINESS_TZ } from "../lib/supabase";
import type {
  Appointment,
  AppointmentWithRelations,
  Barbershop,
  BarberHour,
  BlockedTime,
  BookResult,
  BusinessHour,
  CancelResult,
  Client,
  ClientAppointment,
  Coupon,
  CouponValidation,
  GalleryItem,
  Member,
  Membership,
  RescheduleResult,
  Service,
  Slot,
} from "../types";

export type { BookResult };

export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiError";
  }
}

/** Traduz erros do Supabase/PostgREST para mensagens compreensíveis. */
export function toErrorMessage(err: unknown): string {
  const e = err as { code?: string; message?: string; details?: string } | undefined;
  if (!e) return "Ocorreu um erro inesperado. Tente novamente.";

  if (e.code === "PGRST301") return "Sua sessão expirou. Faça login novamente.";
  if (e.code === "P0001" && e.message) return e.message;
  if (/fetch|network|connection|failed/i.test(e.message ?? ""))
    return "Não foi possível conectar ao servidor. Verifique sua internet e tente de novo.";

  return e.message || "Ocorreu um erro inesperado. Tente novamente.";
}

export function requireData<T>(data: T | null, errorMsg = "Dados não encontrados."): T {
  if (data === null || data === undefined) throw new ApiError(errorMsg);
  return data;
}

// =====================================================================
// PÚBLICO — agendamento sem conta
// =====================================================================

export interface PublicShop {
  barbershop: Barbershop;
  services: Service[];
  barbers: Member[];
}

export async function fetchPublicShop(slug: string): Promise<PublicShop> {
  const [shopRes, servicesRes, barbersRes] = await Promise.all([
    supabase.from("barbershops").select("*").eq("slug", slug).maybeSingle(),
    supabase
      .from("services")
      .select("*")
      .eq("barbershop_id", (await resolveShopId(slug)))
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("members")
.select("id, barbershop_id, user_id, role, is_active, full_name, bio, avatar_url")
      .eq("is_active", true)
      .order("full_name"),
  ]);

  if (shopRes.error) throw shopRes.error;
  if (!shopRes.data) throw new ApiError("Barbearia não encontrada.");

  const shop = shopRes.data as Barbershop;
  const services = (servicesRes.data ?? []) as Service[];
  const barbers = ((barbersRes.data ?? []) as Member[]).filter(
    (m) => m.barbershop_id === shop.id && (m.role === "barber" || m.role === "owner")
  );

  return { barbershop: shop, services, barbers };
}

async function resolveShopId(slug: string): Promise<string> {
  const { data } = await supabase
    .from("barbershops")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? "";
}

export async function fetchAvailableSlots(
  barbershopId: string,
  serviceId: string,
  memberId: string,
  date: string
): Promise<string[]> {
  const { data, error } = await supabase.rpc("get_available_slots", {
    p_barbershop_id: barbershopId,
    p_service_id: serviceId,
    p_member_id: memberId,
    p_date: date,
    p_timezone: BUSINESS_TZ,
  });
  if (error) throw error;
  return ((data as Slot[] | null) ?? []).map((s) => s.start_at);
}

export async function bookAppointment(input: {
  barbershopId: string;
  serviceId: string;
  memberId: string;
  startAt: string;
  clientName: string;
  clientWhatsapp: string;
  couponCode?: string | null;
}): Promise<BookResult> {
  const { data, error } = await supabase.rpc("book_appointment", {
    p_barbershop_id: input.barbershopId,
    p_service_id: input.serviceId,
    p_member_id: input.memberId,
    p_start_at: input.startAt,
    p_client_name: input.clientName,
    p_client_whatsapp: input.clientWhatsapp,
    p_timezone: BUSINESS_TZ,
    p_coupon_code: input.couponCode ?? null,
  });
  if (error) throw error;
  return requireData(data as BookResult | null, "Não foi possível concluir o agendamento.");
}

/** Valida um cupom para a barbearia (uso público). */
export async function checkCoupon(
  shopId: string,
  code: string
): Promise<CouponValidation | null> {
  const { data, error } = await supabase.rpc("get_coupon_validity", {
    p_barbershop_id: shopId,
    p_code: code,
  });
  if (error) throw error;
  return data as CouponValidation | null;
}

/** Último serviço agendado (passado e não cancelado) do cliente — para o "repetir" na página pública. */
export async function getClientLastService(
  shopId: string,
  whatsapp: string
): Promise<{ serviceId: string; serviceName: string; price: number; durationMinutes: number } | null> {
  const { data, error } = await supabase.rpc("get_client_last_service", {
    p_barbershop_id: shopId,
    p_phone: whatsapp,
  });
  if (error) throw error;
  const row = data as
    | { service_id: string; service_name: string; price: number; duration_minutes: number }
    | null;
  if (!row) return null;
  return {
    serviceId: row.service_id,
    serviceName: row.service_name,
    price: row.price,
    durationMinutes: row.duration_minutes,
  };
}

/** Cancelar/Reagendar: agenda futura do cliente identificado por nome + WhatsApp. */
export async function getClientAppointments(
  shopId: string,
  clientName: string,
  clientWhatsapp: string
): Promise<ClientAppointment[]> {
  const { data, error } = await supabase.rpc("get_client_appointments", {
    p_barbershop_id: shopId,
    p_client_name: clientName,
    p_client_whatsapp: clientWhatsapp,
    p_timezone: BUSINESS_TZ,
  });
  if (error) throw error;
  return (data ?? []) as ClientAppointment[];
}

export async function cancelAppointment(
  shopId: string,
  appointmentId: string,
  clientName: string,
  clientWhatsapp: string
): Promise<CancelResult> {
  const { data, error } = await supabase.rpc("cancel_appointment", {
    p_barbershop_id: shopId,
    p_appointment_id: appointmentId,
    p_client_name: clientName,
    p_client_whatsapp: clientWhatsapp,
    p_timezone: BUSINESS_TZ,
  });
  if (error) throw error;
  return requireData(data as CancelResult | null, "Não foi possível cancelar o agendamento.");
}

export async function rescheduleAppointment(
  shopId: string,
  appointmentId: string,
  clientName: string,
  clientWhatsapp: string,
  newStartAt: string
): Promise<RescheduleResult> {
  const { data, error } = await supabase.rpc("reschedule_appointment", {
    p_barbershop_id: shopId,
    p_appointment_id: appointmentId,
    p_client_name: clientName,
    p_client_whatsapp: clientWhatsapp,
    p_new_start_at: newStartAt,
    p_timezone: BUSINESS_TZ,
  });
  if (error) throw error;
  return requireData(data as RescheduleResult | null, "Não foi possível trocar o horário.");
}

// =====================================================================
// AGENDAMENTOS
// =====================================================================

export async function fetchAppointments(
  shopId: string,
  from: string,
  to: string
): Promise<AppointmentWithRelations[]> {
  const { data, error } = await supabase
    .from("appointments")
    .select("*, service:service_id(*), member:member_id(*)")
    .eq("barbershop_id", shopId)
    .gte("start_at", from)
    .lt("start_at", to)
    .order("start_at");
  if (error) throw error;
  return (data ?? []) as AppointmentWithRelations[];
}

export async function fetchAppointmentsByMember(
  memberId: string,
  shopId: string,
  from: string,
  to: string
): Promise<AppointmentWithRelations[]> {
  const { data, error } = await supabase
    .from("appointments")
    .select("*, service:service_id(*), member:member_id(*)")
    .eq("barbershop_id", shopId)
    .eq("member_id", memberId)
    .gte("start_at", from)
    .lt("start_at", to)
    .order("start_at");
  if (error) throw error;
  return (data ?? []) as AppointmentWithRelations[];
}

export async function updateAppointmentStatus(
  id: string,
  status: Appointment["status"]
): Promise<void> {
  const { error } = await supabase
    .from("appointments")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}

// =====================================================================
// SERVIÇOS (OWNER)
// =====================================================================

export async function listServices(shopId: string): Promise<Service[]> {
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("barbershop_id", shopId)
    .order("name");
  if (error) throw error;
  return (data ?? []) as Service[];
}

export async function createService(
  shopId: string,
  input: Pick<Service, "name" | "description" | "price" | "duration_minutes">
): Promise<Service> {
  const { data, error } = await supabase
    .from("services")
    .insert({ ...input, barbershop_id: shopId, is_active: true })
    .select("*")
    .single();
  if (error) throw error;
  return requireData(data as Service | null);
}

export async function updateService(
  id: string,
  patch: Partial<Pick<Service, "name" | "description" | "price" | "duration_minutes" | "is_active">>
): Promise<void> {
  const { error } = await supabase.from("services").update(patch).eq("id", id);
  if (error) throw error;
}

// =====================================================================
// EQUIPE (OWNER) + MEMBRO
// =====================================================================

export async function listMembers(shopId: string): Promise<Member[]> {
  const { data, error } = await supabase
    .from("members")
    .select("*")
    .eq("barbershop_id", shopId)
    .order("role")
    .order("full_name");
  if (error) throw error;
  return (data ?? []) as Member[];
}

/** SUPERADMIN: todos os membros do sistema. */
export async function listAllMembers(): Promise<Member[]> {
  const { data, error } = await supabase
    .from("members")
    .select("id, barbershop_id, user_id, role, is_active, full_name, bio, avatar_url")
    .order("full_name");
  if (error) throw error;
  return (data ?? []) as Member[];
}

export async function inviteMember(input: {
  shopId: string;
  name: string;
  email: string;
  role: "owner" | "barber";
  tempPassword: string;
  bio?: string | null;
}): Promise<string> {
  const { data, error } = await supabase.rpc("admin_invite_member", {
    p_barbershop_id: input.shopId,
    p_name: input.name,
    p_email: input.email,
    p_role: input.role,
    p_temp_password: input.tempPassword,
    p_bio: input.bio ?? null,
  });
  if (error) throw error;
  return requireData(data as string | null);
}

export async function updateMember(
  id: string,
  patch: Partial<
    Pick<Member, "full_name" | "bio" | "avatar_url" | "is_active" | "role">
  >
): Promise<void> {
  const { error } = await supabase.from("members").update(patch).eq("id", id);
  if (error) throw error;
}

export async function replaceBarberHours(
  memberId: string,
  shopId: string,
  rows: Omit<BarberHour, "id" | "member_id" | "barbershop_id">[]
): Promise<void> {
  const { error: delErr } = await supabase
    .from("barber_hours")
    .delete()
    .eq("member_id", memberId);
  if (delErr) throw delErr;

  if (rows.length === 0) return;

  const { error: insErr } = await supabase.from("barber_hours").insert(
    rows.map((r) => ({ ...r, member_id: memberId, barbershop_id: shopId }))
  );
  if (insErr) throw insErr;
}

export async function listBarberHours(memberId: string): Promise<BarberHour[]> {
  const { data, error } = await supabase
    .from("barber_hours")
    .select("*")
    .eq("member_id", memberId);
  if (error) throw error;
  return (data ?? []) as BarberHour[];
}

// =====================================================================
// BLOQUEIOS
// =====================================================================

export async function listBlockedTimes(shopId: string): Promise<BlockedTime[]> {
  const { data, error } = await supabase
    .from("blocked_times")
    .select("*")
    .eq("barbershop_id", shopId)
    .order("start_at");
  if (error) throw error;
  return (data ?? []) as BlockedTime[];
}

export async function createBlockedTime(input: {
  shopId: string;
  memberId: string | null;
  startAt: string;
  endAt: string;
  reason?: string;
}): Promise<void> {
  const { error } = await supabase.from("blocked_times").insert({
    barbershop_id: input.shopId,
    member_id: input.memberId,
    start_at: input.startAt,
    end_at: input.endAt,
    reason: input.reason ?? null,
  });
  if (error) throw error;
}

export async function deleteBlockedTime(id: string): Promise<void> {
  const { error } = await supabase.from("blocked_times").delete().eq("id", id);
  if (error) throw error;
}

// =====================================================================
// CLIENTES
// =====================================================================

export async function listClients(shopId: string): Promise<Client[]> {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("barbershop_id", shopId)
    .order("name");
  if (error) throw error;
  return (data ?? []) as Client[];
}

export async function createClient(
  shopId: string,
  name: string,
  whatsapp: string
): Promise<Client> {
  const { data, error } = await supabase
    .from("clients")
    .insert({
      barbershop_id: shopId,
      name: name.trim(),
      whatsapp: whatsapp.replace(/\D/g, ""),
      is_manual: true,
    })
    .select("*")
    .single();
  if (error) throw error;
  return requireData(data as Client | null);
}

// =====================================================================
// CONFIGURAÇÃO DA BARBEARIA (OWNER/Superadmin)
// =====================================================================

export async function fetchShop(shopId: string): Promise<Barbershop> {
  const { data, error } = await supabase
    .from("barbershops")
    .select("*")
    .eq("id", shopId)
    .maybeSingle();
  if (error) throw error;
  return requireData(data as Barbershop | null);
}

export async function updateShop(
  shopId: string,
  patch: Partial<Barbershop>
): Promise<void> {
  const { error } = await supabase
    .from("barbershops")
    .update({
      name: patch.name,
      slug: patch.slug,
      description: patch.description,
      about: patch.about,
      address: patch.address,
      phone: patch.phone,
      whatsapp: patch.whatsapp,
      instagram: patch.instagram,
      logo_url: patch.logo_url,
      hero_image_url: patch.hero_image_url,
      primary_color: patch.primary_color,
      settings: patch.settings,
    })
    .eq("id", shopId);
  if (error) throw error;
}

export async function listBusinessHours(shopId: string): Promise<BusinessHour[]> {
  const { data, error } = await supabase
    .from("business_hours")
    .select("*")
    .eq("barbershop_id", shopId)
    .order("weekday");
  if (error) throw error;
  return (data ?? []) as BusinessHour[];
}

export async function replaceBusinessHours(
  shopId: string,
  rows: Omit<BusinessHour, "id" | "barbershop_id">[]
): Promise<void> {
  const { error: delErr } = await supabase
    .from("business_hours")
    .delete()
    .eq("barbershop_id", shopId);
  if (delErr) throw delErr;

  if (rows.length === 0) return;

  const { error: insErr } = await supabase
    .from("business_hours")
    .insert(rows.map((r) => ({ ...r, barbershop_id: shopId })));
  if (insErr) throw insErr;
}

// =====================================================================
// GALERIA (OWNER/Superadmin) — fotos dos cortes na página inicial
// =====================================================================

export async function listGallery(shopId: string): Promise<GalleryItem[]> {
  const { data, error } = await supabase
    .from("gallery_items")
    .select("*")
    .eq("barbershop_id", shopId)
    .order("position");
  if (error) throw error;
  return (data ?? []) as GalleryItem[];
}

export async function createGalleryItem(input: {
  shopId: string;
  imageUrl?: string | null;
  caption?: string | null;
  position?: number;
}): Promise<GalleryItem> {
  const { data, error } = await supabase
    .from("gallery_items")
    .insert({
      barbershop_id: input.shopId,
      image_url: input.imageUrl ?? null,
      caption: input.caption ?? null,
      position: input.position ?? 0,
    })
    .select("*")
    .single();
  if (error) throw error;
  return requireData(data as GalleryItem | null);
}

export async function updateGalleryItem(
  id: string,
  patch: Partial<Pick<GalleryItem, "image_url" | "caption" | "position" | "is_active">>
): Promise<void> {
  const { error } = await supabase.from("gallery_items").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteGalleryItem(id: string): Promise<void> {
  const { error } = await supabase.from("gallery_items").delete().eq("id", id);
  if (error) throw error;
}

// =====================================================================
// CUPONS (OWNER/Superadmin)
// =====================================================================

export async function listCoupons(shopId: string): Promise<Coupon[]> {
  const { data, error } = await supabase
    .from("coupons")
    .select("*")
    .eq("barbershop_id", shopId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Coupon[];
}

export async function createCoupon(input: {
  shopId: string;
  code: string;
  title?: string | null;
  discountType: Coupon["discount_type"];
  discountValue: number;
  maxUses: number;
  expiresAt?: string | null;
}): Promise<Coupon> {
  const { data, error } = await supabase
    .from("coupons")
    .insert({
      barbershop_id: input.shopId,
      code: input.code.trim().toUpperCase(),
      title: input.title?.trim() || null,
      discount_type: input.discountType,
      discount_value: input.discountValue,
      max_uses: input.maxUses,
      expires_at: input.expiresAt ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return requireData(data as Coupon | null);
}

export async function updateCoupon(
  id: string,
  patch: Partial<Pick<Coupon, "code" | "title" | "discount_type" | "discount_value" | "max_uses" | "expires_at" | "is_active">>
): Promise<void> {
  const { error } = await supabase.from("coupons").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteCoupon(id: string): Promise<void> {
  const { error } = await supabase.from("coupons").delete().eq("id", id);
  if (error) throw error;
}

// =====================================================================
// SISTEMA (SUPERADMIN)
// =====================================================================

export async function listAllShops(): Promise<Barbershop[]> {
  const { data, error } = await supabase
    .from("barbershops")
    .select("*")
    .order("name");
  if (error) throw error;
  return (data ?? []) as Barbershop[];
}

export async function createShop(input: {
  name: string;
  slug: string;
  description?: string;
  whatsapp?: string;
  primary_color?: string;
}): Promise<Barbershop> {
  const { data, error } = await supabase
    .from("barbershops")
    .insert({
      name: input.name,
      slug: input.slug,
      description: input.description ?? null,
      whatsapp: input.whatsapp ?? null,
      primary_color: input.primary_color ?? "#c2a878",
      is_active: true,
      settings: {},
    })
    .select("*")
    .single();
  if (error) throw error;
  return requireData(data as Barbershop | null);
}

export async function setShopActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from("barbershops")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) throw error;
}

export interface SystemStats {
  shops: number;
  members: number;
  appointments: number;
  clients: number;
}

export async function fetchSystemStats(): Promise<SystemStats> {
  const [{ count: shops }, { count: members }, { count: appointments }, { count: clients }] =
    await Promise.all([
      supabase.from("barbershops").select("*", { count: "exact", head: true }),
      supabase.from("members").select("*", { count: "exact", head: true }),
      supabase.from("appointments").select("*", { count: "exact", head: true }),
      supabase.from("clients").select("*", { count: "exact", head: true }),
    ]);
  return {
    shops: shops ?? 0,
    members: members ?? 0,
    appointments: appointments ?? 0,
    clients: clients ?? 0,
  };
}

export { getMemberships };
async function getMemberships(): Promise<Membership[]> {
  const { data, error } = await supabase.rpc("get_my_memberships");
  if (error) throw error;
  return (data ?? []) as Membership[];
}