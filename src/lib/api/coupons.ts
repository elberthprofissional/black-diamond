import { supabase } from '../supabase';
import type { Coupon, CouponValidation, RedeemedCoupon, RedeemResult } from '../../types';

/**
 * Lista cupons disponíveis para o cliente (vitrine do /cliente).
 *
 * Usa RPC SECURITY DEFINER (`get_available_coupons`) porque a tabela `coupons`
 * tem RLS admin-only — SELECT direto volta vazio para o anon.
 */
export const getAvailableCoupons = async (): Promise<Coupon[]> => {
  const { data, error } = await supabase.rpc('get_available_coupons');
  if (error) throw error;
  return (data || []) as Coupon[];
};

/** Busca todos os cupons (admin). */
export const getCoupons = async (): Promise<Coupon[]> => {
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as Coupon[];
};

/** Cria um cupom. */
export const createCoupon = async (
  coupon: Omit<Coupon, 'id' | 'current_uses' | 'created_at'>
): Promise<Coupon> => {
  const { data, error } = await supabase
    .from('coupons')
    .insert({
      code: coupon.code.toUpperCase().trim(),
      description: coupon.description,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      valid_from: coupon.valid_from,
      valid_until: coupon.valid_until,
      max_uses: coupon.max_uses,
      is_active: coupon.is_active,
      applicable_service_ids: coupon.applicable_service_ids,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Coupon;
};

/** Atualiza um cupom. */
export const updateCoupon = async (
  id: string,
  updates: Partial<Omit<Coupon, 'id' | 'created_at'>>
): Promise<void> => {
  const payload: Record<string, unknown> = { ...updates };
  if (payload.code) payload.code = (payload.code as string).toUpperCase().trim();
  const { error } = await supabase.from('coupons').update(payload).eq('id', id);
  if (error) throw error;
};

/** Deleta um cupom. */
export const deleteCoupon = async (id: string): Promise<void> => {
  const { error } = await supabase.from('coupons').delete().eq('id', id);
  if (error) throw error;
};

/** Valida um cupom via RPC server-side. */
export const validateCoupon = async (
  code: string,
  serviceIds: string[]
): Promise<CouponValidation> => {
  const { data, error } = await supabase.rpc('validate_coupon', {
    p_code: code,
    p_service_ids: serviceIds,
  });
  if (error) {
    return { valid: false, error: 'Erro ao validar cupom.' };
  }
  return data as CouponValidation;
};

/** Aplica um cupom (incrementa usage count). Chamado após booking criado. */
export const applyCoupon = async (couponId: string): Promise<void> => {
  const { error } = await supabase.rpc('apply_coupon', {
    p_coupon_id: couponId,
  });
  if (error) throw error;
};

/** Resgata um cupom pelo cliente (1 clique na vitrine — RPC server-side). */
export const resgatarCupom = async (phone: string, code: string): Promise<RedeemResult> => {
  const { data, error } = await supabase.rpc('resgatar_cupom', {
    p_phone: phone,
    p_code: code,
  });
  if (error) throw error;
  return (data || { ok: false, message: 'Erro ao resgatar cupom.' }) as RedeemResult;
};

/** Lista os cupons resgatados do cliente (RPC server-side). */
export const getClientCoupons = async (phone: string): Promise<RedeemedCoupon[]> => {
  const { data, error } = await supabase.rpc('get_client_coupons', {
    p_phone: phone,
  });
  if (error) throw error;
  return (data || []) as RedeemedCoupon[];
};

/** Marca um cupom resgatado como usado após o agendamento ser criado. */
export const usarCupomResgatado = async (phone: string, couponId: string): Promise<void> => {
  await supabase.rpc('usar_cupom_resgatado', {
    p_phone: phone,
    p_coupon_id: couponId,
  });
};
