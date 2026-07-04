# API - Black Diamond

Funções de acesso a dados (src/lib/api.ts).

## Serviços

### `getServices()`
Busca todos os serviços cadastrados.

```ts
const services = await getServices();
// [{ id, name, price, duration, description }]
```

## Agendamentos

### `createBooking(bookingData, clientData)`
Cria agendamento. Valida campos obrigatórios.

```ts
await createBooking(
  { service_ids, booking_date, booking_time, total_price, total_duration },
  { name, phone, email? }
);
```

### `getBookings(date?)`
Busca agendamentos. Se `date` fornecida, filtra por data.

```ts
const bookings = await getBookings('2026-07-04');
// [{ id, booking_date, booking_time, status, clients: {...}, ... }]
```

### `getAvailableSlots(date)`
Retorna horários disponíveis para uma data.

```ts
const slots = await getAvailableSlots('2026-07-04');
// ['08:00', '09:00', '10:00', ...]
```

### `updateBookingStatus(id, status)`
Atualiza status de um agendamento.

```ts
await updateBookingStatus(bookingId, 'completed');
```

### `deleteBooking(id)`
Remove agendamento.

```ts
await deleteBooking(bookingId);
```

## Clientes

### `getClients()`
Busca todos os clientes.

### `getClientByPhone(phone)`
Busca cliente por telefone (11 dígitos).

```ts
const client = await getClientByPhone('11999887766');
// { id, name, phone, is_mensalista, ... }
```

### `createClient(data)`
Cria novo cliente.

### `updateClient(id, data)`
Atualiza dados do cliente.

### `deleteClient(id)`
Remove cliente.

## Configurações

### `getSetting(key)`
Busca configuração por chave.

```ts
const phone = await getSetting('barber_phone');
```

### `updateSetting(key, value)`
Atualiza configuração.

## RPCs (Funções do Banco)

### `criar_agendamento`
Cria agendamento com lógica de conflito no servidor.

### `get_available_slots`
Retorna slots disponíveis excluindo ocupados e bloqueados.

## Erros

Todas as funções lançam Error com mensagem amigável. Use `getErrorMessage(error)` para extrair mensagem.
