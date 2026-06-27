import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import * as webpush from "https://esm.sh/web-push@3.6.7"

const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? ""
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") ?? ""
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:elberthmayan2007@gmail.com"

interface PushSubscription {
  endpoint: string
  p256dh: string
  auth: string
  id?: string
}

if (VAPID_PRIVATE_KEY && VAPID_PUBLIC_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { "Content-Type": "application/json" } })
  }

  if (!VAPID_PRIVATE_KEY || !VAPID_PUBLIC_KEY) {
    return new Response(JSON.stringify({ error: "VAPID not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
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
      return new Response(JSON.stringify({ message: "No subscriptions", sent: 0 }), {
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
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
            { TTL: 86400 }
          )
          return true
        } catch (err: unknown) {
          const status = (err as { statusCode?: number }).statusCode
          if (status === 410 && sub.id) {
            await supabase.from("push_subscriptions").delete().eq("id", sub.id)
          }
          return false
        }
      })
    )

    const sent = results.filter((r) => r.status === "fulfilled" && r.value).length
    const failed = results.filter((r) => r.status === "fulfilled" && !r.value).length

    return new Response(JSON.stringify({ sent, failed, total: subscriptions.length }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch {
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
})
