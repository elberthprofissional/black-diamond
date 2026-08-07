# Changelog

Todas as mudancas notaveis neste projeto serao documentadas neste arquivo.

O formato e baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [3.36.0] - 2026-08-06

### Fix (Auditoria 360°)
- **Fluxo de agendamento público corrigido** — a tela de sucesso (passo 6) era inalcançável porque o `onComplete` setava o passo 5; o wizard agora tem 4 passos reais (Dados → Serviços → Data/Hora → Revisão) e a confirmação avança para o sucesso corretamente.
- **Passo de barbeiro oculto com 1 barbeiro** — a etapa "Escolha o barbeiro" foi removida do fluxo público; só aparece quando há mais de um barbeiro ativo (multi-barbeiro segue suportado via migration `007`).
- **`react-router-dom@7` → `react-router@8.3.0`** — elimina a última vulnerabilidade high de produção (`GHSA-qwww-vcr4-c8h2`, CSRF em RSC; app é SPA sem RSC, mas a versão 7.18.2 continua na faixa afetada). `npm audit --omit=dev` agora reporta **0 vulnerabilidades**.
- **CI corrigido** — o job `security` rodava `npm audit` completo e falhava por vulns **dev-only** (Lighthouse CI, undici, uuid), bloqueando o deploy documentado. Agora audita apenas dependências de produção e os triggers cobrem `main`, `master` e `develop`.
- **AuthGuard valida `is_admin`** — antes qualquer usuário autenticado (mesmo não-admin) abria as telas admin; agora o guard consulta `is_admin()` (GRANT EXECUTE garantido na migration `008`) e desloga não-admins.
- **Policy pública de `bookings` removida (migration `008`)** — a chave anon podia ler `notes`, `total_price`, `discount_amount` e `client_id` de TODOS os agendamentos (histórico completo). Consultas públicas passam por RPCs `SECURITY DEFINER` com rate limit.
- **Migration `007` integrada ao mega-arquivo** — `_RODAR_NO_SQL_EDITOR.sql` agora cobre 001→008 (antes parava na 006), eliminando a inconsistência entre ambientes.

### Security
- `GRANT EXECUTE ON FUNCTION is_admin() TO authenticated` para suportar a validação do AuthGuard.

### Tests
- `useWizardStep.test.ts` atualizado para o fluxo de 4 passos.
- **116 arquivos, 1211 testes — 100% passando. TypeScript 0 erros. ESLint 0 erros. Audit de produção 0 vulnerabilidades.**

## [3.35.1] - 2026-08-06

### Removed
- **Frase de efeito padrão removida da seção Sobre Nós** — A citação "Não sou o melhor, mas sou o melhor para você" não aparece mais no site:
  - Banco de produção: `settings.barber_quote` e `barbers.quote` (Tato) limpos.
  - `About.tsx`: `FALLBACK_QUOTE` removido — a frase só aparece se for configurada manualmente nas Configurações.
  - `SettingsConta.tsx`: placeholder do campo "Frase" atualizado.
  - Scripts de setup (`configurar-admins.mjs`, `sql-configurar-admins.sql`): não inserem mais a frase ao criar o barbeiro.

### Tests
- `About.test.tsx` atualizado (asserção negativa + teste de frase personalizada).
- **116 arquivos, 1213 testes — 100% passando. TypeScript 0 erros. ESLint 0 erros.**

## [3.35.0] - 2026-08-05

### Added — Porta Única (acesso universal cliente + admin)
- **Nova tela `/entrar`** (`UniversalLogin`) — um único campo inteligente que substitui as 2 telas de entrada:
  - **Celular (11 dígitos)** → entra como CLIENTE direto no dashboard (sem senha, salva sessão e vai pra `/cliente`).
  - **E-mail** → a senha aparece na mesma tela → entra como ADMINISTRADOR.
  - Link "Prefere agendar sem login? Agendar agora" embaixo.
- **`/admin/login` agora é a Porta Única em modo admin** — `AdminLogin.tsx` virou wrapper (`<UniversalLogin adminMode />`). AuthGuard, deep-links e o teste existente continuam funcionando.
- **Menu de entrada** — "Meus agendamentos" virou **"Entrar"** (acesso universal).

### Refactored
- **`useAdminLogin`** (novo hook) — toda a lógica de login do admin extraída (signInWithPassword, rate limit client+server, bloqueio por pagamento, auditoria, esqueci a senha). `AdminLogin.tsx` caiu de ~180 para 10 linhas.
- **`LoginBackground`** ganhou prop `subtitle` (tagline amigável pro cliente).

### Security
- **Inalterada e intocável:** o painel admin continua exigindo **e-mail + senha** (Supabase Auth). Celular NUNCA dá acesso administrativo — a senha é o muro.

### Tests
- Novo `UniversalLogin.test.tsx` (7 testes: celular→cliente, e-mail→admin, erro, modo admin, redireciona com sessão). `AdminLogin.test.tsx` segue verde sem alterações.
- **115 arquivos, 1206 testes — 100% passando. TypeScript 0 erros. ESLint 0 erros, 0 warnings. Build ok (precache 81).**

## [3.34.0] - 2026-08-05

### Changed — Login Opcional do Cliente redesenhado
- **"Código de acesso" falso removido** — Era gerado e exibido na própria tela (segurança teatral: qualquer um digitava o código que acabou de ver). Agora:
  - **`/cliente`**: digita o telefone → entra **direto no dashboard** (sem etapa de código). Sessão salva por 7 dias — quem já agendou volta direto ao dashboard.
  - **Menu de entrada simplificado** (`BookingPreScreenMenu`) — de 3 opções confusas para 2: **"Agendar agora"** (vai direto ao wizard, com pré-preenchimento nome/telefone quando há sessão) + **"Meus agendamentos"**. Link do admin movido para o rodapé (já existia lá).
  - **Link mágico na tela de sucesso** (`SuccessStep`) — card "Seu link de gerenciamento" com botão **Copiar** → `/gerenciar?token=...` (cancelar/reagendar sem login). A infra `booking_tokens` já existia no banco e era usada apenas no `/cancelar` — agora o cliente recebe o link ao agendar.
  - **Botão "Meus agendamentos"** na tela de sucesso (desktop + mobile).
  - **`BookingWizardContext`** agora guarda `bookingResult` (token + manageUrl) e salva a sessão do cliente ao confirmar.

### Removed
- **~250 linhas de fluxo duplicado** — `CodeVerifyForm`, `DetectedView`, `ExistingPhoneForm`, `NewClientForm`, `StyledInput` (BookingPreScreen) e `VerifyStep` + estado de código (ClientProfile). O `Step` type perdeu o `'verify'`.

### Added
- **`src/lib/clientSession.ts`** — Sessão do cliente centralizada (`getClientSession` / `saveClientSession` / `clearClientSession`), eliminando chaves localStorage duplicadas.

### Tests
- `BookingPreScreen.test.tsx` reescrito (menu 2 opções + pré-preenchimento com sessão) e novo `ClientProfile.test.tsx` (telefone → dashboard, sessão restaurada).
- **114 arquivos, 1199 testes — 100% passando. TypeScript 0 erros. ESLint 0 erros, 0 warnings. Build ok (precache 80).**

## [3.33.1] - 2026-08-05

### Security
- **Auditoria completa do banco (service role)** — Schema vs migrations 52/52 ✅, integridade de dados ok, assinaturas PIX ativas até 31/08.
- **CRITICO: Vazamento de clientes corrigido** — A chave anon (pública) conseguia LER todos os clientes (nome, telefone, e-mail, notas) e ESCREVER em `clients` (INSERT/UPDATE/DELETE). Nova migration `006_rls_estricto.sql`:
  - Habilita RLS em `clients` e `bookings` + remove policies permissivas órfãs.
  - `clients`: apenas admin (`is_admin()`); `bookings`: admin full + leitura pública filtrada por status/data (design).
  - Nova RPC `cadastrar_cliente_publico()` (SECURITY DEFINER, upsert idempotente por telefone) — substitui o INSERT direto do fluxo "Sou novo aqui" (`BookingPreScreen`).
  - Nova RPC `get_client_dashboard()` (SECURITY DEFINER) — stats + histórico do `/cliente` sem expor a tabela (`ClientProfile`).
- **ALTO: Insert anon em bookings bloqueado** — Anon não pode mais criar agendamentos direto na tabela, pulando a RPC validadora (rate-limit, horário, cupom, mensalista).
- **FIX: "function check_client_no_show_block(uuid) does not exist"** — A migration 005 dropou `check_client_no_show_block`, mas `criar_agendamento_rate_limited` ainda a chama para clientes existentes (cliente novo passava, cliente antigo quebrava). Recreada como **no-op** na migration 006 (bloqueio por faltas desativado — só notifica).
- **Scripts de auditoria** — `audit-full-supabase.mjs` atualizado (função `is_client_blocked_by_no_show` removida de propósito na 005); novo `audit-rls.mjs` (mapeia exposição anon por tabela) e `audit-profundidade.mjs`.
- **Testes** — `BookingPreScreen.test.tsx` e `api.test.ts` atualizados para as novas RPCs.

