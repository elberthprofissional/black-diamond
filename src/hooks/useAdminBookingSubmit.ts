import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createBooking, deleteBooking } from '../lib/api';
import { openWhatsApp, formatWaDate, formatWaCurrency } from '../lib/whatsapp';
import { useAuditLog } from './useAuditLog';
import { useToast } from './useToast';
import { createNotification } from '../lib/api/notifications';
import { fireAndForget } from '../lib/fire-and-forget';
import type { Service, Booking } from '../types';
import { logError } from '../lib/logger';

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
  /** Barbeiro escolhido (multi-barbeiro). */
  barberId?: string;
  barberUserId?: string;
  barberName?: string;
}

async function executeBooking(params: AdminBookingSubmitParams) {
  const {
    selectedClient,
    newClient,
    selectedServices,
    selectedDate,
    selectedTime,
    totalPrice,
    totalDuration,
    rescheduleBooking,
    barberId,
  } = params;

  const name = selectedClient ? selectedClient.name : newClient.name;
  const phone = selectedClient ? selectedClient.phone : newClient.phone;

  // Validações
  if (!name || !phone || selectedServices.length === 0 || !selectedDate || !selectedTime) {
    throw new Error('Preencha todos os campos.');
  }

  if (selectedDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(selectedDate + 'T12:00:00');
    if (selected < today) {
      throw new Error('Não é possível agendar em uma data passada.');
    }
  }

  if (!navigator.onLine) {
    throw new Error('Você está sem conexão com a internet.');
  }

  // Cria o agendamento (multi-barbeiro: vincula ao barbeiro escolhido)
  const bookingResult = await createBooking(
    {
      service_ids: selectedServices.map((s) => s.id),
      booking_date: selectedDate,
      booking_time: selectedTime,
      total_price: totalPrice,
      total_duration: totalDuration,
      barber_id: barberId,
    },
    { name, phone }
  );

  const result = Array.isArray(bookingResult) ? bookingResult[0] : bookingResult;
  const token = result?.token || '';
  const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin;
  const manageUrl = token ? `${siteUrl}/gerenciar?token=${token}` : '';

  // Remove agendamento anterior se for reagendamento
  if (rescheduleBooking?.id) {
    try {
      await deleteBooking(rescheduleBooking.id);
    } catch (e) {
      logError(e);
      // Não propaga o erro - o novo agendamento já foi criado
    }
  }

  return { name, phone, manageUrl, result, params };
}

export function useAdminBookingSubmit(params: AdminBookingSubmitParams) {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const { logBooking } = useAuditLog();

  const mutation = useMutation({
    mutationFn: (input: AdminBookingSubmitParams) => executeBooking(input),
    onSuccess: ({ name, phone, manageUrl, result, params: p }) => {
      const {
        selectedServices,
        selectedDate,
        selectedTime,
        totalPrice,
        rescheduleBooking,
        barberPhone,
      } = p;

      // Audit log
      logBooking('booking_created', result?.id || '', {
        client_name: name,
        client_phone: phone,
        services: selectedServices.map((s) => ({ id: s.id, name: s.name })),
        date: selectedDate,
        time: selectedTime,
        total_price: totalPrice,
        reschedule: !!rescheduleBooking?.id,
      });

      // WhatsApp: envia mensagem pro cliente
      if (manageUrl && phone) {
        const serviceNames = selectedServices.map((s) => s.name).join(', ');
        const clientMsg = `Fala ${name}! Seu horário na Black Diamond tá confirmado!\n\n📅 ${formatWaDate(selectedDate)} às ${selectedTime}\n✂️ ${serviceNames}\n💰 ${formatWaCurrency(totalPrice)}\n\nPrecisa trocar ou cancelar? Clica aqui:\n👉 ${manageUrl}`;
        openWhatsApp(phone, clientMsg);
      }

      // WhatsApp: notifica o barbeiro escolhido (multi-barbeiro)
      if (barberPhone) {
        const serviceNames = selectedServices.map((s) => s.name).join(', ');
        const barberMsg = `📋 *Novo Agendamento!*\n\n👤 ${name}\n📱 ${phone}\n✂️ ${serviceNames}\n📅 ${formatWaDate(selectedDate)} às ${selectedTime}\n💰 ${formatWaCurrency(totalPrice)}${manageUrl ? `\n\nPara cancelar ou reagendar, acesse:\n👉 ${manageUrl}` : ''}`;
        openWhatsApp(barberPhone, barberMsg);
      }

      // Notificação in-app para o barbeiro escolhido (multi-barbeiro)
      // Sem fallback para barbers[0]: se o barbeiro escolhido não tiver user_id
      // vinculado, a notificação in-app é pulada (o WhatsApp já avisou o barbeiro).
      const targetBarberUserId = p.barberUserId;
      if (targetBarberUserId) {
        fireAndForget(
          createNotification({
            userId: targetBarberUserId,
            title: 'Novo Agendamento!',
            body: `${name} — ${formatWaDate(p.selectedDate)} às ${p.selectedTime.slice(0, 5)}`,
            tag: `booking-new-${Date.now()}`,
            url: '/admin',
          }),
          { context: 'useAdminBookingSubmit/barberNotification' }
        );
      }

      showSuccess(
        rescheduleBooking?.id ? 'Agendamento reagendado com sucesso!' : 'Agendamento realizado!'
      );
      navigate('/admin');
    },
    onError: (error) => {
      showError(error instanceof Error ? error.message : 'Erro ao agendar.');
    },
  });

  const handleFinish = useCallback(async () => {
    await mutation.mutateAsync(params);
  }, [mutation, params]);

  return { isSubmitting: mutation.isPending, handleFinish };
}
