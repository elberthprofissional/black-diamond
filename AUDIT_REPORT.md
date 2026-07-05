# Black Diamond — SQL & Edge Function Audit Report
**Date:** 2026-07-05

---

## FILE: `estrutura_barbearia.sql` (683 lines)

### SEC-1 — LOW — Line 519 — Unnecessary SECURITY DEFINER on `get_business_hours()`
Only reads `settings` table which already has public SELECT policy (line 251).  
**Fix:** Change `SECURITY DEFINER` to `SECURITY INVOKER`.

### SEC-2 — LOW — Line 606 — Unnecessary SECURITY DEFINER on `get_average_rating()`
Only reads `reviews` table which already has public SELECT policy (line 266).  
**Fix:** Change to `SECURITY INVOKER`.

### IDX-1 — HIGH — Line 60 — Missing index on `bookings.client_id`
The `criar_agendamento` function JOINs bookings→clients on this FK (line 389). `limpar_agendamentos_semana` also scans without it.  
**Fix:** `CREATE INDEX idx_bookings_client_id ON bookings(client_id);`

### IDX-2 — MEDIUM — Line 70 — Missing index on `bookings.google_event_id`
Edge function sync-google-calendar updates by this column (line 134 of index.ts).  
**Fix:** `CREATE INDEX idx_bookings_google_event_id ON bookings(google_event_id) WHERE google_event_id IS NOT NULL;`

### IDX-3 — MEDIUM — Lines 93–96 — Missing indexes on `reviews.booking_id` and `reviews.client_id`
`get_top_reviews` JOINs on both. Insert policy (line 279) also subqueries `reviews.booking_id`.  
**Fix:** Add indexes on both FK columns.

### IDX-4 — LOW — Line 44 — No partial indexes for boolean flag columns
`clients.is_mensalista`, `clients.is_blocked` are frequently filtered.  
**Fix:** `CREATE INDEX idx_clients_mensalista ON clients(id) WHERE is_mensalista;`

### RLS-1 — HIGH — Lines 258–262 — `push_subscriptions` allows admin-only access but `save_push_subscription` RPC is callable by anyone
The RLS policy on `push_subscriptions` (line 260) uses `FOR ALL TO authenticated USING (is_admin())`. But `save_push_subscription` (line 567) is SECURITY DEFINER, so any authenticated user can insert subscriptions bypassing RLS. This is a design inconsistency — if subscriptions should be admin-only, the RPC should verify admin; if any user should subscribe, the RLS INSERT policy should allow it.  
**Fix:** Either add `FOR INSERT TO authenticated WITH CHECK (true)` policy, or add an `is_admin()` check inside the function.

### RLS-2 — MEDIUM — Lines 117–130 — `audit_logs` has no DELETE or UPDATE policies
Only SELECT (admin) and INSERT (admin) policies exist. While the implicit deny is correct for append-only logs, it's worth documenting the intent. No action required but consider a comment.

### VAL-1 — HIGH — Lines 325–432 — `criar_agendamento` lacks input validation
- `p_cliente_nome` not trimmed or length-checked (could insert empty/whitespace names)
- `p_cliente_telefone` not validated for format (could insert garbage)
- `p_servicos` could be empty array `{}` — line 403 checks `array_length > 0` but an empty array passes through silently creating a booking with price 0
- No check that `p_data` is not in the past
- `p_cliente_email` not validated

**Fix:** Add `TRIM()`, length checks, regex phone validation, past-date guard, and empty-array guard.

### VAL-2 — MEDIUM — Line 403 — Incorrect empty-service check logic
The condition `IF v_server_price = 0 AND array_length(p_servicos, 1) > 0` only catches services that exist but have price 0. An empty array `{}` passes both the SUM=0 and array_length=NULL checks, creating a booking with zero services.  
**Fix:** `IF array_length(p_servicos, 1) IS NULL OR array_length(p_perfis, 1) = 0 THEN RAISE ...`

### VAL-3 — LOW — Lines 436–495 — `get_available_slots` has no past-date guard
Querying a past date returns slots that are already past.  
**Fix:** `IF p_date < CURRENT_DATE THEN RETURN; END IF;`

### PERF-1 — MEDIUM — Lines 482–493 — `get_available_slots` uses hourly WHILE loop with per-iteration query
Each slot fires a `SELECT 1 FROM bookings WHERE ...` — for 11 hours that's 11 separate queries.  
**Fix:** Pre-fetch all booked times for the date into a temp set, then loop against the set.

### DEAD-1 — LOW — Lines 509–519 — `get_business_hours` may be unused
If the admin panel reads settings directly via the Supabase client, this RPC is dead code.  
**Fix:** Verify usage in frontend; remove if unused.

### CORRECT-1 — MEDIUM — Line 178 — Unique index `idx_no_double_booking` blocks legitimate blocked-slot creation
The unique index on `(booking_date, booking_time) WHERE status != 'cancelled'` prevents `toggle_slot_block` from creating a new blocked booking when a confirmed one already exists at that time — but it also prevents creating a blocked slot when the only existing booking is confirmed. The `toggle_slot_block` function handles this via its UPDATE path (line 535), so it's partially mitigated, but the edge case of two concurrent calls could still hit the unique violation caught at line 551.