### Cleanup
- **CSS morto removido (575 → ~350 linhas)** — `src/index.css`: removidas 23 classes e keyframes sem uso no código (`animate-marquee`, `animate-slow-zoom`, `animate-text-marquee`, `card-dark`, `input-dark`, `surface-dark`, `divider-gold`, `polaroid-card`, `bg-dark-texture`, `bg-gold-gradient`, `text-gold-gradient`, `custom-scrollbar`, `notifications-tabs`, `pb-safe`, `pt-safe`, `table-container`, `corner-ticks`, `mega-number`, `reveal`/`reveal-delay-*`, keyframes `float`/`slow-zoom`/`marquee`/`text-marquee`). Mantidos os usados (`btn-gold`, `btn-ghost`, `label-gold`, `skeleton-pulse`, `tape-effect`, `nav-underline`, `scrollbar-hide`, `animate-slide-in`, `skip-link`, `scaleIn`, `drawCheck`).
- **25 scripts obsoletos removidos** — `scripts/` de 42 → 17: one-shots (`fix-tato-duplicate`, `fix-notification-format`, `fix-testimonials-rls`, `find-duplicates`, `debug-*`, `remove-brand-settings`, `add-missing-columns`, `apply-fix-direct`), runners de migrations antigas (`run-migration-007/008/009`, `run-migration-mensalista(-v2)`, `run-migration-monthly`, `run-migration-subscriptions`, `run-migration-check/direct/now`), consolidadores (`consolidate-migrations(-v2)`, `build-final-migrations`), `optimize-images(-now)` (sharp não é mais dependência) e `setup-asaas` (Asaas removido).

## [3.33.0] - 2026-08-04

### Removed
- **Multi-barbeiro removido** — O sistema agora opera com **barbeiro único** (Tato). Removidas todas as funcionalidades de múltiplos barbeiros:
  - **Etapa "Escolha o barbeiro"** do agendamento público — wizard reduzido de 5 para 4 passos (Dados → Serviços → Data/Hora → Revisão). `BarberStep.tsx` deletado.
  - **Filtro de barbeiro** do AdminDashboard — `BarberFilter.tsx` deletado; o dashboard mostra todos os agendamentos.
  - **Seletor de barbeiro** no agendamento do admin (AdminBookingDesktop/Mobile) + estado `selectedBarber` em `useAdminBookingState`.
  - **Página "Barbeiros"** nas Configurações — `SettingsBarbeiros.tsx` deletado (menu, títulos e lazy imports removidos de `SettingsList` e `AdminProfileSettings`).
  - **Rota `/barber`** (painel do funcionário) — `BarberGuard.tsx` e `BarberDashboard.tsx` (+ testes) deletados; rota, preload e título removidos de `App.tsx`. Logo do sidebar navega sempre para `/admin`.
  - **API de gestão** — `upsertBarber` e `deleteBarber` removidos de `src/lib/api/barbers.ts` (e export em `index.ts`).

### Fixed
- **Slots ignoravam agendamentos antigos** — No wizard público, a consulta de horários deixou de filtrar por `barber_id`. Agora `get_available_slots` considera **todos** os agendamentos (os 26 existentes não tinham `barber_id`), eliminando o risco de mostrar horário ocupado como livre.

### Changed
- **Notificações do barbeiro** — `useAdminBookingSubmit` e `useBookingPayment` enviam push/WhatsApp sempre para o barbeiro único (Tato), com URL de destino `/admin` (rota `/barber` não existe mais).
- **AdminWeekly** — Removido filtro por barbeiro; mostra todos os agendamentos.
- **Menu público (BookingPreScreenMenu)** — Texto "Acesso para barbeiros e admin" → "Acesso administrativo".
- **E2E** — `critical-flows.spec.ts`: teste de seleção de barbeiro substituído por validação da etapa de serviços (4 passos).

### Tests
- **113 arquivos, 1193 testes** — 100% passando. TypeScript 0 erros. ESLint 0 erros (1 warning pré-existente em `BookingPreScreen.tsx`). Build ok (precache 84 → 79 entradas).

## [3.32.0] - 2026-07-30

### Performance
- **BookingPreScreen** — Componente monolítico de 831 linhas dividido em 2 arquivos: `BookingPreScreen.tsx` (373 linhas, -55%) + `BookingPreScreenMenu.tsx` (167 linhas, memoizado). Reduz bundle da primeira tela que o cliente vê.
- **ClientProfile** — Componente monolítico de 935 linhas dividido em 3 arquivos: `ClientProfile.tsx` (313 linhas, -67%) + `ClientProfileDashboard.tsx` (341 linhas, memoizado) + `ClientProfileTypes.ts` (26 linhas). Perfil do cliente agora carrega sob demanda.
- **memo() adicionado em 5 componentes pesados** — `ClientPanel`, `AdminWeekly`, `BarberDashboard`, `SettingsServicos`, `SettingsHorarios` (já tinha). Estes 5 componentes somam 2.585 linhas agora protegidas contra re-render desnecessário.
- ~1.000 linhas economizadas no bundle total.
- **React import fix** — `React.forwardRef` / `React.ReactNode` / `React.ChangeEvent` / `React.FormEvent` substituídos por named imports (`forwardRef`, `ReactNode`, `ChangeEvent`, `FormEvent`), eliminando `ReferenceError` nos testes.

### Changed
- **BookingPreScreen** — Menu extraído para `BookingPreScreenMenu.tsx` com `memo()`. Componentes internos (StyledInput, StepDots, ExistingPhoneForm, CodeVerifyForm, DetectedView, NewClientForm) todos memoizados.
- **ClientProfile** — Dashboard extraído para `ClientProfileDashboard.tsx` com `memo()`. Tipos movidos para `ClientProfileTypes.ts`.
- **ClientPanel** — Envolto em `memo()` para evitar re-render nos painéis laterais.
- **AdminWeekly** — Envolto em `memo()` para evitar re-render na agenda semanal.
- **BarberDashboard** — Envolto em `memo()` para evitar re-render no dashboard.
- **SettingsServicos** — Envolto em `memo()` para evitar re-render nas configurações.
- **SettingsHorarios** — Já tinha `memo()`, mantido.

### Tests
- **114 arquivos, 1205 testes** — 100% passando. TypeScript 0 erros. Build 2.33s.

### Removed
- **Código morto** — 4 arquivos deletados (350 linhas): `QuickNav.tsx`, `PanelIcons.tsx`, `useAsyncData.ts`, `useAsyncEffect.ts`. Nenhum era importado por nenhum outro arquivo.
- **PanelIcons** — Substituído por Lucide React direto em `BookingDetailPanel.tsx` e `BlockedSlotView.tsx`.

### Documents
- DOCUMENTACAO.md e CHANGELOG.md atualizados com novo split de componentes.

## [3.31.0] - 2026-07-30

### Performance
- **G1** — `BookingPreScreen.tsx` — `Date.now()` em render puro corrigido. Agora o timer de expiração do código roda via `useEffect` + `setInterval` com cleanup, eliminando o warning `react-hooks/purity` e o risco de re-renders em loop.
- **G2** — `useServices.ts` + `useBookings.ts` — `cache` do localStorage memoizado com `useMemo`. Antes, `placeholderData: cache ?? undefined` gerava referência instável a cada render, podendo disparar refetch desnecessário.
- **G3** — `vite.config.ts` — Manual chunks explícitos adicionados para `@tanstack/react-query` e `lucide`. `vendor-other` reduziu de 167KB para 164KB e `vendor-query` agora tem chunk próprio (3.74KB).
- **G5** — `ClientPanel.tsx` separado em chunk lazy via `React.lazy()` em `AdminClients.tsx`. Reduziu o bundle de `AdminClients` de 62KB para 40KB (-35%).
- Build time: 2.55s → 2.19s.

### Fixed
- **G6** — `useNotifications.ts:81` — `notifications = query.data ?? []` agora é `useMemo`, eliminando warning `react-hooks/exhaustive-deps` no effect que depende da lista.
- **G6** — `useProfileStats.ts:144-145` — `bookings` e `services` agora são memoizados. Resolve dois warnings `react-hooks/exhaustive-deps` no `useMemo` de `stats`.
- **G6** — `useGallery.ts:118` — adicionado `images` à lista de deps do `useCallback` (era usado internamente mas faltava).
- **G6** — `BookingWizardContext.tsx:204` — adicionado `selectedBarber?.user_id` à lista de deps (era usado em `handleConfirm` mas faltava).
- **G6** — `useConnectionStatus.ts:76` — `retryTimerRef` capturado no início do effect (não no cleanup). Antes, valor do ref podia ter mudado entre setup e cleanup.
- **G7** — `useNotificationPrefs.ts:48` e `useReschedule.ts:30` — `setState` em effect marcado com `eslint-disable` comentado (padrão legítimo de fetch no mount).

