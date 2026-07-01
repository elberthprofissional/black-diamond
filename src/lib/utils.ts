export const getTimeSlotsForDate = (dateStr: string): string[] => {
  const date = new Date(dateStr + 'T12:00:00');
  const dow = date.getDay();
  const slots: string[] = [];
  if (dow === 6) {
    for (let h = 8; h < 18; h++) slots.push(`${String(h).padStart(2, '0')}:00`);
  } else {
    for (let h = 8; h < 19; h++) slots.push(`${String(h).padStart(2, '0')}:00`);
  }
  return slots;
};

export const getPeriod = (time: string) => {
  const hour = parseInt(time.split(':')[0], 10);
  if (isNaN(hour)) return 'Manhã';
  if (hour < 12) return 'Manhã';
  if (hour < 18) return 'Tarde';
  return 'Noite';
};

export const formatPhone = (value: string | undefined | null) => {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  let d = digits;
  if (d.length > 11) d = d.slice(0, 11);

  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

export const getLocalDateString = (d: Date = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getNextDays = () => {
  const days = [];
  const today = new Date();
  const currentDay = today.getDay();
  const currentHour = today.getHours();
  
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);

  // Se for sábado após as 18:00 (fechamento) ou se for domingo, a agenda abre para a próxima semana
  if (currentDay === 0 || (currentDay === 6 && currentHour >= 18)) {
    monday.setDate(monday.getDate() + 7);
  }

  for (let i = 0; i < 6; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    
    const isToday = date.toDateString() === today.toDateString();
    const isPast = date.getTime() < today.getTime() && !isToday;

    days.push({
      fullDate: getLocalDateString(date),
      dayName: date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase(),
      dayNumber: date.getDate(),
      isToday,
      isPast,
    });
  }
  return days;
};

export const isTimeOccupied = (time: string, bookings: { booking_time: string; status: string }[]) => {
  return bookings.some(b => {
    const bookingTime = b.booking_time.slice(0, 5);
    return bookingTime === time && b.status !== 'cancelled';
  });
};

const ERROR_MESSAGES: Record<string, string> = {
  'Failed to fetch': 'Sem conexão com o servidor. Verifique sua internet.',
  'NetworkError': 'Erro de rede. Tente novamente.',
  'invalid input': 'Dados inválidos. Verifique os campos.',
  'permission denied': 'Sem permissão para esta ação.',
  'JWT expired': 'Sessão expirada. Faça login novamente.',
  'new row violates row-level security': 'Sem permissão para esta ação.',
  'row-level security': 'Sem permissão para esta ação.',
  'violates foreign key': 'Erro de integridade dos dados.',
  'duplicate key': 'Este telefone já está cadastrado para outro cliente.',
  'unique_violation': 'Este telefone já está cadastrado para outro cliente.',
};

export const generateGoogleCalendarUrl = (
  serviceName: string,
  date: string,
  time: string,
  duration: number
): string => {
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);

  const startDate = new Date(year, month - 1, day, hours, minutes);
  const endDate = new Date(startDate.getTime() + duration * 60000);

  const formatGCalDate = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(hours)}${pad(minutes)}00`;
  };

  const title = `${serviceName} - Black Diamond`;
  const details = `Seu agendamento na Black Diamond Barbearia.\n\nServiço: ${serviceName}\nHorário: ${time}\nDuração: ${duration} minutos`;
  const start = formatGCalDate(startDate);
  const end = formatGCalDate(endDate);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${start}/${end}&details=${encodeURIComponent(details)}`;
};

export const generateIcsFile = (
  serviceName: string,
  date: string,
  time: string,
  duration: number
) => {
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);

  const startDate = new Date(year, month - 1, day, hours, minutes);
  const endDate = new Date(startDate.getTime() + duration * 60000);

  const formatIcsDate = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
  };

  const now = new Date();
  const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@blackdiamond`;

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Black Diamond//Barbearia//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatIcsDate(now)}`,
    `DTSTART;TZID=America/Sao_Paulo:${formatIcsDate(startDate)}`,
    `DTEND;TZID=America/Sao_Paulo:${formatIcsDate(endDate)}`,
    `SUMMARY:${serviceName} - Black Diamond`,
    'DESCRIPTION:Seu agendamento na Black Diamond Barbearia.',
    'BEGIN:VALARM',
    'TRIGGER:-PT30M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Lembrete do seu agendamento',
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    'DESCRIPTION:Seu agendamento é amanhã',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `BlackDiamond-${serviceName.replace(/\s+/g, '-')}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    const msg = error.message;
    if (msg.includes('horário acabou de ser preenchido')) return 'Este horário acabou de ser preenchido. Escolha outro.';
    if (msg.includes('Limite de 3 agendamentos')) return 'Limite de 3 agendamentos por dia atingido.';
    if (msg.includes('Informe')) return msg; // client-side validation messages
    for (const [key, value] of Object.entries(ERROR_MESSAGES)) {
      if (msg.toLowerCase().includes(key.toLowerCase())) return value;
    }
    return msg || 'Erro inesperado. Tente novamente.';
  }
  return 'Erro inesperado. Tente novamente.';
};
