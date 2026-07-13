import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createBooking, deleteBooking } from '../lib/api';
import { useAuditLog } from './useAuditLog';
import { useToast } from './useToast';
import type { Service, Booking } from '../types';

interface AdminBookingSubmitParams {
  selectedClient: { name: string; phone: string } | null;
  newClient: { name: string; phone: string };
  selectedServices: Service[];
  selectedDate: string;
  selectedTime: string;
  totalPrice: number;
  totalDuration: number;
  rescheduleBooking: (Booking & { clients?: { name: string; phone: string } | null }) | null;
  barberPhone: string;
}

export function useAdminBookingSubmit(params: AdminBookingSubmitParams) {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const { logBooking } = useAuditLog();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    selectedClient,
    newClient,
    selectedServices,
    selectedDate,
    selectedTime,
    totalPrice,
    totalDuration,
    rescheduleBooking,
    barberPhone,
  } = params;

  const handleFinish = useCallback(async () => {
    const name = selectedClient ? selectedClient.name : newClient.name;
    const phone = selectedClient ? selectedClient.phone : newClient.phone;

    if (!name || !phone || selectedServices.length === 0 || !selectedDate || !selectedTime) {
      showError('Preencha todos os campos.');
      return;
    }

    if (selectedDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selected = new Date(selectedDate + 'T12:00:00');
      if (selected < today) {
        showError('Não é possível agendar em uma data passada.');
        return;
      }
    }

    if (!navigator.onLine) {
      showError('Você está sem conexão com a internet.');
      return;
    }

    setIsSubmitting(true);
    try {
      const bookingResult = await createBooking(
        {
          service_ids: selectedServices.map((s) => s.id),
          booking_date: selectedDate,
          booking_time: selectedTime,
          total_price: totalPrice,
          total_duration: totalDuration,
        },
        { name, phone }
      );

      const result = Array.isArray(bookingResult) ? bookingResult[0] : bookingResult;
      const token = result?.token || '';
      const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin;
      const manageUrl = token ? `${siteUrl}/gerenciar?token=${token}` : '';

      logBooking('booking_created', result?.id || '', {
        client_name: name,
        client_phone: phone,
        services: selectedServices.map((s) => ({ id: s.id, name: s.name })),
        date: selectedDate,
        time: selectedTime,
        total_price: totalPrice,
        reschedule: !!rescheduleBooking?.id,
      });

      if (rescheduleBooking?.id) {
        try {
          await deleteBooking(rescheduleBooking.id);
        } catch {
          showError('Agendamento criado, mas não foi possível remover o anterior.');
        }
      }

      if (manageUrl && phone) {
        const serviceNames = selectedServices.map((s) => s.name).join(', ');
        const formattedDate = selectedDate.split('-').reverse().join('/');
        const clientMsg = `Fala ${name}! Seu horário na Black Diamond tá confirmado!\n\n📅 ${formattedDate} às ${selectedTime}\n✂️ ${serviceNames}\n💰 R$ ${totalPrice.toFixed(2).replace('.', ',')}\n\nPrecisa trocar ou cancelar? Clica aqui:\n👉 ${manageUrl}`;
        window.open(
          `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(clientMsg)}`,
          '_blank'
        );
      }

      if (barberPhone) {
        const serviceNames = selectedServices.map((s) => s.name).join(', ');
        const formattedDate = selectedDate.split('-').reverse().join('/');
        const barberMsg = `📋 *Novo Agendamento!*\n\n👤 ${name}\n📱 ${phone}\n✂️ ${serviceNames}\n📅 ${formattedDate} às ${selectedTime}\n💰 R$ ${totalPrice.toFixed(2).replace('.', ',')}${manageUrl ? `\n\nPara cancelar ou reagendar, acesse:\n👉 ${manageUrl}` : ''}`;
        window.open(
          `https://wa.me/${barberPhone.replace(/\D/g, '')}?text=${encodeURIComponent(barberMsg)}`,
          '_blank'
        );
      }

      showSuccess(
        rescheduleBooking?.id ? 'Agendamento reagendado com sucesso!' : 'Agendamento realizado!'
      );
      navigate('/admin');
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Erro ao agendar.');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    selectedClient,
    newClient,
    selectedServices,
    selectedDate,
    selectedTime,
    totalPrice,
    totalDuration,
    rescheduleBooking,
    barberPhone,
    navigate,
    showSuccess,
    showError,
    logBooking,
  ]);

  return { isSubmitting, handleFinish };
}
