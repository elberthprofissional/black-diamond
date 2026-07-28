import { useState, useEffect, useRef } from 'react';
import { getClientByPhone, getLastBookingByPhone, getMensalistaPlanName } from '../lib/api';

/**
 * Busca cliente por telefone, detecta mensalista, auto-preenche nome e busca último agendamento.
 * Ativo apenas quando o telefone tem 11+ dígitos.
 * Usa debounce de 500ms para evitar consultas excessivas.
 */
export function useClientLookup(phone: string, onNameFound?: (name: string) => void) {
  const [isMensalista, setIsMensalista] = useState(false);
  const [mensalistaPlanId, setMensalistaPlanId] = useState<string | null>(null);
  const [planName, setPlanName] = useState<string | undefined>(undefined);
  const [clientLookupLoading, setClientLookupLoading] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsMensalista(false);

      setMensalistaPlanId(null);

      setClientLookupLoading(false);

      setLastBooking(null);
      return;
    }

    setClientLookupLoading(true);
    let cancelled = false;

    debounceRef.current = setTimeout(async () => {
      try {
        const [client, lastBookingData] = await Promise.all([
          getClientByPhone(digits),
          getLastBookingByPhone(digits),
        ]);
        if (cancelled) return;

        setIsMensalista(!!client?.is_mensalista);
        setMensalistaPlanId(client?.mensalista_plan_id || null);
        setClientId(client?.id || null);

        // Fetch plan name if mensalista
        if (client?.mensalista_plan_id) {
          const name = await getMensalistaPlanName(client.mensalista_plan_id);
          if (!cancelled) setPlanName(name || undefined);
        } else {
          setPlanName(undefined);
        }

        if (lastBookingData) {
          setLastBooking({
            serviceIds: lastBookingData.service_ids,
            totalPrice: lastBookingData.total_price,
          });
        } else {
          setLastBooking(null);
        }
        if (client?.name && onNameFound) {
          onNameFound(client.name);
        }
      } catch {
        if (!cancelled) {
          setIsMensalista(false);
          setMensalistaPlanId(null);
          setPlanName(undefined);
          setLastBooking(null);
        }
      } finally {
        if (!cancelled) setClientLookupLoading(false);
      }
    }, 500);

    return () => {
      cancelled = true;
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [phone, onNameFound]);

  return {
    isMensalista,
    mensalistaPlanId,
    planName,
    clientLookupLoading,
    clientId,
    lastBooking,
  };
}