### Removed
- **P7** — Edge Functions Asaas mortas removidas: `supabase/functions/create-asaas-payment/` e `supabase/functions/asaas-webhook/` (358 linhas deletadas).
- **P7** — `createAsaasPayment` + `PaymentResult` removidos de `src/lib/api/subscriptions.ts`. PIX manual é o caminho oficial desde v3.29.0.
- **P7** — `useSubscription.ts` refatorado para remover `generatePayment`, `paymentResult` e `paymentError` (código morto da integração Asaas).
- **P5** — Arquivos lixo da raiz removidos: `vite.log`, `nul`, `%TEMP%gold_files.txt`.

### Added (infra)
- **G9** — `supabase/migrations/008_performance_indexes.sql` — 9 índices novos + view `dashboard_daily_stats` + funções `bulk_cleanup_expired_tokens` e `get_dashboard_data(p_barber_id, p_date)` para substituir múltiplas queries do AdminDashboard por uma única chamada RPC.
- **`src/lib/fire-and-forget.ts`** — Utilitário para promises fire-and-forget com logging centralizado (12+ importadores).
- **`src/lib/api/notifications.ts`** — CRUD completo de notificações com tratamento de erro.
- **`src/lib/api/blocked-users.ts`** — Lógica de bloqueio por falta de pagamento (PIX).
- **`src/hooks/useForm.ts`** — Hook genérico de form com validação.
- **`src/hooks/useBarberStats.ts`** — Stats mensais por barbeiro.
- **`src/hooks/useSetting.ts`** — Hook CRUD para `settings` table.
- **`src/components/Admin/shared/PauseModal.tsx`** — Modal premium para pausar agenda por período.

### Tests
- **114 arquivos, 1205 testes** — 100% passando. TypeScript 0 erros. ESLint 0 erros, 0 warnings.

### Code Quality
- ESLint: 13 erros → 0. Warnings: 20 → 0.

### Performance
- **G1** — `BookingPreScreen.tsx` — `Date.now()` em render puro corrigido. Agora o timer de expiração do código roda via `useEffect` + `setInterval` com cleanup, eliminando o warning `react-hooks/purity` e o risco de re-renders em loop.
- **G2** — `useServices.ts` + `useBookings.ts` — `cache` do localStorage memoizado com `useMemo`. Antes, `placeholderData: cache ?? undefined` gerava referência instável a cada render, podendo disparar refetch desnecessário.
- **G3** — `vite.config.ts` — Manual chunks explícitos adicionados para `@tanstack/react-query` e `lucide`. `vendor-other` reduziu de 167KB para 164KB e `vendor-query` agora tem chunk próprio (3.74KB).
- **G5** — `ClientPanel.tsx` separado em chunk lazy via `React.lazy()` em `AdminClients.tsx`. Reduziu o bundle de `AdminClients` de 62KB para 40KB (-35%).
- Build time: 2.55s → 2.19s.

### Fixed
- **G6** — `useNotifications.ts:81` — `notifications = query.data ?? []` agora é `useMemo`, eliminando warning `react-hooks/exhaustive-deps` no effect que depende da lista.
- **G6** — `useProfileStats.ts:144-145` — `bookings` e `services` agora são memoizados. Resolve dois warnings `react-hooks/exhaustive-deps` no `useMemo` de `stats`.
- **G6** — `useGallery.ts:118` — adicionado `images` à lista de deps do `useCallback` (era usado internamente mas faltava).
- **G6** — `BookingWizardContext.tsx:204` — adicionado `selectedBarber?.user_id` à lista de deps (era usado em `handleConfirm` mas faltava).
- **G6** — `useConnectionStatus.ts:76` — `retryTimerRef` capturado no início do effect (não no cleanup). Antes, valor do ref podia ter mudado entre setup e cleanup.
- **G7** — `useNotificationPrefs.ts:48` e `useReschedule.ts:30` — `setState` em effect marcado com `eslint-disable` comentado (padrão legítimo de fetch no mount).

### Removed
- **P7** — Edge Functions Asaas mortas removidas: `supabase/functions/create-asaas-payment/` e `supabase/functions/asaas-webhook/` (358 linhas deletadas).
- **P7** — `createAsaasPayment` + `PaymentResult` removidos de `src/lib/api/subscriptions.ts`. PIX manual é o caminho oficial desde v3.29.0.
- **P7** — `useSubscription.ts` refatorado para remover `generatePayment`, `paymentResult` e `paymentError` (código morto da integração Asaas).
- **P5** — Arquivos lixo da raiz removidos: `vite.log`, `nul`, `%TEMP%gold_files.txt`.

### Added (infra)
- **G9** — `supabase/migrations/008_performance_indexes.sql` — 9 índices novos + view `dashboard_daily_stats` + funções `bulk_cleanup_expired_tokens` e `get_dashboard_data(p_barber_id, p_date)` para substituir múltiplas queries do AdminDashboard por uma única chamada RPC.
- **`src/lib/fire-and-forget.ts`** — Utilitário para promises fire-and-forget com logging centralizado (12+ importadores).
- **`src/lib/api/notifications.ts`** — CRUD completo de notificações com tratamento de erro.
- **`src/lib/api/blocked-users.ts`** — Lógica de bloqueio por falta de pagamento (PIX).
- **`src/hooks/useForm.ts`** — Hook genérico de form com validação.
- **`src/hooks/useBarberStats.ts`** — Stats mensais por barbeiro.
- **`src/hooks/useSetting.ts`** — Hook CRUD para `settings` table.
- **`src/components/Admin/shared/PauseModal.tsx`** — Modal premium para pausar agenda por período.

### Tests
- **114 arquivos, 1205 testes** — 100% passando. TypeScript 0 erros. ESLint 0 erros, 0 warnings.

### Code Quality
- ESLint: 13 erros → 0. Warnings: 20 → 0.

## [3.30.1] - 2026-07-30

### Fixed
- **Lint** — 13 erros ESLint corrigidos (12 escapes `no-useless-escape` em `e2e/critical-flows.spec.ts` + 1 import duplicado em `useAuditLog.ts`).
- **Tests** — 5 Unhandled Rejection em `useAuditLog.test.ts` corrigidos via `mockResolvedValue(undefined)` no `beforeEach`.
- **Build** — `package.json` bumpado para 3.30.1.
- **Cleanup** — Arquivos lixo (`vite.log`, `nul`, `%TEMP%gold_files.txt`) removidos da raiz.

### Removed
- **`src/components/GoogleReviewBadge.tsx`** — Componente morto.
- **`src/components/ReviewRequestModal.tsx`** — Modal morto.
- **`.eslintrc.cjs`** — Substituído por `eslint.config.js` (flat config).

## [3.30.0] - 2026-07-28

### Added
- **BookingPreScreen — Novo fluxo de entrada inteligente** — Ao clicar em "Agendar" na Navbar, um modal premium com 3 opções aparece:
  - **Já sou cliente**: input de telefone → detecção automática → código de 4 dígitos na tela → verificação → redireciona p/ `/agendar` com dados pré-preenchidos
  - **Sou novo aqui**: formulário rápido de nome + telefone → redireciona p/ `/agendar` com dados
  - **Agendar sem cadastro**: vai direto p/ o booking (sem pré-preenchimento)
  - Fidelidade teaser: "Clientes cadastrados acumulam visitas e ganham serviços grátis"
- **Reconhecimento inteligente de cliente** — Quando o telefone é digitado, o sistema consulta o banco via `getClientByPhone`. Se o cliente existe, mostra "Bem-vindo de volta, [nome]!" com animação premium.
- **Código de acesso na tela** — Código de 4 dígitos exibido em caixas douradas, com timer de expiração e opção "Gerar novo código".
- **BookingWizardContext pré-preenchido** — O wizard de agendamento agora lê `location.state` para receber nome e telefone do BookingPreScreen, eliminando a necessidade de redigitar.

### Changed
- **Navbar** — Link "Agendamentos" removido da navegação desktop. Agora o acesso ao perfil do cliente é feito através do BookingPreScreen.
- **Home** — Botão "Agendar" agora abre o modal BookingPreScreen em vez de navegar direto para `/agendar`.
- **`BookingWizardContext.tsx`** — Agora importa `useLocation` e inicializa `userInfo` a partir do estado da rota, permitindo pré-preenchimento.

### Added (infra)
- **`src/components/Booking/BookingPreScreen.tsx`** — Novo componente com 480+ linhas, animações framer-motion, 5 estados de tela (menu, existing-phone, code-verify, detected, new-client), cleanup de timeouts via useEffect.
- **`src/components/Booking/BookingPreScreen.test.tsx`** — 9 testes unitários cobrindo: renderização do menu, guest flow, navegação entre telas, botão voltar, validação de formulários (nome vazio, telefone inválido), submit com dados válidos.

