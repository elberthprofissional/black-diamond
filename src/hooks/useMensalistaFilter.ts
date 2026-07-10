import { useMemo, useEffect } from 'react';
import type { Service, MensalistaPlan } from '../types';
import { MENSALISTA_EXCLUDED_SERVICES } from '../lib/constants';

interface UseMensalistaFilterParams {
  isMensalista: boolean;
  currentPlan: MensalistaPlan | null;
  allServices: Service[];
  selectedServices: Service[];
  onServicesChange: (services: Service[]) => void;
}

interface UseMensalistaFilterReturn {
  filteredServices: Service[];
  filterDaysForMensalista: <T extends { fullDate: string }>(days: T[]) => T[];
}

/**
 * Hook compartilhado pra filtrar serviços e dias quando o cliente é mensalista.
 * Usado tanto pelo booking público (useBookingWizard) quanto pelo admin (AdminBooking).
 */
export function useMensalistaFilter({
  isMensalista,
  currentPlan,
  allServices,
  selectedServices,
  onServicesChange,
}: UseMensalistaFilterParams): UseMensalistaFilterReturn {
  // Filtra serviços: mensalista não vê os serviços inclusos no plano
  const filteredServices = useMemo(() => {
    if (!isMensalista) return allServices;

    if (currentPlan && currentPlan.included_service_ids?.length > 0) {
      return allServices.filter((s) => !currentPlan.included_service_ids.includes(s.id));
    }

    return allServices.filter((s) => !MENSALISTA_EXCLUDED_SERVICES.includes(s.name));
  }, [allServices, isMensalista, currentPlan]);

  // Filtra dias: mensalista só pode agendar Seg-Qui
  const filterDaysForMensalista = useMemo(() => {
    return <T extends { fullDate: string }>(days: T[]): T[] => {
      if (!isMensalista) return days;
      return days.filter((d) => {
        const dow = new Date(d.fullDate + 'T12:00:00').getDay();
        return dow >= 1 && dow <= 4;
      });
    };
  }, [isMensalista]);

  // Reseta serviços selecionados quando status de mensalista muda
  useEffect(() => {
    if (!isMensalista || selectedServices.length === 0) return;

    let allowed: Service[];
    if (currentPlan && currentPlan.included_service_ids?.length > 0) {
      allowed = selectedServices.filter((s) => !currentPlan.included_service_ids.includes(s.id));
    } else {
      allowed = selectedServices.filter((s) => !MENSALISTA_EXCLUDED_SERVICES.includes(s.name));
    }

    if (allowed.length !== selectedServices.length) {
      onServicesChange(allowed);
    }
  }, [isMensalista, currentPlan, selectedServices, onServicesChange]);

  return { filteredServices, filterDaysForMensalista };
}
