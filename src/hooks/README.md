# Hooks - Black Diamond

Hooks customizados do projeto organizados por categoria.

## Booking

### `useBookingWizard`
Hook principal que gerencia todo o fluxo de agendamento do cliente.

```tsx
const { step, services, selectedServices, toggleService, goNext, goBack } = useBookingWizard(showError);
```

**Retorna:** step atual, serviços, seleção, navegação, preços, disponibilidade.

### `useBookingManagement`
Gerencia ações do admin sobre agendamentos (completar, deletar, reagendar).

```tsx
const { handleComplete, confirmDelete, handleStartReschedule } = useBookingManagement(loadData);
```

### `useReschedule`
Lógica de reagendamento com validação de conflitos.

```tsx
const { startReschedule, confirmReschedule, cancelReschedule } = useReschedule(...);
```

### `useBookingFilters`
Filtros de agendamento (ocupados, livres, bloqueados).

### `useSlotBlocking`
Bloqueio/desbloqueio de horários específicos.

## UI

### `useToast`
Sistema de notificações toast.

```tsx
const { showSuccess, showError, toast } = useToast();
```

### `useIsDesktop`
Detecta se viewport é desktop (>1024px).

```tsx
const isDesktop = useIsDesktop();
```

### `useReducedMotion`
Detecta preferência de movimento reduzido do sistema.

### `useModalA11y`
Gerencia acessibilidade de modais (focus trap, ESC para fechar).

## Dados

### `useBarberSettings`
Busca configurações do barbeiro do banco (nome, telefone, foto).

### `useServices`
Busca serviços disponíveis com cache.

### `useBookings`
Busca agendamentos por data com real-time updates.

## Segurança

### `useRateLimit`
Rate limiting no client-side com localStorage.

```tsx
const { isBlocked, recordAttempt, reset } = useRateLimit('login', { maxAttempts: 5, windowMs: 900000 });
```

### `useAuditLog`
Registro de ações administrativas para auditoria.

```tsx
const { logBooking, logClient } = useAuditLog();
```

### `useAdminLogout`
Logout seguro com limpeza de sessão.

## Notificações

### `usePushNotifications`
Gerencia push notifications do PWA.

### `usePwaInstall`
Gerencia instalação do PWA com detecção de plataforma.

```tsx
const { isIOS, isStandalone, isIOSChrome, handleInstall } = usePwaInstall(
  () => showSuccess('Instalado!'),
  (msg) => showError(msg),
);
```

- iPhone (Safari): exibe modal com instruções passo-a-passo
- Android (Chrome): dispara `beforeinstallprompt` nativo
- Desktop: prompt de instalação do navegador
