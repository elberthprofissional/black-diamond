import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID') ?? '';
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '';
const GOOGLE_REFRESH_TOKEN = Deno.env.get('GOOGLE_REFRESH_TOKEN') ?? '';
const GOOGLE_CALENDAR_ID = Deno.env.get('GOOGLE_CALENDAR_ID') ?? 'primary';
const FUNCTION_SECRET = Deno.env.get('FUNCTION_SECRET') ?? '';

interface CalendarEvent {
  summary: string;
  description: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
}

function verifyAuth(req: Request): boolean {
  if (!FUNCTION_SECRET) return false;
  const auth = req.headers.get('Authorization');
  return auth === `Bearer ${FUNCTION_SECRET}`;
}

async function getAccessToken(): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) throw new Error('Failed to refresh Google access token');
  const data = await response.json();
  if (!data.access_token) throw new Error('No access token in Google response');
  return data.access_token;
}

async function createEvent(accessToken: string, event: CalendarEvent): Promise<string | null> {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(GOOGLE_CALENDAR_ID)}/events`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  );

  if (!response.ok) return null;
  const data = await response.json();
  return data.id;
}

async function updateEvent(
  accessToken: string,
  eventId: string,
  event: CalendarEvent
): Promise<boolean> {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(GOOGLE_CALENDAR_ID)}/events/${eventId}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  );

  return response.ok;
}

async function deleteEvent(accessToken: string, eventId: string): Promise<boolean> {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(GOOGLE_CALENDAR_ID)}/events/${eventId}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  return response.ok || response.status === 404;
}

function parseBrazilDateTime(dateStr: string, timeStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  // Use Intl to get the actual UTC offset for America/Sao_Paulo (handles DST)
  const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });
  const [ph, pm] = formatter.format(utcDate).split(':').map(Number);
  const offsetMinutes = ph * 60 + pm - (hours * 60 + minutes);
  utcDate.setMinutes(utcDate.getMinutes() - offsetMinutes);
  return utcDate;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!verifyAuth(req)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    return new Response(JSON.stringify({ error: 'Google Calendar not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const {
      action,
      booking_id,
      client_name,
      service_names,
      booking_date,
      booking_time,
      total_duration,
      google_event_id,
    } = await req.json();

    const accessToken = await getAccessToken();

    if (action === 'create') {
      const startDate = parseBrazilDateTime(booking_date, booking_time);
      const endDate = new Date(startDate.getTime() + (total_duration || 60) * 60000);

      const event: CalendarEvent = {
        summary: `${client_name} - ${service_names}`,
        description: `Black Diamond - ${service_names}\nCliente: ${client_name}\nDuracao: ${total_duration || 60}min`,
        start: { dateTime: startDate.toISOString(), timeZone: 'America/Sao_Paulo' },
        end: { dateTime: endDate.toISOString(), timeZone: 'America/Sao_Paulo' },
      };

      const eventId = await createEvent(accessToken, event);

      if (eventId) {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        await supabase.from('bookings').update({ google_event_id: eventId }).eq('id', booking_id);
      }

      return new Response(JSON.stringify({ success: true, event_id: eventId }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (action === 'update' && google_event_id) {
      const startDate = parseBrazilDateTime(booking_date, booking_time);
      const endDate = new Date(startDate.getTime() + (total_duration || 60) * 60000);

      const event: CalendarEvent = {
        summary: `${client_name} - ${service_names}`,
        description: `Black Diamond - ${service_names}\nCliente: ${client_name}\nDuracao: ${total_duration || 60}min`,
        start: { dateTime: startDate.toISOString(), timeZone: 'America/Sao_Paulo' },
        end: { dateTime: endDate.toISOString(), timeZone: 'America/Sao_Paulo' },
      };

      const success = await updateEvent(accessToken, google_event_id, event);

      return new Response(JSON.stringify({ success }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (action === 'delete' && google_event_id) {
      const success = await deleteEvent(accessToken, google_event_id);

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      await supabase.from('bookings').update({ google_event_id: null }).eq('id', booking_id);

      return new Response(JSON.stringify({ success }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