### Tests
- **114 arquivos, 1226 testes** — 100% passando. TypeScript 0 erros.

## [3.29.0] - 2026-07-27

### Added
- **Unificação CancelPage + ManageBooking** — `CancelPage.tsx` agora aceita token via `?token=xxx` nos URL params, unificando as duas paginas em uma rota so.
  - Rota `/gerenciar/:token` redireciona para `/cancelar?token=xxx` via `GerenciarRedirect`.
  - `ManageBooking.tsx` e `ManageBooking.test.tsx` removidos.
  - UI premium do ManageBooking mesclada: cards com brilho gradiente, linha dourada, estado de loading com animacao.
  - Busca automatica quando phone chega via state (ex: do ClientProfile).
  - Estados de erro para token invalido com design premium.
- **Historico completo no /cliente** — Acordeao expansivel com agendamentos passados (concluidos/cancelados).
  - Consulta via Supabase direto com fallback silencioso se RLS bloquear.
  - Exibe data, horario, valor e status badge.
- **Botao Reagendar no /cliente** — Navega para `/cancelar` com busca automatica por telefone.
  - Gradiente dourado e icone ChevronRight no botao.
  - Fluxo completo: /cliente → /cancelar → auto-busca → reagendar.
- **Botao Compartilhar no Hero** — Copia o link do site para a area de transferencia.
  - Feedback visual "Copiado!" com icone Check por 2 segundos.
  - Fallback para navegadores sem Clipboard API.

### Removed
- **ManageBooking.tsx** — Pagina removida (unificada com CancelPage).
- **ManageBooking.test.tsx** — Testes removidos (funcionalidade coberta pelos testes do CancelPage).
- **Onboarding Page** (`/admin/onboarding`) — Removido completamente (arquivo + rotas + imports).
- **HelpModal/Ajuda** — Removido das configuracoes.
- **MarqueeStrip.tsx** — Componente morto deletado.
- **HeroProps** — Interface vazia removida.
- **Hover zoom nas fotos da galeria** — Efeito removido para experiencia mais fluida.

### Changed
- **Assinatura simplificada (PIX)** — Asaas removido. R$50/mes via PIX com confirmacao manual do dono.
- **SubscriptionGuard** — Tela de bloqueio com chave PIX quando subscription expira.
- **SettingsAssinaturas** — So visivel para elberthmayan2007@gmail.com.
- **Migration 008_pix_setup.sql** — Chave PIX + subscription ativa ate fim do mes.
- **Responsivo mobile** — Hero mais compacto, galeria com polaroids 15px mais estreitas.
- **Footer** — Paleta cinza escuro. Aberto/Fechado movido para o Hero.
- **Hero** — Badge Aberto/Fechado + botao Compartilhar lado a lado.
- **Navbar** — Logo ampliada. Badge aberto/fechado removido.
- **ClientProfile** — Dashboard com historico, stats cards, reagendar, cancelar.
- **SettingsHorarios** — Refactor: acesso a ref movido para useEffect.
- **AdminClients** — `Date.now()` durante render substituido por `useState(Date.now())`.

### Fixed
- **Footer.test.tsx** — Corrigido: "Admin" → "Acesso restrito".
- **BookingPage.test.tsx** — Corrigido: adicionado `BarberProvider` wrapper.
- **Hero.test.tsx** — Corrigido: `vi` nao utilizado removido.
- **ClientProfile.tsx** — Corrigido: variavel `digits` nao utilizada removida.
- **CancelPage.test.tsx** — Corrigido: logo alt text adicionado ao header.
- **Lint warnings** — 3 warnings corrigidos (vi não usado, refs em render, Date.now em render).

## [3.27.1] - 2026-07-25

### Fixed
- **Sentry: realtime subscribe race condition** — Adicionado lock `isSettingUp` no useNotifications pra evitar que dois NotificationBell (sidebar + navbar) criem canais duplicados. Corrigido retry: limpa canal stale antes do async gap pra reconexão funcionar.
- **Sentry: unhandled promise rejection** — Adicionado `.catch()` no `loadData()` do AdminWeekly e no `getUser()` do useBookingModals. Rejeições Supabase agora são tratadas silenciosamente.
- **Sentry: removeChild DOM error** — Trocado `AnimatePresence mode="wait"` por `mode="popLayout"` no BookingPageContent (desktop + mobile). Remove elemento do fluxo de layout imediatamente na saída, evitando conflito DOM no unmount rápido.
- **Removido variável não utilizada** — `retryCountRef` no useConnectionStatus.

### Changed
- **CompleteBanner reposicionado** — Movido pra baixo do DashboardHeader no AdminDashboard, dando contexto do dia antes do alerta.
- **AdminClients tabs unificados** — "Mensalistas" e "Vencendo" agora ficam na mesma row dos tabs "Todos/Lembrados/A Lembrar", com scroll horizontal no mobile.
- **SettingsMensalista redesign** — Empty state mais minimalista, sem borda no card vazio.
- **Navbar mobile gap** — Aumentado espaçamento entre sino de notificações e foto de perfil.
- **AdminProfile mobile** — Removido botão de engrenagem ao lado de "Meu perfil".

## [3.27.0] - 2026-07-25

### Added
- **Mensalista Reborn** — Sistema completo de planos mensais: CRUD de planos com nome, preço, duração, serviços inclusos e dias permitidos. Badges com status de expiração (🟢 ativo / 🟡 vencendo / 🔴 vencido). Filtros "Mensalistas" e "Vencendo" na página de clientes. Booking inteligente detecta plano do cliente automaticamente. Modal de seleção de plano ao ativar mensalista.
- **Auto-cancel com buffer de 2h** — Agendamentos confirmados que passaram 2h do horário sem finalização são automaticamente marcados como `cancelled` (não mais `completed`). Remove o `CompleteBanner` do frontend. O barbeiro tem 2h de tolerância pra finalizar manualmente.
- **No-show inteligente (sem bloqueio)** — Ao atingir o limite de faltas, o sistema NOTIFICA o barbeiro com opção "Conversar no WhatsApp" ao invés de BLOQUEAR o cliente. O barbeiro pode recuperar o cliente ao invés de perdê-lo.
- **SettingsMensalista premium** — UI com glassmorphism, bottom sheet no mobile, preview de preço em tempo real, animações framer-motion, skeleton shimmer.
- **MensalistaFilterTabs** — Componente de filtro "Mensalistas" e "Vencendo" na página de clientes.

### Changed
- **completar_agendamentos_expirados** — Migrations 008/009: mudança de `'completed'` para `'cancelled'` nos bookings do dia atual (2h após horário). Dias anteriores continuam como `'completed'` (cleanup).
- **check_client_no_show_block** — Agora é um no-op (não bloqueia mais clientes). A notificação com WhatsApp DM substitui o bloqueio automático.
- **is_client_blocked_by_no_show** — Sempre retorna `false`. Cliente nunca é bloqueado por faltas.
- **useDashboardData.ts** — Removido `expiredCount`, `loadExpiredCount`, `handleAutoComplete`, `dismissExpiredBanner` (banner substituído pelo auto-cancel silencioso).

### Removed
- **CompleteBanner.tsx** — Componente deletado. Banner de "X agendamentos atrasados" substituído pelo auto-cancel automático com 2h de buffer.

### Fixed
- **Cliente bloqueado por falta perdia o cliente** — Agora o barbeiro recebe notificação com WhatsApp em vez de bloquear, permitindo recuperar o cliente.

### Tests
- **1.211 testes passando** — 111 arquivos, 100% verde.
- **TypeScript 0 erros** — Compilação limpa.

## [3.26.0] - 2026-07-25

### Changed
- **Depoimentos — layout reordenado** — Nome do cliente movido para o topo dos cards (acima das estrelas). Ícone de aspas decorativo (`Quote`) removido dos cards.
- **Depoimentos — header Google Reviews** — Seção "de X depoimentos" substituída por badge estilizado com ícone Google, nota média e texto "X avaliações no Google".
- **Galeria — lightbox removido** — Lightbox (modal de preview em tela cheia) removido da galeria pública. Imagens ficam apenas para visualização com hover zoom. Lightbox mantido apenas no painel admin.
- **Footer — horários dinâmicos** — Labels de dias agora são calculados dinamicamente baseados nos dias habilitados (antes era hardcoded "Seg - Sáb"). Suporte a domingo.
- **Service Worker — response.clone()** — Adicionado `.clone()` antes de `cache.put()` para evitar erro "Response body already consumed".
- **Testimonials API — ordenação** — Ordenação alterada de `publish_time` para `created_at` (mais confiável).
- **Google Fonts — crossorigin removido** — Removido atributo `crossorigin` do preload de fontes (causava warning).

