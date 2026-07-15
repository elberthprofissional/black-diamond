/**
 * Utility compartilhada pra envio de mensagens WhatsApp.
 * Centraliza formatação de telefone, construção de mensagem e abertura de janela.
 */

/** Limpa telefone pra formato WhatsApp (só dígitos, com código do país) */
export function cleanPhoneForWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  // Se já começa com 55 (Brasil), mantém. Senão, adiciona.
  return digits.startsWith('55') ? digits : `55${digits}`;
}

/** Constrói URL do WhatsApp com mensagem encoded */
export function buildWhatsAppUrl(phone: string, message: string): string {
  const cleanPhone = cleanPhoneForWhatsApp(phone);
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

/** Abre WhatsApp em nova janela (best-effort) */
export function openWhatsApp(phone: string, message: string): void {
  try {
    const url = buildWhatsAppUrl(phone, message);
    window.open(url, '_blank');
  } catch {
    // WhatsApp opening is best-effort — popup blockers, etc.
  }
}

/** Formata data pra exibição em mensagem (DD/MM/AAAA) */
export function formatWaDate(dateStr: string): string {
  return dateStr.split('-').reverse().join('/');
}

/** Formata hora pra exibição (HH:MM) */
export function formatWaTime(timeStr: string): string {
  return timeStr.slice(0, 5);
}

/** Formata valor em Real (R$ XX,XX) */
export function formatWaCurrency(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}
