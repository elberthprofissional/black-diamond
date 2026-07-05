import React, { useState } from 'react';
import type { BookingWithClient } from '../../../types';

interface WhatsAppReminderButtonProps {
  booking: BookingWithClient;
  className?: string;
  showLabel?: boolean;
  label?: string;
  iconType?: 'whatsapp' | 'bell';
}

const WhatsAppReminderButton: React.FC<WhatsAppReminderButtonProps> = ({
  booking,
  className = '',
  showLabel = false,
  label = 'WhatsApp',
  iconType = 'whatsapp',
}) => {
  const storageKey = `barber_reminder_sent_${booking.id}`;
  const [reminderSent, setReminderSent] = useState(
    () => localStorage.getItem(storageKey) === 'true'
  );

  const clientName = booking.clients?.name || 'Cliente';
  const firstName = clientName.split(' ')[0];
  const time = booking.booking_time?.slice(0, 5) || '00:00';

  const generateDefaultMessage = () => {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

    // Determina o dia relativo ou nome do dia
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const bookingDate = new Date(booking.booking_date + 'T12:00:00');
    bookingDate.setHours(0, 0, 0, 0);

    const diffTime = bookingDate.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    let dayText = 'hoje';
    if (diffDays === 1) {
      dayText = 'amanhã';
    } else if (diffDays > 1) {
      const dayName = bookingDate.toLocaleDateString('pt-BR', { weekday: 'long' });
      const isMasculine = dayName.startsWith('sáb') || dayName.startsWith('dom');
      dayText = `${isMasculine ? 'neste' : 'nesta'} ${dayName}`;
    }

    return `${greeting}, ${firstName}! Passando para lembrar do seu horário às ${time} ${dayText} no Black Diamond. Confirmado? 💈`;
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!booking.clients?.phone) return;

    let phone = booking.clients.phone.replace(/\D/g, '');
    if (phone.length === 10 || phone.length === 11) {
      phone = '55' + phone;
    }

    const message = generateDefaultMessage();

    localStorage.setItem(storageKey, 'true');
    setReminderSent(true);

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <button
      onClick={handleClick}
      className={`group ${className} flex items-center gap-1.5 relative`}
      title="Enviar lembrete de WhatsApp"
    >
      <div className="relative flex items-center justify-center">
        {iconType === 'bell' ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="stroke-zinc-400 group-hover:stroke-white mr-0.5"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        )}
        {reminderSent && (
          <span
            className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 border border-[#0A0A0A] shadow-[0_0_4px_rgba(16,185,129,0.5)]"
            title="Lembrete enviado"
          />
        )}
      </div>
      {showLabel && <span>{label}</span>}
    </button>
  );
};

export default WhatsAppReminderButton;
