import { useState, useEffect, useCallback } from 'react';
import { getClientByPhone } from '../lib/api';

/**
 * Busca cliente por telefone, detecta mensalista e auto-preenche nome.
 * Ativo apenas quando o telefone tem 11+ dígitos.
 */
export function useClientLookup(phone: string, onNameFound?: (name: string) => void) {
  const [isMensalista, setIsMensalista] = useState(false);
  const [clientLookupLoading, setClientLookupLoading] = useState(false);

  useEffect(() => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 11) {
      setIsMensalista(false);
      return;
    }

    let cancelled = false;
    setClientLookupLoading(true);

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

    return () => {
      cancelled = true;
    };
  }, [phone, onNameFound]);

  const resetMensalista = useCallback(() => setIsMensalista(false), []);

  return { isMensalista, clientLookupLoading, resetMensalista };
}