### CORRECT-2 — LOW — Lines 539–541 — Magic phone number `'00000000000'` for blocked slots
If a real client ever had this phone number, `toggle_slot_block` would reuse their client record.  
**Fix:** Use a dedicated boolean flag or separate table for blocked slots rather than a fake client.

---

## FILE: `atualizar_clients_mensalista.sql` (36 lines)

### DEAD-2 — LOW — Entire file is a migration script
After initial execution, all `IF NOT EXISTS` guards make this a no-op.  
**Fix:** Archive or move to a `migrations/` directory with a version marker so it doesn't get re-run.

No other issues found. The migration logic is correct and idempotent.

---

## FILE: `atualizar_rpc_slots.sql` (60 lines)

### REDUND-1 — MEDIUM — This file duplicates `get_available_slots` from `estrutura_barbearia.sql`
Lines 4–60 are identical to lines 436–495 of the main schema file. Running both creates confusion about which version is canonical.  
**Fix:** Remove this file or convert it to a dated migration with a version comment.

### Inherits all issues from the main schema version (VAL-3, PERF-1).

---

## FILE: `supabase/functions/sync-google-calendar/index.ts` (187 lines)

### SEC-3 — HIGH — Line 86–92 — Hardcoded UTC-3 timezone offset
`parseBrazilDateTime` manually subtracts 3 hours. Brazil observes DST in some regions (UTC-2 in summer). During DST the offset is wrong, causing calendar events to be 1 hour off.  
**Fix:** Use `Intl.DateTimeFormat` with `timeZone: "America/Sao_Paulo"` or the `temporal` API.

### SEC-4 — MEDIUM — Lines 112, 143, 162 — No input validation on request body
`booking_id`, `client_name`, `service_names`, `booking_date`, `booking_time`, `total_duration`, `google_event_id` are destructured without any validation. Malformed data passes straight to Google Calendar API.  
**Fix:** Validate required fields exist and have expected types before use.

### SEC-5 — MEDIUM — Lines 130–134 — Supabase client created inside request handler without cleanup
`createClient` is called inside the `if (action === "create")` block but the instance is not reused. A second call occurs in the `delete` block (line 165).  
**Fix:** Create the Supabase client once at the top of the handler, after auth check.

### ERR-1 — LOW — Line 181 — Catch block swallows all errors silently
The bare `catch` returns a generic "Internal error" with no logging. Debugging production failures will be difficult.  
**Fix:** Log the error to console before returning the generic message.

### SEC-6 — LOW — Line 42 — Google Calendar ID is URL-encoded via `encodeURIComponent`
If `GOOGLE_CALENDAR_ID` contains special characters, this is correct. But the `eventId` on line 60 is NOT encoded, which could break if the ID contains `/` characters.  
**Fix:** Apply `encodeURIComponent(eventId)` on line 60.

---

## FILE: `supabase/functions/send-push/index.ts` (101 lines)

### SEC-7 — MEDIUM — Line 43 — No input validation
`booking_id`, `client_name`, `service_names`, `booking_date`, `booking_time` are used directly in the push payload without null/type checks.  
**Fix:** Validate all required fields before constructing payload.

### SEC-8 — MEDIUM — Line 50–51 — `SELECT *` on `push_subscriptions`
Fetches all columns including `endpoint`, `p256dh`, `auth` for every subscription. This is correct for web-push but `SELECT *` is fragile if columns are added later (e.g., a `user_id` column).  
**Fix:** Use explicit column list: `SELECT id, endpoint, p256dh, auth`.

### ERR-2 — LOW — Line 95 — Catch block swallows errors silently
Same issue as sync-google-calendar ERR-1.  
**Fix:** Log error details before returning generic response.

### PERF-2 — LOW — Lines 69–86 — `Promise.allSettled` sends to all subscriptions in parallel
For large subscription lists this could hit rate limits. No concurrency control.  
**Fix:** Consider batching (e.g., 10 at a time) or adding a small delay between batches.

### CLEAN-1 — LOW — Lines 16–18 — VAPID setup runs at module level
If keys are empty, `webpush.setVapidDetails` is skipped, but the check on line 35 catches this at request time. The module-level conditional is fine but slightly redundant.

---

## Summary by Severity

| Severity | Count |
|----------|-------|
| HIGH     | 4     |
| MEDIUM   | 10    |
| LOW      | 9     |
| **Total** | **23** |

## Top Priority Fixes

1. **SEC-3** — Hardcoded UTC-3 offset will cause wrong calendar times during DST
2. **VAL-1** — `criar_agendamento` accepts empty/malicious input
3. **IDX-1** — Missing `bookings.client_id` index degrades core booking queries
4. **RLS-1** — Push subscription RLS/function inconsistency is a security gap
