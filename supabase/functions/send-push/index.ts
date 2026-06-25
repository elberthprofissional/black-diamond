import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

interface PushSubscription {
  endpoint: string
  p256dh: string
  auth: string
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 })
  }

  try {
    const { booking_id, client_name, service_names, booking_date, booking_time } = await req.json()

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    )

    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("*")

    if (error || !subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ message: "No subscriptions found" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    }

    const payload = JSON.stringify({
      title: "Novo Agendamento!",
      body: `${client_name} - ${service_names} - ${booking_date} às ${booking_time}`,
      icon: "/assets/logo.webp",
      tag: `booking-${booking_id}`,
      url: "/admin",
    })

    const results = await Promise.allSettled(
      subscriptions.map(async (sub: PushSubscription) => {
        try {
          const response = await fetch(sub.endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/octet-stream",
              "TTL": "86400",
            },
            body: payload,
          })

          return response.ok
        } catch {
          return false
        }
      })
    )

    const sent = results.filter((r) => r.status === "fulfilled" && r.value).length

    return new Response(JSON.stringify({ sent, total: subscriptions.length }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
})