### Removed
- **Galeria — lightbox** — Modal de preview em tela cheia removido da galeria pública (mantido no admin).
- **Galeria — imports mortos** — `X`, `ChevronLeft`, `ChevronRight`, `useModalA11y` removidos.
- **Mensalista plans API** — `getMensalistaPlans` retorna array vazio (tabela removida do banco).
- **useRevenueChartData** — Hook removido (gráfico de faturamento removido anteriormente).

### Fixed
- **Service Worker body consumed** — Corrigido bug onde `response` era consumido sem `.clone()` antes de salvar no cache, causando erros silenciosos em beberapa fetch strategies.

## [3.25.0] - 2026-07-25

### Added
- **Auto-complete de agendamentos expirados** — Novo componente `CompleteBanner` no dashboard que detecta bookings confirmados com horário já passado e oferece completar automaticamente via RPC `completar_agendamentos_expirados`.
- **Botão "Tirar Folga" no Dashboard** — `DayOffButton` permite bloquear/liberar o dia inteiro com 2 cliques direto do header, sem precisar ir na aba "Livres".
- **Trigger anti-burro de nomes** — `normalize_client_name()` normaliza automaticamente nomes de clientes para proper case (TATO → Tato, joão silva → João Silva) respeitando preposições portuguesas (de, da, do, das, dos, e).
- **Hooks genéricos** — `useAsyncData` (com AbortController + cache localStorage + auto-refresh) e `useAsyncEffect` para padronizar data fetching.
- **APIs centralizadas** — `src/lib/api/settings.ts` e `src/lib/api/gallery.ts` criados. Hooks `useGalleryData`, `useClientsData`, `useBookingSlots` migrados para usar API centralizada em vez de `supabase.from()` direto.

### Fixed
- **RLS dos depoimentos** — Política `Public can read active testimonials` agora especifica `TO anon, authenticated`. Antes estava sem `TO`, bloqueando leitura pública dos 12 depoimentos no site.
- **Testimonials anon key** — Anon key agora consegue ler testimonials (erro "Invalid API key" corrigido usando a chave anon correta do .env).
- **Cliente TATO duplicado** — Unificado com cliente Tato (booking reassinado, duplicata removida).
- **AdminProfile.test.tsx** — 2 testes corrigidos (case-sensitive + getAllByText).
- **useGalleryData.test.ts** — Mensagem de erro atualizada para `'Erro ao enviar imagem'`.
- **AdminWeekly.tsx** — `safeVisibleIndex` movido antes de `selectedDate` para evitar TDZ.
- **CancelPage.tsx** — `displayView` derivado usado em todo o JSX (não só no header).

### Refactored
- **~30 setStateInEffect refatorados** — Padrões convertidos: valores computados removidos para render, derived state com useRef, data loading mantido mas sem eslint-disable.
- **3 componentes mortos removidos** — `PwaInstallModal.tsx`, `ConfirmDeleteModal.tsx`, `ProfileMobile.tsx`.
- **Exports não utilizados removidos** — `NoShowIcon`, `EditIcon`, `NotesIcon` de PanelIcons; `TopService`, `UseAdminProfileReturn`, `FilterValue`, `FilterTabsProps`, `ReminderFilterValue`, `ReminderFilterTabsProps`, `NextDaysConfig` tornados internos.
- **handleAsyncError removido** — `errorHandler.ts` deletado, `useSlotBlocking` refatorado com try-catch.
- **autoCompleteExpiredBookings** — Função morta removida de bookings.ts (substituída por `completarAgendamentosExpirados`).
- **package.json** — `axe-core` e `sharp` removidos das devDependencies.
- **react-router-dom** — Atualizado de `^7.11.0` para `^7.18.1`.
- **CSS duplicado** — Bloco `.scrollbar-hide` duplicado removido do `index.css`.

### Changed
- **"Folga" renomeado para "Tirar Folga"** — Botão no dashboard mais autoexplicativo.
- **DayOffButton** — Modal de confirmação com backdrop blur para evitar ações acidentais.
- **Mobile settings simplificado** — Removida redundância: "Conta", "Notificações", "Zona de Segurança" e "Sair" duplicavam atalhos já presentes na página de perfil. SettingsList agora exibe apenas configurações da Barbearia (Serviços, Barbeiros, Horários, Controle de Faltas, Fidelidade, Cupons, Galeria, Depoimentos).

### Cleanup
- **onLogoutClick prop morta** — Removida de SettingsList, AdminProfileSettings e AdminProfile.
- **Imports não utilizados** — User, Bell, Trash2, AlertTriangle, LogOut removidos do SettingsList.

### Tests
- **1.211 testes passando** — 111 arquivos, 100% verde.
- **TypeScript 0 erros** — Compilação limpa.
- **ESLint 0 erros** — Lint sem warnings.

## [3.24.0] - 2026-07-24

