# API - Black Diamond

Funções de acesso a dados organizadas em `src/lib/api/`.

## Serviços

### `getServices()`
Busca todos os serviços cadastrados.

```ts
const services = await getServices();
// [{ id, name, price, duration, description }]
```

## Agendamentos

### `createBooking(bookingData, clientData)`
Cria agendamento via RPC `criar_agendamento_rate_limited`. Valida campos obrigatórios no client-side; preço e duração são calculados server-side.

```ts
await createBooking(
  { service_ids, booking_date, booking_time, total_price, total_duration },
  { name, phone, email? }
);
```

### `getBookings(date?)`
Busca agendamentos com join em `clients`. Se `date` fornecida, filtra por data.

```ts
const bookings = await getBookings('2026-07-04');
// [{ id, booking_date, booking_time, status, clients: {...}, ... }]
```

### `getAvailableSlots(date)`
Retorna horários disponíveis para uma data via RPC `get_available_slots`.

```ts
const slots = await getAvailableSlots('2026-07-04');
// ['08:00', '09:00', '10:00', ...]
```

### `getBookingsByPhone(phone)`
Busca agendamentos futuros por telefone via RPC `get_bookings_by_phone_rate_limited`.

```ts
const bookings = await getBookingsByPhone('11999887766');
// [{ booking_id, booking_date, booking_time, total_price, client_name, ... }]
```

### `getBookingsByToken(token)`
Busca agendamentos por token de gerenciamento via RPC `get_bookings_by_token`.

```ts
const bookings = await getBookingsByToken('abc123...');
// [{ booking_id, booking_date, booking_time, client_name, client_phone, ... }]
```

### `getLastBookingByPhone(phone)`
Retorna o último agendamento de um telefone via RPC `get_last_booking_by_phone`.

```ts
const last = await getLastBookingByPhone('11999887766');
// { service_ids, total_price }
```

### `updateBookingStatus(id, status)`
Atualiza status de um agendamento (completed/cancelled).

```ts
await updateBookingStatus(bookingId, 'completed');
```

### `deleteBooking(id)`
Remove agendamento permanentemente.

```ts
await deleteBooking(bookingId);
```

### `cancelBooking(id, token?)`
Cancela agendamento via RPC `cancel_booking_public`. Admins não precisam de token.

```ts
await cancelBooking(bookingId, token);
```

### `toggleSlotBlock(date, time)`
Bloqueia/desbloqueia um horário via RPC `toggle_slot_block`.

```ts
await toggleSlotBlock('2026-07-04', '10:00');
```

### `unblockDay(date)`
Desbloqueia todos os horários de uma data via RPC `unblock_day`.

```ts
await unblockDay('2026-07-04');
```

### `autoCompleteExpiredBookings()`
Auto-completa agendamentos expirados.

### `getBookingsForStats()`
Retorna agendamentos para cálculo de estatísticas (usado pelo painel de clientes).

### `deleteAllBookings()`
Remove todos os agendamentos (operação de reset, usada em SettingsDados).

## Clientes

### `getClients()`
Busca todos os clientes (exclui deletados e bloqueados).

```ts
const clients = await getClients();
// [{ id, name, phone, is_mensalista, ... }]
```

### `getClientByPhone(phone)`
Busca cliente por telefone via RPC `lookup_client_by_phone_rate_limited`.

```ts
const client = await getClientByPhone('11999887766');
// { id, name, phone, is_mensalista, mensalista_plan_id }
```

### `createClient(data)`
Cria novo cliente.

### `updateClient(id, data)`
Atualiza dados do cliente (nome, telefone, notas).

### `updateClientNotes(id, notes)`
Atualiza apenas as notas do cliente.

### `deleteClient(id)`
Soft delete do cliente (define `deleted_at`).

### `toggleClientMensalista(id, isMensalista, planId?, expiresAt?)`
Alterna status mensalista do cliente.

### `deleteAllClients()`
Remove todos os clientes (operação de reset, usada em SettingsDados e AdminProfile).

## Mensalista

### `getMensalistaPlans()`
Busca todos os planos mensalistas ativos.

### `createMensalistaPlan(data)`
Cria novo plano.

### `updateMensalistaPlan(id, data)`
Atualiza plano existente.

### `deleteMensalistaPlan(id)`
Remove plano.

### `getMensalistaEnabled()`
Verifica se mensalista está habilitado.

### `setMensalistaEnabled(enabled)`
Habilita/desabilita sistema de mensalista.

## Templates

### `getTemplates(key)`
Busca templates de WhatsApp por chave.

```ts
const templates = await getTemplates('reminder');
// [{ id, key, name, body, created_at, updated_at }]
```

### `createTemplate(key, name, body)`
Cria novo template.

### `deleteTemplate(id)`
Remove template.

## RPCs (Funções do Banco)

| RPC | Descrição |
|-----|-----------|
| `criar_agendamento_rate_limited` | Cria agendamento com rate limiting (3/min por IP) |
| `get_available_slots` | Slots disponíveis excluindo ocupados e bloqueados |
| `get_bookings_by_phone_rate_limited` | Busca agendamentos por telefone (5/min por IP) |
| `get_last_booking_by_phone` | Último agendamento de um telefone |
| `lookup_client_by_phone_rate_limited` | Busca cliente por telefone (10/min por IP) |
| `cancel_booking_public` | Cancela agendamento (token ou admin) |
| `toggle_slot_block` | Bloqueia/desbloqueia horário |
| `unblock_day` | Desbloqueia todos os horários do dia |
| `get_bookings_by_token` | Busca agendamentos por token de gerenciamento |
| `save_push_subscription` | Salva inscrição de push notification |
| `delete_push_subscription` | Remove inscrição de push notification |

## Erros

Todas as funções lançam Error com mensagem amigável. Use `getErrorMessage(error)` de `lib/utils` para extrair mensagem em português.
