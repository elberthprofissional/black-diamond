import { useState, useEffect, useCallback, useRef } from 'react';
import { getClientByPhone } from '../lib/api';

/**
 * Busca cliente por telefone, detecta mensalista e auto-preenche nome.
 * Ativo apenas quando o telefone tem 11+ dígitos.
 * Usa debounce de 500ms para evitar consultas excessivas.
 */
export function useClientLookup(phone: string, onNameFound?: (name: string) => void) {
  const [isMensalista, setIsMensalista] = useState(false);
  const [clientLookupLoading, setClientLookupLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const digits = phone.replace(/\D/g, '');
    if (digits.length < 11) {
      setIsMensalista(false);
      setClientLookupLoading(false);
      return;
    }

    setClientLookupLoading(true);
    let cancelled = false;

    debounceRef.current = setTimeout(() => {
      getClientByPhone(digits)
        .then((client) => {
          if (cancelled) return;
          setIsMensalista(!!client?.is_mensalista);
          if (client?.name && onNameFound) {
            onNameFound(client.name);
          }
        })
        .catch(() => {
          if (!cancelled) setIsMensalista(false);
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

  const resetMensalista = useCallback(() => setIsMensalista(false), []);

  return { isMensalista, clientLookupLoading, resetMensalista };
}
