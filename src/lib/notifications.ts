export interface ParsedNotif {
  clientName: string;
  services: string;
  dateTime: string;
  totalPrice: string;
  clientPhone: string;
  manageUrl: string;
}

export function parseNotifBody(body: string): ParsedNotif | null {
  try {
    const parsed = JSON.parse(body);
    if (parsed && typeof parsed.clientName === 'string') {
      return {
        clientName: parsed.clientName.replace(/\s*\[MENSALISTA\]/, '').trim(),
        services: parsed.services || '',
        dateTime: parsed.dateTime || '',
        totalPrice: parsed.totalPrice || '',
        clientPhone: parsed.clientPhone || '',
        manageUrl: parsed.manageUrl || '',
      };
    }
  } catch {
    // not JSON
  }

  const parts = body.split(' | ');
  if (parts.length < 6) return null;
  return {
    clientName: (parts[0] ?? '').replace(/\s*\[MENSALISTA\]/, '').trim(),
    services: (parts[1] ?? '').trim(),
    dateTime: (parts[2] ?? '').trim(),
    totalPrice: (parts[3] ?? '').trim(),
    clientPhone: (parts[4] ?? '').trim(),
    manageUrl: (parts[5] ?? '').trim(),
  };
}

export function relativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMin = Math.floor((now - date) / 60000);

  if (diffMin < 1) return 'Agora';
  if (diffMin < 60) return `${diffMin} min`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return 'Ontem';
  if (diffDay < 7) return `${diffDay} dias`;
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}
