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
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(GOOGLE_CALENDAR_ID)}/events/${encodeURIComponent(eventId)}`,
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
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(GOOGLE_CALENDAR_ID)}/events/${encodeURIComponent(eventId)}`,
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
  const utcEquivalent = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });

  const parts = formatter.formatToParts(utcEquivalent);
  const partVal = (type: string) => Number(parts.find((p) => p.type === type)?.value);

  const yearPart = partVal('year');
  const monthPart = partVal('month');
  const dayPart = partVal('day');
  let hourPart = partVal('hour');
  if (hourPart === 24) hourPart = 0;
  const minutePart = partVal('minute');
  const secondPart = partVal('second');

  const tzEquivalentMs = Date.UTC(
    yearPart,
    monthPart - 1,
    dayPart,
    hourPart,
    minutePart,
    secondPart
  );
  const offsetMs = tzEquivalentMs - utcEquivalent.getTime();

  return new Date(utcEquivalent.getTime() - offsetMs);
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
    const body = await req.json();
    const {
      action,
      booking_id,
      client_name,
      service_names,
      booking_date,
      booking_time,
      total_duration,
      google_event_id,
    } = body;

    // SEC-4: Input validation
    if (!action || !['create', 'update', 'delete'].includes(action)) {
      return new Response(JSON.stringify({ error: 'Invalid or missing action' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!booking_id) {
      return new Response(JSON.stringify({ error: 'Missing booking_id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (action !== 'delete' && (!booking_date || !booking_time)) {
      return new Response(JSON.stringify({ error: 'Missing booking_date or booking_time' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // SEC-5: Create Supabase client once
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const accessToken = await getAccessToken();

    if (action === 'create') {
      const startDate = parseBrazilDateTime(booking_date, booking_time);
      const endDate = new Date(startDate.getTime() + (total_duration || 60) * 60000);

      const event: CalendarEvent = {
        summary: `${client_name || 'Cliente'} - ${service_names || 'Serviços'}`,
        description: `Black Diamond - ${service_names || 'Serviços'}\nCliente: ${client_name || 'Cliente'}\nDuração: ${total_duration || 60}min`,
        start: { dateTime: startDate.toISOString(), timeZone: 'America/Sao_Paulo' },
        end: { dateTime: endDate.toISOString(), timeZone: 'America/Sao_Paulo' },
      };

      const eventId = await createEvent(accessToken, event);

      if (eventId) {
        await supabase.from('bookings').update({ google_event_id: eventId }).eq('id', booking_id);
      }

      return new Response(JSON.stringify({ success: true, event_id: eventId }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (action === 'update') {
      if (!google_event_id) {
        return new Response(JSON.stringify({ error: 'Missing google_event_id for update' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const startDate = parseBrazilDateTime(booking_date, booking_time);
      const endDate = new Date(startDate.getTime() + (total_duration || 60) * 60000);

      const event: CalendarEvent = {
        summary: `${client_name || 'Cliente'} - ${service_names || 'Serviços'}`,
        description: `Black Diamond - ${service_names || 'Serviços'}\nCliente: ${client_name || 'Cliente'}\nDuração: ${total_duration || 60}min`,
        start: { dateTime: startDate.toISOString(), timeZone: 'America/Sao_Paulo' },
        end: { dateTime: endDate.toISOString(), timeZone: 'America/Sao_Paulo' },
      };

      const success = await updateEvent(accessToken, google_event_id, event);

      return new Response(JSON.stringify({ success }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (action === 'delete') {
      if (!google_event_id) {
        return new Response(JSON.stringify({ success: true, message: 'No event to delete' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const success = await deleteEvent(accessToken, google_event_id);

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
  } catch (err: unknown) {
    // ERR-1: Log context
    console.error('Error in sync-google-calendar Edge Function:', err);
    return new Response(
      JSON.stringify({
        error: 'Internal error',
        details: err instanceof Error ? err.message : String(err),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
