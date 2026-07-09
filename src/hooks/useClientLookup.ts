import { useState, useEffect, useCallback, useRef } from 'react';
import { getClientByPhone, getLastBookingByPhone } from '../lib/api';
import type { Service } from '../types';

/**
 * Busca cliente por telefone, detecta mensalista, auto-preenche nome e busca último agendamento.
 * Ativo apenas quando o telefone tem 11+ dígitos.
 * Usa debounce de 500ms para evitar consultas excessivas.
 */
export function useClientLookup(phone: string, onNameFound?: (name: string) => void) {
  const [isMensalista, setIsMensalista] = useState(false);
  const [mensalistaPlanId, setMensalistaPlanId] = useState<string | null>(null);
  const [clientLookupLoading, setClientLookupLoading] = useState(false);
  const [lastBooking, setLastBooking] = useState<{
    serviceIds: string[];
    totalPrice: number;
  } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const digits = phone.replace(/\D/g, '');
    if (digits.length < 11) {
      setIsMensalista(false);
      setMensalistaPlanId(null);
      setClientLookupLoading(false);
      setLastBooking(null);
      return;
    }

    setClientLookupLoading(true);
    let cancelled = false;

    debounceRef.current = setTimeout(() => {
      Promise.all([getClientByPhone(digits), getLastBookingByPhone(digits)])
        .then(([client, lastBooking]) => {
          if (cancelled) return;
          setIsMensalista(!!client?.is_mensalista);
          setMensalistaPlanId(client?.mensalista_plan_id || null);
          if (lastBooking) {
            setLastBooking({
              serviceIds: lastBooking.service_ids,
              totalPrice: lastBooking.total_price,
            });
          } else {
            setLastBooking(null);
          }
          if (client?.name && onNameFound) {
            onNameFound(client.name);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setIsMensalista(false);
            setMensalistaPlanId(null);
            setLastBooking(null);
          }
        })
        .finally(() => {
          if (!cancelled) setClientLookupLoading(false);
        });
    }, 500);

    return () => {
      cancelled = true;
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [phone, onNameFound]);

  const resetMensalista = useCallback(() => {
    setIsMensalista(false);
    setMensalistaPlanId(null);
    setLastBooking(null);
  }, []);

  return { isMensalista, mensalistaPlanId, clientLookupLoading, resetMensalista, lastBooking };
}
