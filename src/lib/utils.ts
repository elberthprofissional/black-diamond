export const TIME_SLOTS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];

export const getPeriod = (time: string) => {
  const hour = parseInt(time.split(':')[0], 10);
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
    const isPast = date < today && !isToday;

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