### Changed
- **Admin layout reestruturado** — Container principal expandido de 1100px para 1440px (~85% da tela Full HD). Padding xl maior (xl:px-12). Eliminadas areas mortas em monitores grandes.
- **Dashboard reestruturado** — Titulo "Agenda do Dia" e FilterTabs agora na mesma linha (flex-row). "X clientes hoje" movido para abaixo dos FilterTabs. Hierarquia visual: Titulo > Filtros > Resumo > Cards > Lista.
- **Cards do Dashboard com proporcoes** — "Proximo Cliente" usa flex-[2] e "Lucro do Dia" flex-1. Proporcao 2:1 de verdade. Cards sempre lado a lado, inclusive no mobile.
- **Mobile responsivo** — Cards do Dashboard empilham no mobile (flex-col sm:flex-row). Fontes menores em telas estreitas. FilterTabs empilham abaixo do titulo no mobile.
- **Agenda Semanal** — Titulo e data na mesma linha. FilterTabs com borda propria (border-b). Container usa o novo max-w de 1440px.
- **Meus Clientes** — Grid ajustado para 2/3/4/5 colunas (antes 3/4/5/6). Cards com 3 linhas (nome, telefone, ultimo corte separados). Container em 1440px.
- **FilterTabs redesenhado** — Labels em uppercase com tracking mais largo. Count badges menores e mais compactos.
- **ReminderFilterTabs** — Mesmo estilo dos FilterTabs principais.
- **Paineis (Ocupados/Livres/Bloqueados)** — spacing-y-3 entre itens. Horarios em cor dourada (#D4AF37) com font-black. Separadores verticais mais altos (h-4). Rounded-xl consistente.
- **OccupiedBookingRow** — Mais padding (py-3, px-4). Horario em dourado. Separador vertical entre hora e nome.
- **Services.tsx** — Lista centralizada com max-w-2xl mx-auto. Grid de clientes com gap-4 e p-4.
- **Localizacao** — Embed do Google Maps corrigido para usar endereco completo (Av. Brasilio da Gama, 139, Tupi, BH) em vez de coordenadas fixas que apontavam para a Pampulha.

### Added
- **Botao "Acesso Restrito" no Footer** — Link para /admin/login com icone de cadeado. Posicionado abaixo do copyright.

### Removed
- **Texto "Para mais, siga a gente no Instagram"** — Removido do componente Gallery.

## [3.23.2] - 2026-07-24

### Changed
- **Footer simplificado** — Removida secao de menu (Home, Sobre, Servicos, Galeria, Localizacao) e texto "BLACK DIAMOND" ao lado da logo. Logo aumentada (w-24/h-24 mobile, w-32/h-32 desktop). Grid ajustado para 3 colunas.
- **Location simplificado** — Removida grade de informacoes (endereco, horarios, WhatsApp, redes sociais) abaixo do mapa. Componente agora renderiza apenas o iframe do Google Maps.
- **Hero com fallback de cor** — BrandColor agora e validado; se nao for hex valido, usa dourado (#D4AF37) como fallback.
- **Mocks do Supabase completados** — AdminClients.test.tsx e Gallery.test.tsx agora incluem todos os metodos da query chain (gte, lte, in, etc), eliminando warnings nos testes.
- **Testes corrigidos** — Footer.test.tsx e Location.test.tsx atualizados para refletir mudancas nos componentes. Lint erros corrigidos (curly braces).

## [3.23.1] - 2026-07-24

### Added
- **6 novos arquivos de teste** — `testimonials.test.ts`, `barbers.test.ts`, `NotificationDetail.test.tsx`, `NotificationFilters.test.tsx`, `NotificationItem.test.tsx`, `HistoryView.test.tsx`.
- **85 novos testes** — Cobertura de 0% para 100% nos componentes de notificação, histórico e APIs de barbeiros/depoimentos.

### Changed
- **Cobertura melhorada** — Branches: 50.84% → 55.13% (+4.29%), Functions: 57.56% → 60.34% (+2.78%).
- **Testes totais**: 1077 → **1162** (105 arquivos).
- **Formatação corrigida** — `npm run format` aplicado em 22 arquivos com formatação inconsistente.

## [3.23.0] - 2026-07-22

### Added
- **Histórico de agendamentos no painel do cliente** — Clica em "Visitas" e vê todo o histórico: data, serviços, valor, status. Filtros por mês e status (Concluído/Cancelado/Ocultos). Paginação com "Carregar mais". Ocultar/restaurar agendamentos individualmente (localStorage, sem mexer no banco).
- **Reagendar rápido** — Botão "Reagendar" no painel do cliente pré-preenche cliente, telefone, últimos serviços, data e hora do último agendamento. 1 toque em vez de 4.
- **Resumo do dia no dashboard** — Linha compacta mostrando total de clientes, concluídos, cancelados e no-shows do dia.
- **Filtros de lembretes simplificados** — Abas: Todos, Lembrados (bolinha verde), A Lembrar (bolinha amarela).

### Changed
- **Cards de clientes simplificados** — 2 linhas (nome + telefone/último corte), sem badges de texto (ATIVO, A LEMBRAR, Inativo). Bolinha verde/amarela/vermelha indica status.
- **Filtros de clientes simplificados** — Só 3 abas (Todos, Lembrados, A Lembrar) em vez de 4.
- **"Meu Dia" renomeado para "Agenda do Dia"** no sidebar.
- **Migrations consolidadas** — 10 arquivos → 6 (001-006). `007_reminder_logs` e `009_service_name_unique` → `001_schema`. `005_seed_data` + `006_cron` → `005_seed_cron`. `008_multi_barber` (duplicata) removido.

### Removed
- **RevenueChart** — Gráfico de barras com 4 abas (Diário/Semanal/Dia da Semana/Comparação Mensal) removido do perfil do admin. Informação demais para um barbeiro individual. Junto com hook `useRevenueChartData` e dependência `recharts`.
- **instalar-cliente.mjs** — Script de instalação automática removido + todas as referências em docs.
- **PROXIMOS_PASSOS.md** — Documento de próximos passos removido.

### Fixed
- **Agenda Semanal bugada** — Slots não carregavam quando a RPC `get_available_slots` falhava silenciosamente. Adicionado fallback para `getTimeSlotsForDate` local.

### Added
- **Export XLSX (Excel) integrado** — Novo hook `useXlsxExport` para gerar arquivos .xls compatíveis com Excel via XML SpreadsheetML, zero dependências. Botão Exportar agora tem menu em 2 níveis: tipo de dado (Agendamentos, Clientes, Financeiro) → formato (Excel ou CSV).
- **Análise por dia da semana** — Nova aba "Dia da Semana" no gráfico de faturamento (RevenueChart). Mostra faturamento por dia da semana, melhor dia destacado em dourado, contagem de atendimentos e tooltip completo.
- **Sentry release tag no CI** — Pipeline de CI agora cria release no Sentry com tag `black-diamond@sha`, faz upload de source maps com validação e associa commits automaticamente via `set-commits --auto`.

### Refactored
- **SettingsHorarios** reduzido de 1.048 para ~250 linhas — Componentes extraídos: `horarios/types.ts`, `NumInput.tsx`, `TimePickerSheet.tsx`, `ApplyAllSheet.tsx`, `LunchBreakContent.tsx`.
- **SettingsCupons** reduzido de 857 para ~400 linhas — `CouponFormFields` extraído para `cupons/CouponFormFields.tsx`, sub-componentes inline extraídos (HeaderSection, CouponFormModal, DeleteModal, etc).
- **SettingsConta** reduzido de 826 para ~180 linhas — Componente reutilizável `conta/EditableField.tsx` elimina repetição dos 5 campos. `conta/PhotoSection.tsx` extraído.

### Removed
- **8 arquivos mortos deletados** — `useCallbackRef.ts`, `useLatest.ts`, `useDebounce.ts`, `useWeeklyCongrats.ts`, `WhatsAppReminderButton.tsx`, `BookingSummaryPanel.tsx`, `GalleryLightbox.tsx`, `RatingPage.tsx`.

## [3.20.2] - 2026-07-12

### Added
- **Limite de usos em cupons** — Agora o barbeiro pode definir quantas vezes um cupom pode ser usado antes de expirar.
- **Data de validade em cupons** — Campos de início e término para cupons com expiração automática.
- **Detecção inteligente Android/Samsung/iPhone** — Instruções específicas de instalação PWA para cada plataforma.
- **FAQ turbinado na Ajuda** — 12 FAQs (era 6) cobrindo todas as funcionalidades.

### Fixed
- **BUG CRÍTICO: No-Show no universal.sql** — As funções `is_client_blocked_by_no_show` e `check_client_no_show_block` eram chamadas mas NÃO estavam definidas no schema universal. Agora estão.
- **Versão do health_check sincronizada** — Atualizada de `3.12.0` para `3.20.0`.
- **Semana dinâmica no AdminWeekly** — Agora respeita o horário REAL de fechamento do sábado (não mais hardcoded 18h).
- **Botão 'Instalar' no desktop** — Usuários de desktop Chrome agora veem o botão Instalar no modal PWA.
- **Validação de telefone melhorada** — Mensagem de erro mais clara: "Informe DDD + número (mín. 10 dígitos)".
- **Navegação por teclado na galeria** — Setas ← → para navegar no lightbox.
- **Acessibilidade** — `useModalA11y` adicionado em PwaInstallModal e EditClientModal.
- **Alt text nas imagens da galeria** — Fallback descritivo quando não definido.
- **Removido Verão 🌊 e Primavera 🌸** dos templates sazonais.
- **Deletados arquivos** — `FUNCIONALIDADES_NOVAS.md` e `docs/templates-lembretes.md`.
- **TestSprite plans removidos do repositório** — `testsprite-plans.jsonl` e `testsprite-plans-complete.jsonl` deletados.

## [3.20.1] - 2026-07-12

### Added
- **Templates de lembrete sazonais inteligentes** — Agora os modelos padrão de lembrete mudam automaticamente conforme a época do ano: Carnaval 🎭, Páscoa 🐰, Dia das Mães 🌷, Dia dos Namorados ❤️, Festa Junina 🌽, Dia dos Pais 👔, Black Friday 🏷️ e Natal 🎄. Cada data especial tem 3 templates exclusivos.
- **Script de otimização de imagens** — `scripts/optimize-images.mjs` para comprimir WebP/PNG via sharp.
- **Preview deploys configurados** — Deploy automático em preview para cada branch no Vercel.

### Fixed
- **ESLint zerado** — 2 warnings removidos (unused vars) — agora 0 erros, 0 warnings.
- **Acessibilidade** — `autoComplete` adicionado nos campos de login (email/senha), `aria-label` nos inputs de cupom.
- **Build Vite 8** — Removido `minify: 'esbuild'` obsoleto (Vite 8 não inclui mais esbuild).
- **vite-plugin-compression removido** — Desnecessário no Vercel (faz compressão própria).
- **Chunk splitting melhorado** — 6 chunks separados (react, motion, supabase, icons, sentry, other).
- **Preconnect adicionado** — Supabase CDN e Vercel para carregamento mais rápido.
- **CSS Code Split ativado** — CSS dividido por chunk.
- **Sourcemaps de build desligados** — Build mais leve.
- **Clientes de teste removidos do banco** — 8 clientes de teste deletados + agendamentos.

## [3.20.0] - 2026-07-11

### Fixed
- **CSV export separador** — Trocado separador de `,` para `;` (ponto e vírgula) no CSV. Excel brasileiro agora abre com colunas corretas em vez de tudo na coluna A. Aspas inteligentes: só envolve campos que contêm o separador.
- **Gráficos no mobile** — RevenueChart movido para BAIXO do ProfileMobile no mobile. Antes os gráficos apareciam no topo, empurrando as informações do período para baixo.
- **Faturamento Total duplicado** — Removido card "Faturamento Total" do RevenueChart (já existia no ProfileDesktopMetrics). Grid alterado de 4 para 3 colunas, depois para 2 (Média Diária + Melhor Dia).
- **Atendimentos duplicado** — Removido card "Atendimentos" do RevenueChart (já existia no ProfileDesktopMetrics).

### Changed
- **Badge de filtro "Ocupados"** — Cor trocada de laranja (#C5A059) para branco sutil (bg-white/10, text-white, border-white/10). Combina com o visual clean do app.
- **Taxa de Ocupação** — Cor trocada de laranja para tons neutros (branco/zinc). Ícone, porcentagem e barra de progresso agora usam bg-white/5, text-zinc-300, bg-white/20.
- **Notificações** — Removido botão "Marcar todas" do header do NotificationBell. No modo seleção, removido botão "Todas" (selecionar todas). Agora só fica "Selecionar" + "Excluir".
- **Avatares quadrados** — Avatar dos clientes nos modais de lembretes e busca trocado de `rounded-full` (círculo) para `rounded-xl` (quadrado arredondado). Consistente com o resto do app.
- **Top Serviços ranking** — Ícones (Crown, TrendingUp, BarChart) trocados por números de ranking (1, 2, 3). Primeiro lugar com cor dourada, resto neutro.

### Added
- **Migrations de Fidelidade e Cupons** — Tabelas `loyalty_config` e `coupons` criadas no Supabase. RPCs `validate_coupon` e `apply_coupon` para validação e aplicação de cupons.

## [3.19.0] - 2026-07-10

### Fixed
- **Notificações avatar quadrado** — Todos os avatares de notificação agora são quadrados (rounded-lg/rounded-xl) em vez de circulos, consistente com o padrão de cards de cliente.
- **Notificações cinza padronizado** — Avatar sempre `bg-white/[0.04]` com `text-zinc-400`, sem variação de cor por tipo de notificação.
- **Detalhe da notificação** — Redesign completo: header com botão voltar, client card, data/hora em cards separados, services card com contagem, ações em grid.
- **Animação de detalhe** — Trocado slide lateral por fade simples (0.15s) para transição mais suave.
- **Toggles de configuração** — Adicionado `role="switch"` em toggles do SettingsMensalista (desktop e mobile) para evitar min-height 44px indesejado.
- **Touch targets CSS** — Removida regra global min-height 44px que causava bugs visuais em toggles, dots e cards.

### Changed
- **Painel de notificações desktop** — Gradiente de fundo, borda dourada sutil, header com dot dourado e badge de não lidas, itens com borda separadora e indicador lateral.
- **Mensagem WhatsApp do barbeiro** — "Gerenciar" trocado por "Caso precise cancelar ou reagendar seu horário, acesse: URL".
- **Detalhe notificação** — Botão "Falar com Cliente" com ícone WhatsApp, botões "Reagendar" e "Cancelar" em grid lado a lado.
- **Estado vazio notificações** — Container estilizado com borda, texto melhor espaçado.
- **Script de instalação** — Reescrito com banner, progress bar, links diretos, resumo final com links úteis, WhatsApp do desenvolvedor para suporte.
- **README** — Reescrito com instalação recomendada primeiro, pré-requisitos com links, seção de suporte.

## [3.18.0] - 2026-07-10

### Fixed
- **Race condition em updateClient** — Removido check-then-update não atômico. Agora trata violação de unique constraint (23505) diretamente do banco.
- **Hard delete de bookings** — `deleteBooking` agora faz `status='cancelled'` em vez de `DELETE`. Preserva dados históricos e estatísticas.
- **Reagendamento não atômico** — `useReschedule` e `CancelPage` agora cancelam agendamento antigo ANTES de criar o novo. Evita booking duplicado ou perda.
- **Stale closure em notifications** — `markAllAsRead` e `clearNotification` agora usam `notificationsRef` em vez de closure desatualizado.
- **Rate limit duplo no SQL** — `lookup_client_by_phone` não tem mais rate limit interno (wrapper já faz).
- **Notifications JSON parsing** — Triggers SQL agora emitem JSON em vez de `|` separado. Parser frontend suporta JSON + fallback legado para backwards compatibility.
- **ClientProfile token inexistente** — Removido passagem de `booking.token` que sempre era `undefined`.
- **openPanel performance** — Query direta com `eq('client_id', id)` em vez de carregar todos os bookings.
- **Verificação de nome ignora soft-deletados** — `useClientCreation` agora filtra `deleted_at IS NULL`.
- **showError dependency** — `useBookingSlots` removido do array de dependências (causava re-fetch desnecessário).
- **Gallery move position** — Usa `findIndex` pelo id em vez de position como índice de array.
- **NotificationsPage parser** — Atualizado para JSON + fallback legado (era o único lugar com parser antigo).
- **Touch targets CSS** — `min-height: 44px` para botões/links (WCAG 2.5.8), com override para `[role="tab"]`.
- **Contraste "Since 2026"** — `text-zinc-900` → `text-zinc-600` (passa WCAG AA).
- **Offline fallback encoding** — HTML entities para caracteres acentuados (é, á, à).
- **Service Worker precache** — Adicionado `index.html` ao `PRECACHE_URLS` + bump para v11.
- **SW cache de dados sensíveis** — Supabase API agora é network-only para bookings/clients. Cache só para services/settings.
- **Auto-complete server-side** — `autoCompleteExpiredBookings` agora chama RPC `completar_agendamentos_expirados()`.

### Changed
- **Sentry deferred** — SDK carrega via `requestIdleCallback` + dynamic import() em vez de síncrono no main.tsx.
- **Google Analytics deferred** — GA inicializa após first paint via `requestIdleCallback`.
- **Fonts async** — Plus Jakarta Sans/Bebas Neue via preload, Roboto/Montserrat via `onload` async. Remove render-blocking.
- **Hero fetchPriority** — Adicionado `fetchPriority="high"` na imagem LCP.
- **Phone formatting** — `formatPhone` aplicado em todos os campos de telefone (Editar Cliente, SettingsConta, mobile).
- **Footer WhatsApp** — Link "Criado por Elberth Mayan" agora aponta para o WhatsApp do desenvolvedor (31 98015-9559).
- **OG Image** — Criada imagem 1200x630 PNG para meta tags. Atualizado `index.html` com `og:image`, `og:image:width`, `og:image:height`.
- **AdminProfile mass delete** — Adicionada verificação de senha (digitar "LIMPAR" + senha) consistente com SettingsDados.
- **CSS touch targets** — Override para `[role="tab"]` (dots de paginação) não ter min-height 44px.

### Security
- **CSP sem unsafe-eval** — Removido `'unsafe-eval'` do Content-Security-Policy em produção.

## [3.17.0] - 2026-07-10

### Added
- **Cache offline de serviços** — Serviços agora são salvos no localStorage com validade de 24h. Se o cliente ficar sem internet, os serviços carregam do cache em vez de mostrar erro. Quando a internet volta, recarrega automaticamente.
- **Banner offline amigável** — `ConnectionStatusBanner` mudou de vermelho (alerta crítico) para âmbar (aviso) com ícone WifiOff e mensagem "Sem conexão com a internet. Dados salvos no celular — você pode continuar navegando."
- **Booking offline (fila)** — Quando sem internet, o agendamento é salvo no `localStorage`. Quando a internet volta, é enviado automaticamente. O cliente vê tela de sucesso "Agendamento salvo! Será enviado quando a conexão voltar." e recebe toast de confirmação quando for processado.

### Changed
- **useServices.ts** — Estado `isOffline` indica se os dados vieram do cache. Listener `online` recarrega serviços silenciosamente quando a internet volta.
- **ConnectionStatusBanner.tsx** — Design menos alarmista (âmbar em vez de vermelho, sem pulse no indicador).

## [3.16.0] - 2026-07-10

### Added
- **Realtime notifications com DELETE/UPDATE** — Subscription agora escuta `event: '*'` em vez de só `INSERT`. Quando trigger de cancelamento deleta notificação antiga, ela some da tela em tempo real. UPDATE sincroniza read status entre abas.
- **Auto-reconnect nas notificações** — Se o WebSocket cair, tenta reconectar automaticamente com backoff exponencial (até 15 tentativas, máximo 15s de intervalo). Prevenção de duplicatas.
- **Realtime ativado no banco** — `ALTER PUBLICATION supabase_realtime ADD TABLE notifications` e `ADD TABLE bookings` adicionados ao `universal.sql`.
- **Dashboard em tempo real** — `useDashboardData.ts` agora escuta INSERT/UPDATE/DELETE na tabela `bookings`. Quando um agendamento é cancelado/criado/alterado, os cards de Ocupados, Livres e Bloqueados atualizam automaticamente sem refresh.

### Changed
- **getNextDays — Calendário não pula mais dias** — ANTES: gerava 7 dias corridos (incluindo domingo) e filtrava depois, criando sequência quebrada (ex: Qua, Qui, Sex, Sáb, ~~Dom~~, Seg, Ter). AGORA: gera de HOJE até SÁBADO inclusive. Sem pular dias. Ex: quarta mostra Qua, Qui, Sex, Sáb (4 dias). Sábado após fechar mostra a próxima semana.
- **DailyRevenue corrigido** — Só conta bookings com status `'completed'`. ANTES contava `confirmed` também (agendamentos futuros que ainda não foram realizados).
- **Settings desktop — Layout fixo** — Container de configurações mudou de `min-h-[400px]` para `min-h-[600px]` para evitar tremor (layout shift) ao alternar entre abas com alturas diferentes.

### Fixed
- **Lucro do Dia inflado** — Estava somando agendamentos futuros (`confirmed`) como lucro. Agora só conta atendimentos concluídos (`completed`).
- **Calendário pulava dias** — Não mostrava mais sequência quebrada com domingo no meio.
- **Notificações não sumiam em tempo real** — Agora DELETE é escutado, então trigger de cancelamento remove notificação antiga da tela instantaneamente.
- **Reconexão de WebSocket** — Se a conexão caísse, notificações paravam pra sempre. Agora reconecta automaticamente.

## [3.15.0] - 2026-07-10

### Added
- **Hook useMensalistaFilter** — Hook compartilhado entre booking publico e admin. Extrai logica de filtragem de servicos mensalista, reset de servicos, e filtragem de dias (Seg-Qui).
- **API layer para templates** — `lib/api/templates.ts` com CRUD para tabela `whatsapp_templates`.
- **Testes unitarios** — `AdminResetPassword.test.tsx` (12 testes) e `CancelPage.test.tsx` (11 testes).
- **Testes visuais** — `e2e/visual.spec.ts` com 13 testes de screenshot comparison (Playwright).
- **Tabela whatsapp_templates** — Nova tabela no Supabase para templates de WhatsApp (substitui localStorage).
- **Tabela rate_limits** — Nova tabela para rate limiting server-side.
- **Coluna deleted_at** — Soft delete na tabela clients (migration 20260713).
- **Funcao check_rate_limit** — Rate limiting customizado por IP.
- **Funcao cleanup_expired_tokens** — Cleanup automatico de tokens expirados.
- **Indice idx_clients_deleted_at** — Performance para queries de soft delete.

### Changed
- **useReminders.ts** — Migrado de localStorage para Supabase (tabela whatsapp_templates). Templates agora persistem entre dispositivos.
- **ReminderModal.tsx** — Interface atualizada para receber `WhatsAppTemplate[]` em vez de `string[]`. Delete por ID em vez de index.
- **NotificationBell.tsx** — Badge estilo Instagram (bolinha dourada com numero, colada no sino). Removido `<li>` wrapper que causava bug visual.
- **ConnectionStatusBanner.tsx** — Simplificado: so aparece quando offline (sem banner de "dados desatualizados" que causava spam).
- **ServiceStep.tsx (mobile)** — Redesign: toggle switches dourados, nome + preco, sem duracao (redundante), sem banner decorativo.
- **SuccessStep.tsx** — Tela de sucesso simplificada: sem dados repetidos da tela anterior, com mensagem personalizada.
- **DashboardHeader.tsx** — Formatacao pt-BR com `toLocaleString`.
- **useBookingSlots.ts** — Removido `barberPhone` (dead code nunca consumido).
- **useBookingWizard.ts** — Removeu 3 blocos de logica mensalista duplicada (agora usa useMensalistaFilter).
- **AdminBooking.tsx** — Removeu 3 blocos de logica mensalista duplicada + import MENSALISTA_EXCLUDED_SERVICES removido.
- **4 arquivos** — Imports do useBarberSettings padronizados para `'../hooks/useBarberSettings'`.
- **NotificationBell.tsx** — Corrigido useEffect duplicado dentro do JSX (bug pre-existente).
- **instalar-cliente.mjs** — Reescrito com validacao de email/senha (2x), retry no deploy, UUID sanitizado.
- **universal.sql** — Atualizado com deleted_at, whatsapp_templates, e todos os indexes.

### Fixed
- **RescheduleWizard.tsx** — Adicionada flag `active` no useEffect de slots (previne state update em componente desmontado).
- **Location.tsx** — Removidas non-null assertions (`hours!`) que podiam explodir.
- **Edge Function send-push** — CORS limpo (removido localhost em producao).
- **DataStep.tsx** — Fix `lastBooking?.serviceIds` (previne crash quando serviceIds e undefined).
- **useAdminClientSearch.ts** — Interface TypeScript reconstruida (estava quebrada com tipo invalido e fechamento ausente).
- **clients.ts:47** — Caractere UTF-8 corrompido (`histrico` -> `historico`).
- **NotificationBell.tsx:786** — useEffect e return duplicados removidos (bug pre-existente).

### Removed
- **6 arquivos desnecessarios** — audit-banco.mjs, audit-banco-v2.mjs, audit-banco-v3.mjs, audit-verificar.mjs, supabase-helper.mjs, AUDIT_REPORT.md.
- **setup-barbearia.js** — Script redundante (instalar-cliente.mjs ja faz tudo).
- **Banner decorativo** — Removido da tela de selecao de servicos (redundante com indicador de passos).
- **Hover pause na galeria** — Removido `animation-play-state: paused` no hover (desnecessario para galeria de fotos).
- **Bolinha fantasma** — Removido indicador visual que aparecia ao lado de "Notificacoes" no sidebar.

### Security
- **DROP FUNCTION antes de CREATE OR REPLACE** — Migration 20260716 corrigida para evitar erro de return type.
- **UUID sanitizado** — instalar-cliente.mjs sanitiza UUIDs antes de inserir no SQL.
- **Service role key removida** — audit-banco.mjs com key hardcoded deletado do repositorio.

## [3.14.0] - 2026-07-10

### Added
- **Notificações Premium** — Som de dois tons via Web Audio API, badge no título da aba (`(3) Black Diamond`), preview toast dourado que desliza do topo com auto-dismiss de 5s.
- **Trigger de cancelamento no banco** — Quando um agendamento é cancelado, a notificação antiga "Novo Agendamento" é automaticamente deletada e uma nova notificação "Agendamento Cancelado ❌" é inserida com banner vermelho na UI.
- **Confirmação de cancelamento** — Modal de confirmação no `ClientProfile.tsx` antes de executar o cancelamento, evitando cancelamentos acidentais.
- **Rate limit server-side no login** — `AdminLogin.tsx` agora chama `check_rate_limit` RPC antes de tentar login, bloqueando após 5 tentativas em 15 minutos.
- **Senha no reset de dados** — `SettingsDados.tsx` com fluxo de 2 etapas: digitar ZERAR/DELETAR + senha do admin.

### Changed
- **Desktop/Mobile Steps unificados** — 6 componentes substituídos por 3 componentes responsivos.
- **AdminBooking.tsx** — Importa 3 componentes em vez de 6.
- **auto_block_lunch_break** — Corrigido com `'{}'::UUID[]` para evitar NOT NULL violation.
- **Notificações canceladas na UI** — `NotificationDetail` detecta cancelamento e mostra apenas botão "Falar com Cliente".

### Removed
- **6 arquivos mortos** — Desktop/Mobile ClientStep, ServicesStep, DateTimeStep.

### Fixed
- **Notificação de agendamento cancelado** — Notificações de cancelamento mostram UI correta.
- **Edge case `unblock_day`** — Trigger ignora slots bloqueados.
- **auto_block_lunch_break** — NOT NULL violation corrigida.

## [3.13.0] - 2026-07-10

### Added
- **PWA Install Inteligente** — Hook `usePwaInstall` + componente `PwaInstallModal`.
- **Banner PWA no site público** — Card fixo no rodapé com botão "Instalar".

### Changed
- **AdminProfile refatorado** — Lógica PWA extraída para hook compartilhado.

### Removed
- **Sistema de Avaliação removido** — RatingPage, tabela reviews, funções relacionadas.

### Fixed
- **ClientProfile.tsx cancelamento sem token** — Passa token do booking.
- **Shadowing em useNotifications.ts** — Variável `prev` renomeada.

## [3.12.0] - 2026-07-10

### Added
- Último agendamento (Login Invisível), filter tabs notificações, botão lembretes desktop, indicadores de cliente, cards responsivos.

### Changed
- Notificações mobile/desktop, cor dourada padronizada, validação de telefone.

### Fixed
- PWA Guard, edição de telefone.

## [3.11.0] - 2026-07-10

### Fixed
- WhatsApp dinâmico, confirmação booking, working_days corrompido, diversos testes.

## [3.10.0] - 2026-07-10

### Fixed
- WhatsApp do barbeiro nos planos mensais, toggle horário de almoço.

## [3.9.0] - 2026-07-10

### Changed
- Mensalista mobile, horário almoço, notificações, validação telefone.

### Added
- PWA Guard, modo seleção notificações, agrupamento por data.

## [3.8.0] - 2026-07-08

### Changed
- Fluxo de notificação simplificado, mensagem WhatsApp formatada.

### Removed
- PWA do cliente, PwaGuard, Service Worker registration.

## [3.7.0] - 2026-07-08

### Added
- PWA do cliente, centro de notificações, horário almoço recorrente.

## [3.5.0] - 2026-07-05

### Added
- Sentry, testes E2E, coverage mínimo no CI.

## [3.3.0] - 2026-07-05

### Fixed
- Security, timezone, Service Worker, hooks duplicados.

## [3.2.0] - 2026-07-04

### Added
- Rate limiting, audit logs, E2E tests, Husky.

## [3.1.0] - 2026-07-03

### Added
- Skeleton loading, mensalista, WhatsApp automático.

## [3.0.0] - 2026-07-01

### Added
- Sistema completo de agendamento, painel admin, PWA.
