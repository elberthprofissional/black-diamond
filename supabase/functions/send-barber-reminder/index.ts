import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import * as webpush from "https://esm.sh/web-push@3.6.7"

const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? ""
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") ?? ""
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:elberthmayan2007@gmail.com"
const FUNCTION_SECRET = Deno.env.get("FUNCTION_SECRET") ?? ""

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

  const auth = req.headers.get("Authorization")
  if (FUNCTION_SECRET && auth !== `Bearer ${FUNCTION_SECRET}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } })
  }

  if (!VAPID_PRIVATE_KEY || !VAPID_PUBLIC_KEY) {
    return new Response(JSON.stringify({ error: "VAPID not configured" }), { status: 500, headers: { "Content-Type": "application/json" } })
  }

  try {
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

    const hour = new Date().getHours()
    let greeting: string
    let message: string

    if (hour < 12) {
      greeting = "Bom dia, Tato!"
      message = "Lembre de enviar lembretes pros seus clientes. Uma mensagem rápida faz diferença na agenda!"
    } else if (hour < 18) {
      greeting = "Boa tarde, Tato!"
      message = "Já mandou lembretes pros clientes hoje? Garanta que a agenda dessa semana fique boa!"
    } else {
      greeting = "Boa noite, Tato!"
      message = "Última chance de mandar lembretes! Não deixe os horários dessa semana vazios."
    }

    const payload = JSON.stringify({
      title: greeting,
      body: message,
      icon: "/assets/logo.webp",
      tag: "barber-reminder",
      url: "/admin/clients",
    })

    const results = await Promise.allSettled(
      subscriptions.map(async (sub: PushSubscription) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
            { TTL: 3600 }
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
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
})
