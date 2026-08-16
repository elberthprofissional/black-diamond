# DOCUMENTACAO — BLACK DIAMOND

Sistema completo de agendamento online para barbearias, com painel administrativo, notificacoes push e integracao com WhatsApp.

**Versao:** 3.36.0 | **Ultima atualizacao:** Agosto 2026

> NOTA v3.36.0: **Barbeiro unico por padrao, multi-barbeiro suportado.** A etapa de
> selecao de barbeiro no agendamento publico e ocultada quando ha apenas 1 barbeiro
> ativo (fluxo de 4 etapas). Com mais de um barbeiro, a selecao volta a aparecer e o
> escopo RLS por barbeiro (migration 007) vale no banco: dono ve tudo, barbeiro comum
> ve so os proprios agendamentos. Elberth (suporte) e Tato (dono) continuam com acesso
> administrativo.

---

## Sumario

1. [Visao Geral](#1-visao-geral)
2. [Stack Tecnica](#2-stack-tecnica)
3. [Arquitetura do Projeto](#3-arquitetura-do-projeto)
4. [Funcionalidades](#4-funcionalidades)
5. [Schema do Banco de Dados](#5-schema-do-banco-de-dados)
6. [Seguranca](#6-seguranca)
7. [Setup e Desenvolvimento](#7-setup-e-desenvolvimento)
8. [Deploy na Vercel](#8-deploy-na-vercel)
9. [CI/CD (GitHub Actions)](#9-cicd-github-actions)
10. [Staging (Ambiente de Teste)](#10-staging-ambiente-de-teste)
11. [Recuperacao de Senha](#11-recuperacao-de-senha)
12. [Variaveis de Ambiente](#12-variaveis-de-ambiente)
13. [Estrutura de Pastas](#13-estrutura-de-pastas)
14. [Testes](#14-testes)
15. [Troubleshooting](#15-troubleshooting)
16. [Sistema de Assinatura (Removido)](#16-sistema-de-assinatura-removido)
17. [Auditoria v3.31.0](#auditoria-v3310)
17. [Notificacoes Push (Web Push)](#17-notificacoes-push-web-push)
18. [Instalação PWA (Smart Install)](#18-instalacao-pwa-smart-install)
19. [Sistema de Mensalista](#19-sistema-de-mensalista)
20. [Skeleton Loading](#20-skeleton-loading)
21. [Sistema de Galeria](#21-sistema-de-galeria)
22. [Layout Inteligente da Galeria](#22-layout-inteligente-da-galeria)

---

## 1. Visao Geral

**Black Diamond** e um sistema de agendamento premium para barbearias, construido com o conceito de **Quiet Luxury** (luxo silencioso). O cliente agenda pelo site, e o barbeiro gerencia tudo por um painel administrativo completo — sem custo de infraestrutura.

### Publico-alvo
- Barbearias e estetos que querem presenca digital profissional
- Barbeiros que precisam organizar agenda, clientes e faturamento

### Principais diferencias
- Agendamento online em 4 etapas com confirmacao via WhatsApp
- Painel admin com agenda do dia, semana, clientes e relatorios
- Notificacoes push para agendamentos em tempo real
- Botao WhatsApp nas notificacoes — barbeiro envia confirmacao pro cliente com 1 clique
- Galeria editavel com lightbox e delete pelo admin
- Conversao automatica para WebP em uploads
- Menu de foto estilo Instagram (alterar/remover foto)
- Placeholder de perfil generico (sem foto fixa do Tato)
- Acessibilidade: focus-visible, contraste aprimorado, skip-link
- Estado gerenciado com hooks + Context API (leve e sem dependências)
- **Login opcional do cliente** — Dashboard com historico, stats, cancelamento e link magico de gerenciamento (sem codigo falso)
- **Badge Aberto/Fechado** no Hero em tempo real
- Error reporting com Sentry (captura automatica de erros)
- Coverage minimo no CI (qualidade garantida)
- Projeto universal: template pronto para qualquer barbearia
- Custo operacional zero (Vercel + Supabase Free Tier + Sentry Free)

---

## 2. Stack Tecnica

| Camada | Tecnologia | Versao |
|--------|-----------|--------|
| Frontend | React + TypeScript | React 19, TS 6.x |
| Build | Vite | 8.x |
| Estilo | Tailwind CSS | 4.x (via PostCSS) |
| Animacoes | Framer Motion | 12.x |
| Icones | Lucide React | 0.460 |
| Roteamento | React Router | 8.x |
| Backend/Banco | Supabase (PostgreSQL) | ^2.108 |
| Error Reporting | Sentry | ^1.x |
| Hospedagem | Vercel | Gratis |
| Testes | Vitest + Testing Library + Playwright | Vitest 4.x |
| CI/CD | GitHub Actions | Gratis |

---

## 3. Arquitetura do Projeto

### Visao Geral do Projeto
O Black Diamond foi projetado para ser **universal** — pronto para qualquer barbearia. O projeto inclui:
- `DEPLOY_GUIDE.md` — Guia passo a passo para deploy em novas barbearias
- `supabase/migrations/` — Migrations (8 arquivos: schema, rls, functions, triggers, seed, cron + remoção assinaturas + galeria barber_id)
- `supabase/seeds/` — Dados iniciais (depoimentos, etc)
- Placeholder generico na secao About (sem foto fixa do Tato)
- Sentry para error reporting em producao

### Filosofia "Template de Barbearia"
> O projeto e feito para ser **replicado**. Cada barbeiro tem seu proprio deploy (Vercel + Supabase), seu proprio dominio, e configura tudo pelo painel. O sistema usa as migrations em `supabase/migrations/` para setup do banco.

---

### Fluxo de dados
```
Cliente (Browser)
  ↓ HTTP/HTTPS
Vercel (SPA estatica)
  ↓ API REST (PostgREST)
Supabase (PostgreSQL + RLS + Auth)
  ↓ Web Push (VAPID)
Service Worker → Notificacao no celular do admin
  ↓ Admin clica icone WhatsApp
WhatsApp → Mensagem formatada pro cliente

Erros → Sentry (error reporting automatico)
```

### Como funciona o agendamento
1. O cliente seleciona servicos, data e horario no site
2. O frontend chama a RPC `criar_agendamento` no Supabase
3. A RPC verifica conflitos, cria o client (se novo) e insere o booking
4. Uma notificacao push + in-app e enviada pro barbeiro
5. O barbeiro clica no icone WhatsApp na notificacao
6. WhatsApp abre com mensagem pronta pro cliente (confirmacao + link de gerenciamento)
7. O barbeiro aperta Enviar — pronto!

### Bloqueio de horarios
- O sistema usa a coluna `is_blocked` na tabela `bookings`
- Horarios bloqueados aparecem na aba "Bloqueados" do dashboard
- RPCs `toggle_slot_block` e `unblock_day` gerenciam o bloqueio

### Componentes compartilhados
- `RescheduleWizard` — Wizard de 3 steps para reagendamento
- `BookingDetailPanel` — Painel de detalhe do agendamento
- `BookingSearchModal` — Modal de busca de clientes
- `NotificationBell` — Sino de notificações com painel lateral (Instagram style)
- `FilterTabs` — Abas de filtro (ocupados/livres/bloqueados)
- `ToastNotification` — Sistema de notificacoes
- `CompleteModal` / `DeleteModal` / `UnblockModal` — Modais de acao
- `DashboardHeader` — Card de proximo cliente e lucro do dia
- `SettingsGaleria` — Gerenciamento de galeria com multi-select e preview
- `ForgotPasswordModal` — Modal de recuperacao de senha
- `LoginBackground` — Background do login desktop
- `LoginHeader` — Header do login
- `LoginForm` — Formulario de login
- `LoginToast` — Toast do login

### Componentes de agendamento (Admin Booking - Responsivos)
- `ResponsiveClientStep` — Busca de cliente por nome/telefone (desktop: inline, mobile: overlay tela cheia)
- `ResponsiveServicesStep` — Seleção de serviços com detecção de mensalista
- `ResponsiveDateTimeStep` — Date picker + grade de horários
- `BookingStepIndicator` — Indicador de progresso do wizard
- `RescheduleBanner` — Banner de reagendamento

### Componentes de agendamento (Booking - Público)
- `ServiceStep` — Selecao de servicos
- `DateTimeStep` — Date picker + time grid
- `DataStep` — Formulario nome + WhatsApp
- `ReviewStep` — Card de resumo do agendamento
- `SuccessStep` — Tela de confirmacao

### Placeholder de Foto
Quando o barbeiro ainda nao fez upload da foto de perfil, o sistema exibe um **placeholder minimalista**:
- Circulo com ring sutil (`ring-1 ring-white/[0.06]`)
- Icone `User` do Lucide em tom neutro (`text-zinc-600`)
- Fundo escuro `bg-[#151515]`
- Sem texto, sem foto fixa — generico e elegante

### Menu de Foto (Instagram Style)
No Settings > Conta, ao clicar na foto de perfil abre um popover com opcoes:
- **Alterar foto de perfil** — Abre o seletor de arquivos
- **Remover foto** — Aparece apenas quando ja existe foto (em vermelho)
- **Cancelar** — Fecha o menu
- Fechamento ao clicar fora (backdrop)
- Animacao suave com Framer Motion (spring)
- Icones consistentes com o Lucide (Camera, Trash2, X)

---

### Hooks customizados
- `useBookings` — Carregamento de bookings com cache
- `useServices` — Carregamento de servicos com cache module-level
- `useSlotBlocking` — Bloqueio/desbloqueio de horarios
- `useReschedule` — Logica de reagendamento (delete + recriar)
- `useToast` — Sistema de notificacoes toast
- `usePushNotifications` — Inscricao/cancelamento de Web Push (admin)
- `useReducedMotion` — Respeita preferencia de movimento do usuario
- `useModalA11y` — Acessibilidade de modais (Escape, focus trap)
- `useConnectionStatus` — Monitora conectividade com o Supabase
- `useAdminLogout` — Logout seguro do admin
- `useRateLimit` — Rate limiting client-side com persistencia
- `useAuditLog` — Logging de acoes administrativas
- `useBookingWizard` — Orquestra todo o fluxo de agendamento
- `useBookingSubmit` — Submissao de agendamentos
- `useBookingManagement` — Composicao de modais, filtros, reagendamento
- `useBookingFilters` — Filtros do dashboard (ocupados/livres/bloqueados)
- `useBookingModals` — Gerenciamento de modais do booking
- `useBookingSlots` — Calculo de slots disponiveis
- `useClientLookup` — Auto-fill por telefone
- `useClientCreation` — Criacao de clientes
- `useClientPanel` — Painel de detalhe do cliente
- `useClients` — Composicao de hooks para gestao de clientes
- `useClientsData` — Dados dos clientes
- `useAdminBookingSubmit` — Submissao de agendamentos pelo admin
- `useAdminClientSearch` — Busca de clientes no admin
- `useDateDragScroll` — Drag scroll no date picker
- `useWizardStep` — Controle de steps do wizard
- `useBarberSettings` — Hook standalone do context
- `useDashboardData` — Dados do dashboard (proximo booking, receita, slots)
- `useNotifications` — Notificacoes in-app com realtime, som, badge, preview toast
- `useNotificationPrefs` — Preferencias de notificacao (in-app, sound, preview, badge)
- `usePwaInstall` — Deteccao de plataforma e instalacao PWA
- `useXlsxExport` — Exportacao de dados para Excel (XLSX)
- `useCsvExport` — Exportacao de dados para CSV
- `useProfileStats` — Estatisticas do perfil do admin
- `useMensalistaFilter` — Filtro de clientes mensalistas
- `useNoShow` — Controle de faltas (markAsNoShow, undoNoShow)
- `useReminders` — Lembretes WhatsApp com templates
- `useGallery` — Composicao de hooks para galeria
- `useGalleryData` — Dados da galeria
- `useGalleryUpload` — Upload de fotos com conversao WebP
- `useGallerySelection` — Selecao multipla de fotos
- `useGalleryPreview` — Preview em tela cheia
- `useIsDesktop` — Deteccao de dispositivo

### Gerenciamento de Estado
O projeto removeu as stores Zustand. Autenticação usa `supabase.auth` direto via `AuthGuard`, e o estado compartilhado usa Context API + hooks customizados.

---

## 4. Funcionalidades

### Area do Cliente (`/agendar`)
- Selecao de multiplos servicos com precos
- Calendario semanal com slots disponiveis em tempo real
- Formulario de dados com validacao de WhatsApp
- Revisao antes de confirmar
- Tela de sucesso com link de gerenciamento (copiar/enviar)
- Layout responsivo desktop/mobile com drag-to-scroll no date picker

### Perfil do Cliente (`/cliente`)
- Busca por telefone — agendamentos ativos e historico
- Stats do cliente: total de visitas, valor gasto, ultima visita
- Botoes de cancelar e reagendar direto do perfil
- Ativacao de lembretes push

### Gerenciamento Publico (`/gerenciar?token=xxx`)
- Acesso via token unico gerado no agendamento
- Lista de agendamentos ativos com opcao de cancelar
- Redirect pra `/cancelar` pra reagendar

### Cancelamento/Reagendamento (`/cancelar`)
- Busca por telefone — traz agendamentos futuros
- Cancelamento com confirmacao
- Reagendamento com selecao de data/hora

### Notificacoes In-App (`/admin/notificacoes`)
- Centro de notificacoes minimalista e profissional
- **Lista:** Avatar do cliente + nome + horario + seta
- **Detalhes:** Tela com dados do agendamento + acoes
- Desktop: painel lateral que desliza da esquerda
- Mobile: tela cheia com botao voltar
- Realtime — novas notificacoes aparecem instantaneamente
- **Som:** Dois tons (800Hz → 1000Hz) via Web Audio API quando chega notificacao nova (sem arquivo externo)
- **Badge:** Titulo da aba atualiza com contador de nao lidas — `(3) Black Diamond`
- **Preview Toast:** Card dourado desliza do topo quando chega notificacao nova, com auto-dismiss em 5s
- **Cancelamento:** Quando um agendamento e cancelado, a notificacao antiga de "Novo Agendamento" e automaticamente deletada e substituida por "Agendamento Cancelado ❌" com banner vermelho
- **Acoes no detalhe (agendamento ativo):**
  - Enviar Lembrete (WhatsApp pro cliente com confirmacao)
  - Reagendar (abre pagina de cancelamento)
  - Cancelar (abre link de gerenciamento)
- **Acoes no detalhe (cancelado):**
  - Falar com Cliente (WhatsApp direto)
- Cron de limpeza: notificacoes > 30 dias sao deletadas

### Area do Admin (`/admin`)

| Rota | Descricao |
|------|-----------|
| `/admin` | Dashboard do dia — agenda, lucro, proximo cliente |
| `/admin/weekly` | Agenda da semana com navegacao por dia |
| `/admin/agendar` | Agendamento manual com busca de cliente |
| `/admin/clients` | Gestao de clientes com filtros (Todos/A Lembrar/Lembrados/Inativos) |
| `/admin/notificacoes` | Centro de notificacoes (tela cheia no mobile) |
| `/admin/profile` | Relatorios, faturamento, configuracoes |
| `/admin/login` | Login do administrador |
| `/admin/reset-password` | Redefinicao de senha |

### Funcionalidades do Admin
> **Barbeiro unico por padrao (v3.36.0):** A selecao de barbeiro so aparece com 2+ barbeiros ativos. Elberth (suporte) e Tato (dono) compartilham o mesmo painel `/admin`. Escopo RLS por barbeiro: migration `007`.
- **Dashboard do dia:** Proximo cliente, lucro do dia, filtros por ocupados/livres/bloqueados
- **Agenda da semana:** Navegacao por 6 dias, bloqueio/desbloqueio de dia inteiro
- **Agendamento manual:** Busca por WhatsApp/nome, selecao de servicos, data/hora
- **Gestao de clientes:** CRUD, notas, historico, lembretes via WhatsApp, filtros por status, **flag de inativo** (>30 dias sem visita)
- **Reagendamento:** Wizard de 3 steps (servicos, data/hora, revisao)
- **Relatorios:** Faturamento semanal/mensal, servicos mais pedidos, cancelamentos
- **Horario de almoço recorrente:** Configuracao de bloqueio automatico (horario + dias da semana)
- **Agradecimento automatizado:** Mensagem com nome do servico + link de avaliacao
- **Relatorio semanal:** Push toda segunda com resumo da semana (faturamento, atendimentos, top servico)
- **Limpeza de dados:** Cron mensal que limpa bookings > 6 meses e audit logs > 90 dias, preservando stats dos clientes
- **Notificacoes Push:** Ativacao/desativacao de notificacoes no navegador
- **WhatsApp nas notificacoes:** Icone verde para enviar confirmacao pro cliente com mensagem formatada

### Configuracoes (`/admin/profile?tab=settings`)
- **Conta:** Nome, WhatsApp, Bio, Frase, Instagram, foto de perfil
- **Galeria:** Upload, delete, reordenacao e multi-select de fotos do portfolio (max 8 fotos)
- **Horarios:** Configuracao de dias e horarios de funcionamento + **horario de almoço recorrente**
- **Servicos:** Gerenciamento de servicos e precos
- **Mensalista:** Planos, servicos inclusos, duracao, dias permitidos — CRUD premium com glassmorphism
- **Controle de Faltas:** Configuracao de limite de faltas (agora sem bloqueio automatico — so notifica)
- **Fidelidade:** Configuracao de meta de visitas e servico premio
- **Cupons:** Gerenciamento de cupons de desconto (CRUD) — tipos: valor fixo, porcentagem e servico gratis
- **Depoimentos:** Gerenciamento de depoimentos de clientes (CRUD)
- **Notificacoes:** Toggle de notificacoes push

---

## 5. Schema do Banco de Dados

Schema completo: `supabase/migrations/` (migrations consolidadas)

### Migrations

O projeto usa **8 migrations** em `supabase/migrations/` (6 consolidadas + 1 de remocao + 1 nova). Cada arquivo preserva os marcadores `-- >>> MIGRATION:` das migrations originais — veja `supabase/migrations/README.md` para o mapeamento completo.

| Arquivo | Conteudo |
|---------|----------|
| `001_schema_core.sql` | Schema base (20 tabelas) + extensoes + RLS + is_admin() + storage + RPCs (agendamento, slots, cupons, no-show, fidelidade) + triggers + seeds + cron |
| `002_multi_barber_pagamentos.sql` | Multi-barbeiro (`barbers`, `get_barbers`) + assinaturas/PIX (removidas pela `007`) |
| `003_auditoria_rls.sql` | Indices de performance + auditoria + RLS estrito |
| `004_escopo_barbeiro_acesso.sql` | Escopo RLS por barbeiro (`is_barber_owner`, `current_barber_id`) + acesso publico seguro de bookings (RPCs com rate limit) |
| `005_conta_cliente_v2.sql` | Conta do cliente v2 (login por telefone/e-mail, recuperacao de senha por codigo, e-mail no dashboard) + horario proprio por barbeiro |
| `006_agenda_duration_auth.sql` | Conflito por duracao (slots que nao comportam o servico somem) + integracao Supabase Auth (`sync_client_user`, `clients.user_id`) |
| `007_remove_assinaturas_pix.sql` | **Remocao (2026-08-15):** dropa o sistema de assinaturas/PIX (subscriptions, payment_logs, payment_blocked_users e funcoes relacionadas) |
| `008_gallery_barber_id.sql` | **Galeria (2026-08-16):** adiciona coluna `barber_id` na tabela `gallery_images` para filtrar fotos por barbeiro |

> **Nota:** Para rodar tudo de uma vez, cole `supabase/_RODAR_NO_SQL_EDITOR.sql` no SQL Editor (contem as 8 migrations concatenadas em ordem).

> **Nota (v3.36.0):** A tabela `barbers` e a funcionalidade de multi-barbeiro foram mantidas. A etapa de selecao de barbeiro no fluxo publico so aparece com mais de um barbeiro ativo; o escopo por barbeiro no banco e garantido pela migration `004_escopo_barbeiro_acesso.sql`. A rota `/barber` (painel do funcionario) continua fora do app.

### Tabelas

**services** — Servicos oferecidos
```sql
id UUID PK, name TEXT, description TEXT, price DECIMAL, duration INTEGER, created_at TIMESTAMPTZ
```

**clients** — Cadastro de clientes
```sql
id UUID PK, name TEXT, phone TEXT UNIQUE, email TEXT, notes TEXT,
is_favorite BOOLEAN, is_mensalista BOOLEAN, is_blocked BOOLEAN,
manually_added BOOLEAN, created_at TIMESTAMPTZ,
historical_visits INTEGER, historical_spent DECIMAL, last_visit_date DATE
```

**bookings** — Agendamentos
```sql
id UUID PK, client_id UUID FK, service_ids UUID[], booking_date DATE,
booking_time TIME, total_price DECIMAL, total_duration INTEGER,
status TEXT (pending/confirmed/cancelled/completed), is_blocked BOOLEAN,
reminder_sent BOOLEAN, notes TEXT, no_show BOOLEAN,
coupon_id UUID, discount_amount NUMERIC, barber_id UUID,
stats_preserved BOOLEAN, created_at TIMESTAMPTZ
```

**notifications** — Notificacoes in-app
```sql
id UUID PK, user_id UUID FK (auth.users), title TEXT, body TEXT,
tag TEXT, url TEXT, read BOOLEAN, created_at TIMESTAMPTZ
```

**settings** — Configuracoes do sistema
```sql
key TEXT PK, value TEXT, updated_at TIMESTAMPTZ
-- Chaves: opening_time, closing_time, saturday_opening, saturday_closing,
-- working_days, barber_name, barber_phone, barber_hours, barber_bio,
-- barber_quote, barber_instagram, barber_photo, brand_name, brand_color,
-- brand_logo, brand_login_bg, max_no_shows, mensalista_enabled,
-- multi_barber_enabled, site_url, notification_preferences
```

**push_subscriptions** — Inscricoes de notificacao push
```sql
id UUID PK, endpoint TEXT, p256dh TEXT, auth TEXT, user_agent TEXT, created_at TIMESTAMPTZ
```

**admin_users** — Lista de administradores
```sql
user_id UUID PK (FK para auth.users), created_at TIMESTAMPTZ
```

**gallery_images** — Fotos da galeria do portfolio
```sql
id UUID PK, image_url TEXT, alt TEXT, position INTEGER, barber_id UUID (FK para barbers, nullable), created_at TIMESTAMPTZ
```

**booking_tokens** — Tokens de gerenciamento de agendamentos
```sql
id UUID PK, booking_id UUID FK, token TEXT UNIQUE, expires_at TIMESTAMPTZ, created_at TIMESTAMPTZ
```

**whatsapp_templates** — Templates de mensagens WhatsApp
```sql
id UUID PK, key TEXT, name TEXT, body TEXT, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
```

**rate_limits** — Rate limiting server-side
```sql
id UUID PK, key TEXT, ip_address TEXT, attempts INTEGER, window_start TIMESTAMPTZ, created_at TIMESTAMPTZ
```

**coupons** — Cupons de desconto
```sql
id UUID PK, code TEXT UNIQUE, description TEXT, discount_type TEXT ('percentage'|'fixed'|'free'),
discount_value NUMERIC, valid_from DATE, valid_until DATE, max_uses INTEGER,
current_uses INTEGER, is_active BOOLEAN, applicable_service_ids UUID[], created_at TIMESTAMPTZ
```



### Indexes
- `idx_no_double_booking` — Unique em (booking_date, booking_time) WHERE status != 'cancelled'
- `idx_bookings_client_id` — Index em (client_id) para queries por cliente

### RPCs (Funcoes Seguras)

| Funcao | Descricao |
|--------|-----------|
| `criar_agendamento` | Cria booking de forma transacional com rate limit (max 3/dia por telefone) |
| `criar_agendamento_rate_limited` | Wrapper com rate limit server-side (3 por minuto por IP) |
| `get_occupied_slots` | Retorna horarios ocupados de uma data |
| `get_available_slots` | Retorna slots livres (respeitando horarios de funcionamento e almoco) |
| `get_business_hours` | Retorna configuracoes de horario como JSON |
| `toggle_slot_block` | Alterna bloqueio de um horario (usa is_blocked) |
| `unblock_day` | Desbloqueia todos os horarios de um dia |
| `save_push_subscription` | Salva inscricao push do admin |
| `delete_push_subscription` | Remove inscricao push |
| `cancel_booking_public` | Cancela booking com token (publico) ou auth (admin) |
| `check_rate_limit` | Verifica e registra tentativa de rate limit server-side |
| `lookup_client_by_phone` | Busca cliente por telefone (com rate limit) |
| `get_bookings_by_phone` | Busca agendamentos futuros por telefone |
| `get_bookings_by_token` | Busca agendamentos por token de gerenciamento |
| `auto_block_lunch_break` | Bloqueia slots de almoco automaticamente |
| `health_check` | Verifica status do banco e retorna metricas basicas |
| `validate_coupon` | Valida cupom por codigo, verifica validade, usos e servicos elegiveis |
| `apply_coupon` | Incrementa contador de usos do cupom |
| `is_client_blocked_by_no_show` | ~~Verifica se cliente esta bloqueado~~ Sempre retorna false (desativado) |
| `check_client_no_show_block` | ~~Bloqueia agendamento~~ No-op (so notifica, nao bloqueia) |
| `get_last_booking_by_phone` | Busca ultimo agendamento por telefone (com rate limit) |
| `lookup_client_by_phone_rate_limited` | Busca cliente com rate limit (wrapper) |
| `get_bookings_by_phone_rate_limited` | Busca agendamentos com rate limit (wrapper) |
| `get_last_booking_by_phone_rate_limited` | Busca ultimo agendamento com rate limit (wrapper) |
| `check_client_milestones` | Verifica milestones de fidelidade disponiveis |
| `get_client_milestones_public` | Busca progresso de fidelidade (publico) |
| `increment_client_visit` | Incrementa contador de visitas do cliente |
| `preserve_client_stats` | Preserva estatisticas do cliente antes de limpar dados |
| `cleanup_old_data` | Limpeza mensal de bookings e audit logs antigos |

### Views
- `faturamento_diario` — Calcula faturamento por data (security_invoker)

### Triggers
- `trg_booking_token_inserted` — AFTER INSERT ON booking_tokens: cria notificacao "Novo Agendamento! 💈"
- `trg_booking_status_cancelled` — AFTER UPDATE OF status ON bookings WHEN status = 'cancelled': deleta notificacao antiga e insere "Agendamento Cancelado ❌"

---

## 6. Seguranca

### RLS (Row Level Security)
- **services/settings:** Leitura publica, escrita apenas admin autenticado
- **clients/bookings:** Leitura e escrita apenas admin autenticado
- **push_subscriptions:** Apenas admin autenticado
- **admin_users:** Apenas admin pode ver/modificar a lista de admins
- **gallery_images:** Leitura publica, gerenciamento apenas admin autenticado (storage: admin-only via is_admin())
- **coupons/loyalty_milestones/client_milestones:** Apenas admin autenticado

### Gerenciamento de Admins
O sistema usa a tabela `admin_users` para controlar quem e admin. Para adicionar/remover admins, use os comandos SQL:
```sql
-- Listar admins
SELECT au.user_id, u.email FROM admin_users au JOIN auth.users u ON u.id = au.user_id;

-- Adicionar admin
INSERT INTO admin_users (user_id) SELECT id FROM auth.users WHERE email = 'NOVO_EMAIL';

-- Remover admin
DELETE FROM admin_users WHERE user_id = 'UUID_DO_ADMIN';
```

### Protecoes implementadas
- **Rate limit agendamento:** Max 3 agendamentos por telefone por dia (server-side)
- **Rate limit login:** Max 5 tentativas de login em 15 minutos via `check_rate_limit` RPC (server-side)
- **Rate limit booking submit:** Max 3 tentativas por minuto client-side + server-side
- **Confirmação de cancelamento:** Modal antes de executar cancelamento no perfil do cliente (evita acidentes)
- **Senha no reset de dados:** Fluxo de 2 etapas: digitar ZERAR/DELETAR + senha do admin
- **Double-booking:** Index unique impede dois agendamentos no mesmo horario
- **SQL injection:** Todas as consultas usam PostgREST parametrizado
- **XSS:** React escapa inputs automaticamente
- **Modais:** Hook `useModalA11y` com Escape-to-close, focus trap e restauracao de foco
- **Acessibilidade:** Skip link, aria-labels, aria-modal em todos os modais
- **Error Reporting:** Sentry captura erros em producao com contexto completo

### Headers de seguranca (vercel.json)
```
Content-Security-Policy: default-src 'self'; script-src 'self' https://fonts.googleapis.com https://www.googletagmanager.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; ...
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### Sentry (Error Reporting)
O Sentry esta configurado para capturar erros em producao automaticamente.

**O que captura:**
- Erros de React (componentes)
- Erros de JavaScript (runtime)
- Rejeicoes de promises
- Erros de rede

**Configuracao:**
- `VITE_SENTRY_DSN` no `.env`
- Inicializado em `src/main.tsx`
- So envia erros em producao (nao em desenvolvimento)
- Replay de sessao quando ha erro (pra ver o que o usuario fez)

**Painel:** [sentry.io](https://sentry.io) → Projeto "Black Diamond"

---

## 7. Setup e Desenvolvimento

### Pre-requisitos
- Node.js 18+
- npm
- Conta no Supabase (gratis)
- Conta no Vercel (gratis, para deploy)

### Passo 1: Clonar e instalar
```bash
git clone <url-do-repositorio>
cd "Black Diamond"
npm install
```

### Opção B: Instalação Manual

### Opção B: Manual
1. Crie um projeto no [supabase.com](https://supabase.com)
2. Acesse o SQL Editor
3. Execute as migrations em ordem: `001_schema_core.sql` → `002_multi_barber_pagamentos.sql` → `003_auditoria_rls.sql` → `004_escopo_barbeiro_acesso.sql` → `005_conta_cliente_v2.sql` → `006_agenda_duration_auth.sql` (ou cole `supabase/_RODAR_NO_SQL_EDITOR.sql` de uma vez; a `007_remove_assinaturas_pix.sql` so roda em bases que ja tinham o sistema de assinaturas)
4. Acesse Authentication > Users e crie o usuario admin

### Passo 3: Configurar variaveis de ambiente
Copie `.env.example` para `.env` e preencha:
```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anon
VITE_BARBER_WHATSAPP=5531999999999
VITE_VAPID_PUBLIC_KEY=sua_chave_publica_vapid
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx  # Opcional, para error reporting
```

### Passo 4: Rodar
```bash
npm run dev
```

### Comandos uteis
```bash
npm run dev          # Desenvolvimento
npm run build        # Build de producao
npm run lint         # Verificar erros de codigo
npm run preview      # Preview do build
npm run test         # Rodar testes (watch mode)
npm run test:run     # Rodar testes uma vez
npm run test:coverage # Rodar testes com coverage (minimo 70%)
npm run test:e2e     # Rodar testes E2E (Playwright)
```

---

## 8. Deploy na Vercel

1. Crie conta na [Vercel](https://vercel.com) com GitHub
2. Importe o repositorio
3. Configure as Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_BARBER_WHATSAPP`
   - `VITE_VAPID_PUBLIC_KEY`
4. Clique em Deploy
5. A Vercel gera um link HTTPS automatico

### Configuracao do Supabase para producao
- Adicione o dominio da Vercel nos **Redirect URLs** do Supabase (Authentication > URL Configuration)
- Ex: `https://seu-app.vercel.app/**`

### Sentry (Opcional)
Se quiser error reporting em producao:
1. Crie uma conta no [sentry.io](https://sentry.io)
2. Crie um projeto "Black Diamond" (React)
3. Copie o DSN
4. Adicione `VITE_SENTRY_DSN` nas Environment Variables do Vercel

---

## 9. CI/CD (GitHub Actions)

O projeto ja possui um pipeline de CI configurado em `.github/workflows/ci.yml`.

### O que roda automaticamente
Toda vez que ha um push ou PR pra branch `main`:
1. **Lint** — Verifica erros de codigo (`npm run lint`)
2. **Test** — Executa todos os testes com coverage (`npm run test:coverage`)
3. **Type Check** — Verifica tipos TypeScript (`npx tsc --noEmit`)
4. **Build** — Verifica se o projeto compila (`npm run build`)

### Coverage Minimo
O CI bloqueia merge se a cobertura ficar abaixo de 70% em qualquer metrica (statements, branches, functions, lines).

### Como funciona
- Push/PR na branch `main` → workflow executa automaticamente
- Se qualquer etapa falhar, o deploy nao e feito
- Os testes rodam em ambiente isolado (Ubuntu, Node 20)

---

## 10. Staging (Ambiente de Teste)

### O que e
Staging e uma COPIA do site que so o desenvolvedor acessa pra testar antes de liberar pros clientes.

| Ambiente | Branch | URL | Quem usa |
|----------|--------|-----|----------|
| Producao | `main` | `black-diamond-wheat.vercel.app` | Clientes |
| Staging | `staging` | `black-diamond-teste.vercel.app` | Desenvolvedor |

### Como funciona no dia a dia

#### Quando quer TESTAR algo antes de liberar:
```bash
git checkout staging
git merge main
git push
```
O Vercel deploya automaticamente em `black-diamond-teste.vercel.app`. Tu testa la.

#### Quando ta tudo OK e quer liberar pros clientes:
Nao precisa fazer nada! Se o staging veio da main, o site de producao ja ta atualizado.

#### Quando quer mudar algo NOVO e arriscado:
```bash
git checkout staging
# Mexe no codigo...
git add .
git commit -m "descreva a mudanca"
git push
```
Testa no staging. Se tiver ok:
```bash
git checkout main
git merge staging
git push
```
Agora ta liberado pros clientes.

### Regra simples
> **NUNCA mexa direto na main pra testar coisa nova.** Sempre testa no staging primeiro. Se der errado no staging, ninguem ve. Se der errado na main, o barbeiro reclama.

---

## 11. Recuperacao de Senha

### Fluxo
1. Admin clica "Esqueceu a senha?" no login
2. Supabase envia email com link de reset
3. Admin clica no link e e redirecionado para `/admin/reset-password`
4. Admin define nova senha
5. Login automatico apos alteracao

### Configuracao no Supabase
1. Authentication > Email Templates > Reset Password — cole o template HTML do Black Diamond
2. Authentication > URL Configuration > Redirect URLs — adicione:
   - `https://seu-dominio.com/admin/reset-password`

---

## 12. Variaveis de Ambiente

| Variavel | Descricao | Obrigatorio |
|----------|-----------|-------------|
| `VITE_SUPABASE_URL` | URL do projeto Supabase | Sim |
| `VITE_SUPABASE_ANON_KEY` | Chave anon/public do Supabase | Sim |
| `VITE_BARBER_WHATSAPP` | Numero WhatsApp do barbeiro (formato: 5531999999999) | Sim |
| `VITE_VAPID_PUBLIC_KEY` | Chave publica VAPID para notificacoes push | Sim |
| `VITE_SENTRY_DSN` | DSN do Sentry para error reporting | Sim (producao) |

---

## 13. Estrutura de Pastas

```
Black Diamond/
├── .github/
│   └── workflows/
│       └── ci.yml              # Pipeline de CI/CD
├── public/
│   ├── assets/                 # Imagens (logo, hero, fundos — sem fotos de barbeiro/galeria)
│   ├── manifest.json           # Configuracao PWA
│   └── sw.js                   # Service Worker (cache offline)
├── src/
│   ├── components/
│   │   ├── Admin/              # Componentes do painel admin
│   │   │   ├── AdminLayout.tsx
│   │   │   ├── AdminSidebar.tsx
│   │   │   ├── AuthGuard.tsx
│   │   │   ├── BottomTabs.tsx
│   │   │   ├── ForgotPasswordModal.tsx  # Modal de recuperacao de senha
│   │   │   ├── LoginBackground.tsx      # Background do login desktop
│   │   │   ├── LoginHeader.tsx          # Header do login
│   │   │   ├── LoginForm.tsx            # Formulario de login
│   │   │   ├── LoginToast.tsx           # Toast do login
│   │   │   ├── Navbar.tsx
│   │   │   ├── booking/        # Componentes de agendamento admin (responsivos)
│   │   │   │   ├── index.ts
│   │   │   │   ├── BookingStepIndicator.tsx
│   │   │   │   ├── RescheduleBanner.tsx
│   │   │   │   ├── ResponsiveClientStep.tsx    # Busca cliente (desktop + mobile)
│   │   │   │   ├── ResponsiveServicesStep.tsx  # Seleção serviços (desktop + mobile)
│   │   │   │   └── ResponsiveDateTimeStep.tsx   # Data/hora (desktop + mobile)
│   │   │   └── shared/         # Componentes compartilhados
│   │   │       ├── BlockedPanel.tsx
│   │   │       ├── BookingDetailPanel.tsx
│   │   │       ├── AdminBookingShell.tsx
│   │   │       ├── BlockedPanel.tsx
│   │   │       ├── BlockedSlotView.tsx
│   │   │       ├── BookingDetailPanel.tsx
│   │   │       ├── BookingSearchModal.tsx
│   │   │       ├── BookingSlidePanel.tsx
│   │   │       ├── ClientPanel.tsx
│   │   │       ├── ClosedDayView.tsx
│   │   │       ├── CompleteModal.tsx
│   │   │       ├── DashboardHeader.tsx
│   │   │       ├── DayOffButton.tsx
│   │   │       ├── DeleteClientModal.tsx
│   │   │       ├── DeleteModal.tsx
│   │   │       ├── EditClientModal.tsx
│   │   │       ├── EndOfDayView.tsx
│   │   │       ├── FilterTabs.tsx
│   │   │       ├── FreePanel.tsx
│   │   │       ├── HistoryView.tsx
│   │   │       ├── NewClientModal.tsx
│   │   │       ├── OccupiedPanel.tsx
│   │   │       ├── OfflineBanner.tsx
│   │   │       ├── ReminderClientList.tsx
│   │   │       ├── ReminderFilterTabs.tsx
│   │   │       ├── ReminderModal.tsx
│   │   │       ├── RescheduleWizard.tsx
│   │   │       ├── ThankYouModal.tsx
│   │   │       ├── ToastNotification.tsx
│   │   │       └── UnblockModal.tsx
│   │   │   └── settings/       # Configuracoes do admin
│   │   │       ├── SettingsList.tsx
│   │   │       ├── SettingsConta.tsx
│   │   │       ├── SettingsCupons.tsx
│   │   │       ├── SettingsDados.tsx
│   │   │       ├── SettingsDepoimentos.tsx
│   │   │       ├── SettingsFaltas.tsx
│   │   │       ├── SettingsFidelidade.tsx
│   │   │       ├── SettingsGaleria.tsx
│   │   │       ├── SettingsHorarios.tsx
│   │   │       ├── SettingsMensalista.tsx
│   │   │       ├── SettingsNotificacoes.tsx
│   │   │       └── SettingsServicos.tsx
│   │   ├── Booking/            # Componentes de agendamento
│   │   │   ├── BookingPageView.tsx
│   │   │   ├── BookingPreScreen.tsx       # Tela de entrada simplificada (v3.34: sem codigo)
│   │   │   ├── BookingPreScreenMenu.tsx    # Menu de 2 opcoes (memoizado)
│   │   │   ├── DataStep.tsx
│   │   │   ├── DateTimeStep.tsx
│   │   │   ├── ReviewStep.tsx
│   │   │   ├── ServiceStep.tsx
│   │   │   └── SuccessStep.tsx
│   │   ├── About.tsx
│   │   ├── ClientProfile.tsx              # ~230 linhas (v3.34: sem fluxo de codigo)
│   │   ├── ClientProfileDashboard.tsx      # Dashboard extraido (memoizado)
│   │   ├── ClientProfileTypes.ts           # Tipos extraidos
│   │   ├── ConnectionStatusBanner.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── Footer.tsx
│   │   ├── Gallery.tsx
│   │   ├── Hero.tsx
│   │   ├── Location.tsx
│   │   ├── Navbar.tsx
│   │   ├── PwaInstallModal.tsx
│   │   ├── Services.tsx
│   │   ├── Skeleton.tsx
│   │   ├── StandaloneGuard.tsx
│   │   ├── TestimonialsSlider.tsx
│   │   └── WhatsAppIcon.tsx
│   ├── hooks/
│   │   ├── README.md
│   │   ├── useAdminBookingSubmit.ts
│   │   ├── useAdminClientSearch.ts
│   │   ├── useAdminLogout.ts
│   │   ├── useAuditLog.ts
│   │   ├── useBarberSettings.ts
│   │   ├── useBookingFilters.ts
│   │   ├── useBookingManagement.ts
│   │   ├── useBookingModals.ts
│   │   ├── useBookings.ts
│   │   ├── useBookingSlots.ts
│   │   ├── useBookingSubmit.ts
│   │   ├── useBookingWizard.ts
│   │   ├── useClientCreation.ts
│   │   ├── useClientLookup.ts
│   │   ├── useClientPanel.ts
│   │   ├── useClients.ts
│   │   ├── useClientsData.ts
│   │   ├── useConnectionStatus.ts
│   │   ├── useCsvExport.ts
│   │   ├── useDashboardData.ts
│   │   ├── useDateDragScroll.ts
│   │   ├── useGallery.ts
│   │   ├── useGalleryData.ts
│   │   ├── useGalleryPreview.ts
│   │   ├── useGallerySelection.ts
│   │   ├── useGalleryUpload.ts
│   │   ├── useIsDesktop.ts
│   │   ├── useMensalistaFilter.ts
│   │   ├── useModalA11y.ts
│   │   ├── useNoShow.ts
│   │   ├── useNotificationPrefs.ts
│   │   ├── useNotifications.ts
│   │   ├── useProfileStats.ts
│   │   ├── usePushNotifications.ts
│   │   ├── usePwaInstall.ts
│   │   ├── useRateLimit.ts
│   │   ├── useReducedMotion.ts
│   │   ├── useReminders.ts
│   │   ├── useReschedule.ts
│   │   ├── useRevenueChartData.ts
│   │   ├── useSEO.tsx
│   │   ├── useServices.ts
│   │   ├── useSlotBlocking.ts
│   │   ├── useTestimonials.ts
│   │   ├── useToast.ts
│   │   ├── useWizardStep.ts
│   │   └── useXlsxExport.ts
│   ├── lib/
│   │   ├── api/                # Funcoes de API separadas por dominio
│   │   │   ├── index.ts        #   Barrel export
│   │   │   ├── bookings.ts     #   Agendamentos
│   │   │   ├── clients.ts      #   Clientes
│   │   │   ├── coupons.ts      #   Cupons
│   │   │   ├── loyalty.ts      #   Fidelidade
│   │   │   ├── mensalista.ts   #   Planos mensalistas
│   │   │   ├── noShow.ts       #   Controle de faltas
│   │   │   ├── services.ts     #   Servicos
│   │   │   ├── templates.ts    #   Templates WhatsApp
│   │   │   └── testimonials.ts #   Depoimentos
│   │   ├── constants.ts        # Constantes
│   │   ├── csv.ts              # Exportacao CSV
│   │   ├── logger.ts           # Logger (Sentry)
│   │   ├── notifications.ts    # Parse de notificacoes
│   │   ├── supabase.ts         # Cliente Supabase
│   │   ├── utils.ts            # Utilitarios (formatPhone, dates, slots)
│   │   ├── whatsapp.ts         # URLs e formatacao WhatsApp
│   │   └── xlsx.ts             # Exportacao XLSX
│   ├── pages/
│   │   ├── AdminBooking.tsx
│   │   ├── AdminClients.tsx
│   │   ├── AdminDashboard.tsx
│   │   ├── AdminLogin.tsx
│   │   ├── AdminProfile.tsx
│   │   ├── AdminResetPassword.tsx
│   │   ├── AdminWeekly.tsx
│   │   ├── BookingPage.tsx
│   │   ├── CancelPage.tsx
│   │   ├── Home.tsx
│   │   ├── ManageBooking.tsx
│   │   ├── NotFound.tsx
│   │   └── NotificationsPage.tsx
│   ├── test/
│   │   └── setup.ts
│   ├── types/
│   │   └── index.ts            # Definicao de tipos TypeScript
│   ├── App.tsx                 # Roteamento principal
│   ├── index.css               # Estilos globais + Tailwind
│   ├── main.tsx                # Entry point + Service Worker
│   └── vite-env.d.ts           # Tipos globais (Window, Navigator)
├── supabase/
│   ├── seeds/                  # Dados iniciais (depoimentos)
│   ├── migrations/             # Migrations (8 arquivos)
│   │   ├── 001_schema_core.sql          # Schema base + RPCs + triggers + seeds + cron
│   │   ├── 002_multi_barber_pagamentos.sql # Multi-barbeiro + pagamentos
│   │   ├── 003_auditoria_rls.sql        # Performance + auditoria + RLS estrito
│   │   ├── 004_escopo_barbeiro_acesso.sql # Escopo RLS por barbeiro + acesso publico seguro
│   │   ├── 005_conta_cliente_v2.sql     # Conta do cliente v2 + horario por barbeiro
│   │   ├── 006_agenda_duration_auth.sql # Conflito por duracao + Supabase Auth
│   │   ├── 007_remove_assinaturas_pix.sql # Remocao do sistema de assinaturas/PIX
│   │   └── 008_gallery_barber_id.sql     # Galeria: coluna barber_id para filtro por barbeiro
│   └── functions/
│       ├── send-push/              # Edge function de notificacao push
│       ├── cliente-recuperar-senha/ # Recuperacao de senha por codigo (cliente)
│       └── criar-acesso-barbeiro/   # Criacao de acesso para barbeiros
├── e2e/                        # Testes E2E (Playwright)
│   ├── accessibility.spec.ts   # Testes de acessibilidade
│   ├── admin.spec.ts           # Testes do admin (login, navegacao, rate limiting)
│   ├── booking.spec.ts         # Testes do agendamento
│   ├── booking-errors.spec.ts  # Testes de erros, concorrencia, limites
│   └── visual.spec.ts          # Testes visuais (screenshots)
├── vercel.json                 # Configuracao de deploy + headers de seguranca
├── package.json
├── vite.config.ts
├── tsconfig.json
└── eslint.config.js
```

---

## 14. Testes

### Como rodar

```bash
npm run test          # Watch mode (re-roda ao salvar)
npm run test:run      # Executa uma vez
npm run test:coverage # Com cobertura de codigo (minimo 70%)
npm run test:e2e      # Testes E2E com Playwright
```

### Estrutura

- **Hooks**: `src/hooks/*.test.ts` — Testam logica de hooks customizados
- **Utils**: `src/lib/utils.test.ts` — Testam funcoes auxiliares
- **API**: `src/lib/api.test.ts` — Testam chamadas ao Supabase (mockadas)
- **Componentes**: `src/components/**/*.test.tsx` — Testam renderizacao e interacao
- **Paginas**: `src/pages/*.test.tsx` — Testam fluxos completos
- **E2E**: `e2e/*.spec.ts` — Testes de ponta a ponta com Playwright

### Padroes de Mock

```typescript
// Mock do Supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      // ...
    })),
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
  },
}));

// Mock do Framer Motion
vi.mock('framer-motion', () => ({
  motion: { div: 'div' },
  AnimatePresence: ({ children }) => children,
}));

// Mock do React Router
vi.mock('react-router', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/', search: '' }),
}));
```

### Testes E2E (Playwright)

Os testes E2E verificam fluxos completos de ponta a ponta:

- **booking.spec.ts** — Fluxo de agendamento do cliente
- **booking-errors.spec.ts** — Tratamento de erros, concorrencia, limites, 404, acessibilidade, performance
- **admin.spec.ts** — Login, logout, navegacao, rate limiting, protecao de rotas

### Coverage Minimo

O CI bloqueia merge se a cobertura ficar abaixo de 70%:
- Statements: 70%
- Branches: 70%
- Functions: 70%
- Lines: 70%

### Cobertura atual

- **116 arquivos de teste**
- **1211 testes** (unit + E2E)
- Hooks, Utils, API, Componentes e Paginas cobertos
- CI/CD com GitHub Actions: lint → test:coverage → typecheck → build
- **Coverage minimo:** 70% (statements, branches, functions, lines)

### Cobertura atual (v3.23.1)

| Métrica | Cobertura |
|---------|-----------|
| Statements | 68.49% |
| Branches | 55.13% |
| Functions | 60.34% |
| Lines | 70.19% |

> ⚠️ Branches e Functions ainda abaixo do threshold de 70%. Melhorias em andamento.

---

## 15. Troubleshooting

### "Nenhum agendamento aparece no admin"
- Verifique se o usuario esta na tabela `admin_users` (SELECT * FROM admin_users)
- Verifique se o RLS esta ativo no Supabase

### "Servico nao carrega"
- Verifique as variaveis de ambiente no `.env`
- Verifique se o Supabase esta acessivel

### "WhatsApp nao abre apos agendamento"
- Verifique se `VITE_BARBER_WHATSAPP` esta configurado no `.env`
- O numero deve estar no formato: `5531999999999` (_codigo_do_pais + DDD + numero)
- O WhatsApp so abre em producao (HTTPS) ou localhost
- Se o barbeiro nao configurou o telefone no painel, usa a env var como fallback

### "WhatsApp do barbeiro mostra numero errado no site"
- O `Services.tsx` agora usa `useBarberSettings()` (busca do banco de dados)
- Se o barbeiro alterou o WhatsApp no painel (Settings > Conta), o site reflete automaticamente
- O `.env` com `VITE_BARBER_WHATSAPP` funciona apenas como fallback quando o banco esta vazio
- Para forçar a atualizacao, va em Settings > Conta, altere o WhatsApp e salve novamente

### "Horario de almoco nao desliga"
- O toggle de horario de almoco agora remove o objeto `lunch_break` do JSON ao desativar
- Antes: o toggle so alternava `enabled` de true pra false, mas visualmente continuava ligado
- Agora: ao desligar, o `lunch_break` e completamente removido, e o toggle mostra corretamente como desligado
- Lembre-se de clicar em "Salvar alteracoes" apos desligar

### "Build falha"
- Rode `npm run lint` para ver erros
- Rode `npm run test:run` para verificar testes
- Verifique se todas as dependencias estao instaladas (`npm install`)

### "Reset de senha nao envia email"
- Configure o SMTP no Supabase (Authentication > Email Templates)
- Verifique o Redirect URL em Authentication > URL Configuration
- O template de email precisa do link `{{ .ConfirmationURL }}`

### "Notificacoes push nao funcionam"
- Verifique se `VITE_VAPID_PUBLIC_KEY` esta configurada no `.env`
- Verifique se as chaves VAPID estao configuradas nos Secrets do Supabase
- Verifique se a edge function `send-push` esta deployada
- So funciona em HTTPS (producao)

### "Sentry nao captura erros"
- Verifique se `VITE_SENTRY_DSN` esta configurada no `.env`
- Verifique se o DSN esta correto (formato: `https://xxx@sentry.io/xxx`)
- Erros so sao capturados em producao (nao em desenvolvimento)
- Verifique o painel do Sentry em [sentry.io](https://sentry.io)

### "Coverage do CI falha"
- Rode `npm run test:coverage` localmente para ver a cobertura atual
- Adicione testes para arquivos nao cobertos
- O minimo e 70% em statements, branches, functions e lines

---

## 16. Sistema de Assinatura (Removido)

> **REMOVIDO em 2026-08-15** (migration `007_remove_assinaturas_pix.sql`).
>
> O sistema de assinaturas mensais com pagamento PIX (R$50/mes) foi **descontinuado**:
> as tabelas `subscriptions`, `payment_logs` e `payment_blocked_users` foram dropadas,
> junto com as funcoes (`check_subscription_status`, `update_subscription_paid`,
> `check_login_allowed`, `auto_create_subscription`, ...), o trigger, o cron e a setting
> `owner_pix_key`. Os dados antigos foram preservados em
> `scripts/backup-assinaturas-pix.json`.
>
> O painel administrativo **nao exige mais pagamento** — o acesso e livre para todos
> os barbeiros cadastrados.

---

## 17. Login Opcional do Cliente

### Porta Unica (v3.35) — acesso universal
Cliente e admin entram pela **mesma tela** `/entrar`, com um único campo inteligente:
- **Celular** → entra como CLIENTE no dashboard (sem senha)
- **E-mail** → revela a senha → entra como ADMINISTRADOR
- A rota legada `/admin/login` abre a mesma tela já em modo admin (AuthGuard e deep-links intactos)

> 🔒 **Seguranca:** o painel admin exige sempre e-mail + senha (Supabase Auth).
> Celular nunca da acesso administrativo.

### Visao Geral (cliente)
O cliente acessa seus agendamentos **sem senha, sem email e sem codigo falso**.
Basta digitar o telefone e entrar direto no dashboard (v3.34).

### Fluxo

```
/agendar/entrada (menu simplificado)

▸ "Agendar agora" → vai direto pro wizard (sem cadastro obrigatorio)
▸ "Meus agendamentos" → /cliente

/cliente

▸ Digita o telefone
  → Entra DIRETO no dashboard (sem etapa de codigo)
  → Sessao salva por 7 dias no dispositivo

▸ Dashboard: "Ola, [Nome]!"
  📊 Stats: visitas, gasto total, valor pendente
  📅 Seus agendamentos (cards premium)
  ✓ Cancelar agendamento (com confirmacao)
  ➕ Novo agendamento
  🚪 Sair (limpa sessao)

Depois de agendar (SuccessStep)

▸ Card "Seu link de gerenciamento" com botao Copiar
  → /gerenciar?token=... abre cancelar/reagendar SEM login
  → Mesma infra de booking_tokens que ja existia no /cancelar
▸ Botao "Meus agendamentos" → /cliente (sessao ja salva)
```

### Seguranca
- Sessao salva no localStorage por 7 dias (helper centralizado `src/lib/clientSession.ts`)
- Link de gerenciamento com token unico (32 hex) expira em 30 dias — regenerado a cada agendamento
- Nao requer SMS, email ou API externa — custo zero
- Acesso restrito aos agendamentos associados ao telefone informado

### Rotas
- `/entrar` — Porta Unica (campo inteligente: celular → cliente, e-mail → admin)
- `/cliente` — Dashboard do cliente (telefone → dashboard)
- `/admin/login` — Porta Unica em modo admin (rota legada preservada)
- `/gerenciar?token=xxx` — Link magico de gerenciamento (redirect pra `/cancelar`)

> **Historico (v3.34):** Removido o "codigo de acesso" que era gerado e exibido na propria tela — era segurança teatral (qualquer um com o celular digitava o codigo que acabou de ver). O fluxo duplicado em BookingPreScreen e ClientProfile (~250 linhas) tambem foi eliminado.

---

## 18. Notas de Negocio

### Custo de operacao
- Hospedagem (Vercel): R$ 0,00
- Banco de dados (Supabase Free): R$ 0,00
- Notificacoes push (Web Push): R$ 0,00

- Error Reporting (Sentry Free): R$ 0,00 (5.000 erros/mes)
- Dominio: ~R$ 40,00/ano (opcional)

### O que cobrar do cliente
- Valor do desenvolvimento
- Compra do dominio anual (se aplicavel)
- Manutencao mensal (opcional)

### Funcionalidades implementadas
- [x] Agendamento online 4 steps (desktop + mobile)
- [x] Painel admin completo (dashboard, semana, clientes, agendamento manual)
- [x] Notificacoes push via navegador (admin)
- [x] Botao WhatsApp nas notificacoes — mensagem pronta pro cliente
- [x] Sistema de avaliacoes
- [x] CI/CD com GitHub Actions
- [x] Headers de seguranca (CSP, X-Frame-Options, etc.)
- [x] Configuracoes do barbeiro (nome, WhatsApp, Bio, Frase, Instagram, foto)
- [x] Menu de foto estilo Instagram (alterar/remover com popover animado)
- [x] Lembretes WhatsApp com modelos personalizaveis
- [x] Horarios de funcionamento configuraveis pelo admin
- [x] Reset financeiro e deletar clientes
- [x] Layout desktop com stepper profissional
- [x] Layout mobile estilo Instagram (tela cheia)
- [x] Skeleton loading nas paginas principais
- [x] Acessibilidade: focus-visible, contraste, skip-link, aria-live
- [x] Atualizacao em tempo real (Context API + hooks customizados)
- [x] Sistema de mensalista (servicos exclusos, dias restritos, identificacao automatica por telefone)
- [x] Error reporting com Sentry (captura automatica de erros em producao)
- [x] Coverage minimo no CI (70% — bloqueia merge abaixo do threshold)
- [x] Testes E2E robustos (erro de rede, concorrencia, limites, acessibilidade)
- [x] Busca de clientes otimizada (so clientes ativos)
- [x] Stepper elegante com indicador de progresso
- [x] Galeria editavel com upload, delete, reordenacao e multi-select
- [x] Barra de progresso durante upload com animacao
- [x] Layout inteligente adaptativo (featured/grid/carousel)
- [x] Preview profissional estilo Windows 7 Photo Viewer
- [x] Dock flutuante com efeito de vidro (glass morphism)
- [x] Long press no mobile com menu contextual
- [x] Multi-select no desktop com toolbar flutuante
- [x] Navegacao por teclado (setas, A/D, ESC)
- [x] Modal de delete estilo bottom sheet
- [x] Conversao automatica para WebP em uploads
- [x] WhatsApp dinamico (configuravel pelo admin)
- [x] Animacao marquee na galeria
- [x] Projeto universal: template pronto para qualquer barbearia
- [x] Schema do banco via migrations (001-006)
- [x] Clipping mask na foto de perfil (drag + zoom estilo Instagram)
- [x] Anti-burro: validacao de horarios, preco minimo, DDD
- [x] UX da galeria estilo Google Fotos (header compacto, selecao integrada)
- [x] Scrollbar dourada so no desktop (mobile limpo)
- [x] AdminLogin splitado em 5 componentes (melhor manutenibilidade)
- [x] Horarios do Footer dinamicos (refletem configuracoes do admin). Location exibe apenas mapa.
- [x] Admin booking filtra dias desativados (working_days) igual o cliente
- [x] Login com inputs transparentes, borda dourada no focus e altura maior no desktop
- [x] WhatsApp do barbeiro integrado ao contexto (useBarberSettings) — alteração no admin reflete em todo o site
- [x] Toggle de horário de almoço funcional — desativar remove o objeto do JSON completamente
- [x] WhatsApp na confirmação do booking — mensagem vai pro barbeiro com número configurado
- [x] working_days não corrompe mais com 'lunch_break' — bug de iteração corrigido
- [x] Desktop/Mobile Steps unificados — 6 componentes virarem 3 responsivos (menos código duplicado)
- [x] Som de notificação — dois tons via Web Audio API quando chega agendamento novo
- [x] Badge no título da aba — `(3) Black Diamond` mostra notificações não lidas
- [x] Preview toast dourado — card desliza do topo com auto-dismiss de 5s
- [x] Confirmação de cancelamento — modal antes de cancelar no ClientProfile.tsx
- [x] Rate limit server-side no login — 5 tentativas em 15 minutos via `check_rate_limit` RPC
- [x] Senha no reset de dados — SettingsDados.tsx exige senha do admin antes de zerar/deletar
- [x] Trigger de cancelamento no banco — notificação antiga é deletada e substituída por "Agendamento Cancelado ❌"
- [x] Fix auto_block_lunch_break — NOT NULL violation corrigida no INSERT
- [x] DailyRevenue corrigido — só conta bookings 'completed' (não mais 'confirmed')
- [x] Calendário sem dias pulados — getNextDays gera de hoje até sábado, sem pular domingo
- [x] Realtime notifications com DELETE/UPDATE — notificação some em tempo real ao cancelar
- [x] Auto-reconnect WebSocket — reconexão automática com backoff exponencial
- [x] Settings desktop sem tremor — min-h-[600px] evita layout shift ao trocar de aba
- [x] Realtime ativado no banco — ALTER PUBLICATION supabase_realtime ADD TABLE notifications e bookings
- [x] Dashboard em tempo real — cancela/cria agendamento e os cards atualizam sozinhos
- [x] Programa de Fidelidade — Configuracao de meta de visitas, incremento automatico, barra de progresso
- [x] Cupons e Promocoes — CRUD completo, validacao, aplicacao no agendamento, desconto
- [x] Controle de Faltas — Marcar no-show, bloqueio automatico apos N faltas
- [x] Taxa de Ocupacao — Card com percentual do dia, abas com contadores
- [x] Graficos de Faturamento — Diario, semanal, comparativo mensal (recharts)
- [x] Top Servicos — Ranking 1-2-3 com barras de progresso
- [x] CSV export corrigido — Separador ponto e virgula para Excel brasileiro
- [x] UI limpa notificacoes — Removido "Marcar todas" e "Todas" (selecao)
- [x] Avatares quadrados — Consistencia visual nos modais de clientes
- [x] Export XLSX (Excel) — XML SpreadsheetML, zero dependencias externas
- [x] Analise por dia da semana — Nova aba no RevenueChart
- [x] Sentry release tag + source maps no CI
- [x] Export XLSX (Excel) com XML SpreadsheetML, zero dependencias externas
- [x] Analise por dia da semana no RevenueChart
- [x] Cupons de desconto (percentage, fixed, free) com validacao server-side
- [x] Programa de fidelidade com milestones e progresso
- [x] Controle de faltas (no-show) com bloqueio automatico
- [x] Migrations consolidadas (14+ → 8 arquivos limpos)
- [x] Documentacao atualizada com novas features
- [x] Bugfix: useGallery snapshot deep copy (rollback corrompido)
- [x] Bugfix: useGallerySelection delete parcial (rastreia deletados com sucesso)
- [x] Bugfix: deleteAllClients deletava TODOS os bookings (agora deleta apenas dos clientes)
- [x] Bugfix: BookingDetailPanel optional chaining (crash se clients null)
- [x] Bugfix: AdminBooking loadClients .catch() + mounted guard
- [x] Bugfix: useBookingModals state clearing pos loadData()
- [x] Bugfix: useBookingWizard double-submit guard
- [x] Bugfix: getNextDays sabado-apos-fechar inicia em segunda
- [x] Bugfix: utils.ts JSON.parse validacao estrutural do barber_hours
- [x] Bugfix: useNotifications limpa canal no unmount (WebSocket leak)

### Possiveis melhorias futuras
- [ ] Multi-tenancy (varias barbearias no mesmo sistema)
- [ ] API de WhatsApp (Evolution API) para lembretes automaticos
- [ ] Export PDF para relatorios
- [ ] App nativo Android (APK) via Capacitor
- [ ] Drag and drop para reordenar fotos na galeria
- [ ] Filtros e edicao de imagens no admin
- [ ] Tema claro/escuro alternavel pelo admin
- [ ] Adicionar mais testes E2E para fluxos complexos
- [ ] Integrar Sentry com GitHub para vincular erros a commits
- [ ] Historico de faltas no perfil do cliente
- [ ] Indicador de "cliente bloqueado" na lista de clientes
- [ ] Grafico de ocupacao ao longo do tempo
- [ ] Faturamento por servico (receita, nao apenas contagem)

---

## 17. Notificacoes Push (Web Push)

### Visao Geral
O sistema envia notificacoes push automaticamente ao criar um novo agendamento. O admin recebe a notificacao no celular/desktop mesmo com o app fechado, e pode enviar confirmacao pro cliente com 1 clique via WhatsApp.

### Como funciona
1. Admin ativa notificacoes em **Perfil > Notificar**
2. O browser pede permissao e salva a subscription no Supabase
3. Quando alguem agenda, o frontend invoca a edge function `send-push`
4. A edge function envia push notification + cria notificacao in-app
5. O barbeiro ve a notificacao no painel e clica no icone WhatsApp
6. WhatsApp abre com mensagem pronta pro cliente (confirmacao + link de gerenciamento)

### Mensagem formatada
Quando o barbeiro clica no icone WhatsApp, a seguinte mensagem e preenchida automaticamente:

```
Agendamento confirmado, [Nome]!

Na Black Diamond

[Servicos]
[Data] as [Horario]
R$ [Valor]

Para cancelar ou reagendar:
[Link de gerenciamento]

Aguardamos voce!
```

O barbeiro so aperta Enviar — pronto!

### Configuracao

#### 1. Gerar chaves VAPID
```bash
npx web-push generate-vapid-keys
```

#### 2. Configurar `.env`
```
VITE_VAPID_PUBLIC_KEY=<chave_publica_gerada>
```

#### 3. Configurar secrets no Supabase (Edge Functions > Secrets)
```
VAPID_PRIVATE_KEY=<chave_privada_gerada>
VAPID_PUBLIC_KEY=<chave_publica_gerada>
VAPID_SUBJECT=mailto:seu-email@gmail.com
SUPABASE_SERVICE_ROLE_KEY=<sua_service_role_key>
```

#### 4. Rodar SQL no Supabase Execute as migrations em ordem (001→006)

#### 5. Deploy da edge function
```bash
supabase functions deploy send-push
```

### Arquivos envolvidos
- `supabase/functions/send-push/index.ts` — Edge function que envia o push e cria notificacao in-app
- `src/hooks/usePushNotifications.ts` — Hook React para subscribe/unsubscribe (admin)
- `src/components/Admin/NotificationBell.tsx` — Botao WhatsApp nas notificacoes
- `src/hooks/useBookingSubmit.ts` — Envia notificacao apos criar agendamento
- `public/sw.js` — Service Worker que recebe e mostra a notificacao
- `supabase/migrations/` — Schema completo do banco

---

## 18. Instalação PWA (Smart Install)

### Visao Geral
O sistema detecta automaticamente a plataforma do usuário e oferece a melhor experiência de instalação:

- **iPhone (Safari):** Abre um modal com instruções passo-a-passo ilustradas (ícone Compartilhar → Adicionar à Tela de Início → Confirmar)
- **Android (Chrome):** Dispara o prompt nativo do navegador (`beforeinstallprompt`) — o próprio Chrome gerencia a instalação
- **Desktop:** Mostra o prompt de instalação do navegador

### Banner público
Um banner fixo no rodapé das páginas públicas convida o visitante a instalar o app. O banner:
- Não aparece em páginas admin (o admin tem botão próprio no perfil)
- Não aparece se o app já estiver instalado (`display-mode: standalone`)
- Pode ser dispensado pelo usuário (armazenado em `sessionStorage`)

### Instalação no dashboard do cliente
O dashboard do cliente (`ClientProfileDashboard`) também oferece instalação PWA:
- **Desktop:** Botão "Instalar App" na sidebar, entre "Novo Agendamento" e "Sair"
- **Mobile:** Card premium "Instalar Black Diamond" na aba Configurações
- O app instalado é o mesmo "Black Diamond" — o cliente instala pelo contexto que está usando
- Manifest ajustado: `start_url` de `/admin/login` para `/` (abre no contexto do usuário)
- Atalhos adicionados: "Área do Cliente" (`/cliente`) e "Agendar Horário" (`/agendar`)

### Componentes

| Arquivo | Função |
|---------|--------|
| `src/hooks/usePwaInstall.ts` | Hook reutilizável com detecção de plataforma, listeners `beforeinstallprompt`/`appinstalled`, e handlers de instalação |
| `src/components/PwaInstallModal.tsx` | Modal de instruções para iOS + botão de confirmação para Android |
| `src/components/PwaInstallBanner.tsx` | Banner flutuante no rodapé das páginas públicas |

### Hook `usePwaInstall`

```typescript
const {
  isIOS,          // boolean — Safari no iPhone/iPad/iPod
  isStandalone,   // boolean — app já instalado
  isIOSChrome,    // boolean — Chrome no iOS (não suporta instalação)
  canInstall,     // boolean — pode instalar
  showPrompt,     // boolean — controla visibilidade do modal
  deferredPrompt, // BeforeInstallPromptEvent | null
  setShowPrompt,  // (v: boolean) => void
  handleInstall,  // () => Promise<void> — lógica principal
  handleConfirmInstall, // () => Promise<void> — confirmar no modal
} = usePwaInstall(onSuccess?, onError?);
```

### Detecção de plataforma
A lógica decide automaticamente:
1. Se já instalado → mostra mensagem "Já instalado"
2. Se iOS Chrome → avisa para abrir no Safari
3. Se Android com `deferredPrompt` → dispara prompt nativo
4. Se iOS ou sem `deferredPrompt` → abre modal de instruções

---
## 19. Sistema de Mensalista

### Visao Geral
O sistema de mensalista permite que clientes com plano mensal tenham beneficios como servicos inclusos e restricoes de agendamento.

### Funcionamento
- **Servicos inclusos:** Mensalistas tem "Corte de Cabelo" incluso no plano
- **Servicos adicionais:** Podem adicionar Barba, Sobrancelha, etc.
- **Restricao de dias:** So podem agendar de Segunda a Quinta
- **Tag visual:** Aparece "[MENSALISTA]" no WhatsApp

### Como usar
1. Admin vai em **Meus Clientes** e clica no cliente
2. Clica em "Tornar Mensalista" no painel do cliente
3. Quando agendar pra esse cliente, o sistema automaticamente:
   - Exclui servicos inclusos da selecao
   - Mostra banner "Corte incluso no plano"
   - Permite pular selecao de servicos
   - Restringe datas para Seg-Qua

### Arquivos envolvidos
- `src/contexts/BarberSettingsContext.tsx` — Estado compartilhado
- `src/pages/AdminBooking.tsx` — Logica de mensalista no admin
- `src/components/Admin/booking/DesktopServicesStep.tsx` — UI desktop
- `src/components/Admin/booking/MobileServicesStep.tsx` — UI mobile
- `src/components/Booking/ServiceStep.tsx` — UI cliente

---

## 20. Skeleton Loading

### Visao Geral
Skeleton loading melhora a experiencia do usuario mostrando placeholders animados enquanto os dados carregam.

### Componentes disponiveis
- `Skeleton` — Componente basico (text, circle, rect)
- `SkeletonCard` — Card com titulo e linhas
- `SkeletonList` — Lista de itens com avatar
- `SkeletonDashboard` — Layout completo do dashboard
- `SkeletonBooking` — Layout do agendamento
- `SkeletonClients` — Layout da pagina de clientes

### Onde e usado
- **AdminDashboard** — Enquanto carrega bookings
- **AdminClients** — Enquanto carrega lista de clientes
- **AdminProfile** — Enquanto carrega dados do perfil

### Arquivos envolvidos
- `src/components/Skeleton.tsx` — Componentes de skeleton
- `src/components/Skeleton.test.tsx` — Testes unitarios

---

## 21. Sistema de Galeria

### Visao Geral
A galeria permite que o barbeiro gerencie as fotos do portfolio diretamente pelo painel admin, com interface profissional inspirada no Windows 7 Photo Viewer.

### Funcionalidades
- **Upload de fotos:** Max 8 fotos, max 2MB cada, conversao automatica para WebP
- **Barra de progresso:** Indicador visual com spinner e barra animada durante upload
- **Delete individual:** Long press (mobile) ou hover + botao (desktop) com modal de confirmacao
- **Multi-select (desktop):** Botao "Selecionar" ativa modo selecao, clique nas fotos para marcar
- **Reordenacao:** Botao mover com modal de posicao
- **Preview profissional:** Visualizacao em tela cheia com dock estilo Windows 7
- **Layout inteligente:** Exibicao adaptativa baseada na quantidade de fotos

### Interface Mobile
- **Grid:** Grade 2 colunas com fotos responsivas
- **Long press (500ms):** Abre menu contextual com opcoes Mover, Excluir, Cancelar
- **Preview:** Seta de voltar no topo, swipe para navegar, dock simplificado
- **Contador:** Mostra posicao atual / total de fotos
- **Layout inteligente:** Muda baseado na quantidade de fotos (veja abaixo)

### Interface Desktop
- **Grid:** Grade horizontal com hover overlay para acoes rapidas
- **Modo Selecao:** Botao "Selecionar" ativa modo multi-select
  - Clique nas fotos para marcar/desmarcar
  - Ctrl+A para selecionar todas
  - Delete/Backspace para excluir selecionadas
  - ESC para limpar selecao
- **Preview estilo Windows 7 Photo Viewer:**
  - Top bar com X para fechar + contador
  - Dock flutuante com efeito de vidro (backdrop-filter: blur)
  - Logo Black Diamond centralizada entre setas
  - Navegacao por teclado: setas, A/D, ESC
  - Botao mover e excluir no dock

### Layout Inteligente (Sistema de Exibicao)
O gallery adapta automaticamente o layout baseado na quantidade de fotos e dispositivo:

#### Mobile (< 768px)
| Fotos | Modo | Layout |
|-------|------|--------|
| 0 | Empty | Placeholders |
| 1-2 | Featured | Grade (1-2 colunas) |
| 3-4 | Grid | Grade 2 colunas |
| 5+ | Carousel | Marquee infinito |

#### Desktop (>= 768px)
| Fotos | Modo | Layout |
|-------|------|--------|
| 0 | Empty | Placeholders |
| 1-2 | Featured | Cards grandes lado a lado |
| 3-5 | Grid | Linha horizontal |
| 6+ | Carousel | Marquee infinito |

**Por que essa logica?**
- Poucas fotos (1-4): Layout estatico evita repeticao visual
- Muitas fotos (5+ mobile, 6+ desktop): Carousel justificado pela quantidade

### Dock de Acoes (Desktop)
- **Estilo:** Cápsula translucida com blur(16px), borda sutil, sombra suave
- **Botoes:** Flat, escalam 5% no hover, fundo aparece suavemente
- **Excluir:** Cinza normal, vermelho apenas no hover
- **Posicao:** Flutuante na parte inferior, 15px acima da borda

### Modal de Delete
- **Mobile:** Bottom sheet com slide-up, drag indicator, botoes empilhados
- **Desktop:** Centralizado com backdrop blur, botoes full-width
- **Confirmacao:** Exige clique intencional, nao fecha ao clicar fora

### Multi-Select (Desktop)
- **Ativacao:** Clique em "Selecionar" no topo da galeria
- **Selecao:** Clique nas fotos para marcar (checkbox dourado)
- **Toolbar flutuante:** Contador + Mover + Excluir + Cancelar
- **Atalhos:** Ctrl+A (todas), Delete (excluir), ESC (limpar)
- **Visual:** Borda dourada + anel nas fotos selecionadas

### Conversao WebP
Todas as imagens sao convertidas para WebP automaticamente antes do upload:
- **Gallery:** Max 1200px, qualidade 85%
- **Foto de perfil:** Max 800px, qualidade 85%
- Reducao media de 70-80% no tamanho do arquivo

### Barra de Progresso de Upload
Quando o admin seleciona uma foto para enviar:
- **Botao "Adicionar"** muda para "Enviando..." e fica desabilitado
- **Barra de progresso** aparece acima da galeria com:
  - Spinner dourado animado
  - Texto "Enviando a foto..."
  - Barra que preenche de 0% a 100% com gradiente dourado
- **Animacao suave** de entrada (height + opacity) e saida
- **Fixa na posicao** — nao move o layout da galeria

### Componentes
- `SettingsGaleria.tsx` — Painel de gerenciamento no admin (grid + preview + modais)
- `Gallery.tsx` — Exibicao da galeria com marquee no site
- `GalleryLightbox.tsx` — Visualizacao em tela cheia para clientes

### Arquivos envolvidos
- `src/components/Admin/settings/SettingsGaleria.tsx`
- `src/components/Gallery.tsx`
- `src/components/GalleryLightbox.tsx`
- `src/components/Admin/settings/SettingsList.tsx`
- `src/pages/AdminProfile.tsx`
- `estrutura_barbearia.sql` (tabela gallery_images)

---

## 22. Layout Inteligente da Galeria

### Visao Geral
O sistema de galeria adapta automaticamente o layout baseado na quantidade de fotos disponiveis e no dispositivo do usuario (mobile/desktop).

### Por que e necessario?
- **Poucas fotos (1-4):** Layout estatico evita repeticao visual indesejada
- **Muitas fotos (5+):** Carousel justificado pela quantidade de conteudo

### Logica de Decisao

#### Mobile (< 768px)
```
0 fotos    → Empty (placeholders)
1-2 fotos  → Featured (grade simples)
3-4 fotos  → Grid (2 colunas)
5+ fotos   → Carousel (marquee infinito)
```

#### Desktop (>= 768px)
```
0 fotos    → Empty (placeholders)
1-2 fotos  → Featured (cards grandes lado a lado)
3-5 fotos  → Grid (linha horizontal)
6+ fotos   → Carousel (marquee infinito)
```

### Modos de Exibicao

#### Empty
- 4 cards placeholder com borda tracejada
- Indica que nao ha fotos na galeria

#### Featured (1-2 fotos)
- **Mobile:** Grade com 1-2 colunas
- **Desktop:** Cards grandes (450x550px) lado a lado
- Hover com scale suave

#### Grid (3-4 mobile, 3-5 desktop)
- **Mobile:** Grade 2 colunas, todas visiveis na tela
- **Desktop:** Linha horizontal com cards (320x420px)
- Hover com scale e overlay

#### Carousel (5+ mobile, 6+ desktop)
- Marquee infinito com animacao
- Imagens duplicadas para efeito continuo
- Suficiente para nao parecer repetitivo

### Componentes Envolvidos
- `Gallery.tsx` — Componente principal com logica de decisao
- `GalleryLightbox.tsx` — Visualizacao em tela cheia

---

## 23. Programa de Fidelidade

### Visao Geral
O programa de fidelidade permite que clientes acumulem visitas a cada atendimento e ganhem um servico gratuito ao atingir a meta configurada pelo admin.

### Configuracao no Admin
- **Acessar:** Perfil > Configuracoes > Fidelidade
- **Ativar/Desativar:** Toggle liga/desliga o programa
- **Meta de visitas:** Slider de 3 a 30 visitas
- **Servico premio:** Selecionar qual servico sera gratuito

### Fluxo
1. Admin configura a meta (ex: 5 visitas) e o servico premio
2. A cada booking concluido, o sistema soma 1 visita no cliente
3. Ao atingir a meta, o cliente recebe uma notificacao "GANHOU!"
4. As visitas sao resetadas para 0

### Componentes
- `src/lib/api/loyalty.ts` — API layer (getLoyaltyConfig, saveLoyaltyConfig, incrementVisitAndReward, getLoyaltyProgress)
- `src/components/Admin/settings/SettingsFidelidade.tsx` — Painel de configuracao
- `src/components/Admin/shared/ClientPanel.tsx` — Barra de progresso por cliente
- `src/hooks/useClientPanel.ts` — Hook que busca progresso do cliente
- `src/hooks/useBookingModals.ts` — Chama incrementVisitAndReward apos completar booking

### Tabelas no Banco
- `loyalty_milestones` — meta de visitas e servico premio (configurado pelo admin)
- `client_milestones` — progresso e resgates por cliente

(A tabela antiga `loyalty_config` foi removida na limpeza de 2026-08-15 — o progresso agora vive em `loyalty_milestones` + `client_milestones`.)

---

## 24. Cupons e Promocoes

### Visao Geral
O sistema de cupons permite criar cupons de desconto (porcentagem, valor fixo ou servico gratuito) com controle de validade e limite de utilizacoes.

### Configuracao no Admin
- **Acessar:** Perfil > Configuracoes > Cupons
- **Tipos:** Porcentagem (%), Fixo (R$), Gratuito (servico gratis)
- **Validade:** Data de inicio e fim (opcional)
- **Limite:** Numero maximo de usos (opcional)
- **Servicos:** Quais servicos o cupom se aplica (todos ou especificos)

### Fluxo do Cliente
1. Na tela de revisao do agendamento, cliente digita o codigo do cupom
2. Sistema valida o cupom (validade, usos restantes, servicos elegiveis)
3. Desconto e aplicado no preco total
4. Cupom e registrado no booking

### Componentes
- `src/lib/api/coupons.ts` — API layer (CRUD + validate + apply)
- `src/components/Admin/settings/SettingsCupons.tsx` — Painel de gerenciamento
- `src/components/Booking/ReviewStep.tsx` — Input de cupom no agendamento
- `src/hooks/useBookingWizard.ts` — Validacao e aplicacao do cupom

### Tabela no Banco
```sql
CREATE TABLE coupons (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed', 'free')),
  discount_value numeric NOT NULL DEFAULT 0,
  valid_from date NOT NULL DEFAULT CURRENT_DATE,
  valid_until date,
  max_uses integer,
  current_uses integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  applicable_service_ids uuid[] DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now()
);
```

### RPCs
- `validate_coupon(p_code, p_service_ids)` — Valida cupom e calcula desconto
- `apply_coupon(p_coupon_id)` — Incrementa contador de usos

---

## 25. Controle de Faltas (No-Show)

### Visao Geral
Permite marcar quando um cliente nao comparece. Apos um numero configuravel de faltas em 90 dias, o cliente e automaticamente bloqueado de novos agendamentos.

### Configuracao no Admin
- **Acessar:** Perfil > Configuracoes > Controle de Faltas
- **Limite de faltas:** Slider de 1 a 10 (validado 1-20)
- **Periodo:** Ultimos 90 dias

### Funcionamento
- Botao "Nao Compareceu" no painel de detalhe do agendamento
- Contagem de faltas por cliente (ultimos 90 dias)
- Bloqueio automatico na criacao de agendamento via RPC

### Componentes
- `src/lib/api/noShow.ts` — API layer
- `src/hooks/useNoShow.ts` — Hook (markAsNoShow, undoNoShow, getClientNoShowCount, isClientBlocked)
- `src/components/Admin/settings/SettingsFaltas.tsx` — Painel de configuracao
- `src/components/Admin/shared/BookingDetailPanel.tsx` — Botao "Nao Compareceu"

### Limitacoes Atuais
- Botao "Desfazer No-Show" existe no hook mas nao tem UI
- Contagem de faltas nao aparece no perfil do cliente
- Clientes bloqueados somem da lista sem indicacao visual

---

## 26. Taxa de Ocupacao

### Visao Geral
Visao do dia atual com contadores de horarios ocupados, livres e bloqueados.

### Onde Aparece
- Dashboard do admin (abas de filtro Ocupados / Livres / Bloqueados com contadores)

### Funcionamento
- Abas calculam a quantidade de slots em cada estado (ocupado / livre / bloqueado)
- Contadores atualizados em tempo real via realtime subscription

### Componentes
- `src/components/Admin/shared/FilterTabs.tsx` — Abas com contadores
- `src/components/Admin/shared/OccupiedPanel.tsx` — Painel de agendamentos ocupados
- `src/components/Admin/shared/FreePanel.tsx` — Painel de horarios livres
- `src/components/Admin/shared/BlockedPanel.tsx` — Painel de horarios bloqueados
- `src/hooks/useDashboardData.ts` — Dados do dia

---

## 27. Painel (Resumo de Faturamento)

### Visao Geral
Pagina "Painel" (AdminReports) com resumo financeiro da semana/mes, comparacao semanal, ganhos por dia e servicos mais populares.

### Modos de Exibicao
1. **Semana** — Ganhos da semana atual, comparacao com a semana anterior e barras por dia
2. **Mes** — Ganhos do mes atual (lucroMes), cortes e cancelamentos no periodo

### Cards de Estatisticas
- **Ganhos Semana/Mes** — Faturamento no periodo selecionado
- **Total Geral** — Faturamento acumulado (lucroTotal)
- **Cortes** — Atendimentos concluidos no periodo
- **Cancelamentos** — Cancelamentos no periodo
- **Comparacao Semanal** — Variacao percentual vs semana anterior
- **Ganhos por Dia** — Barras por dia da semana
- **Servicos Populares** — Top 5 servicos mais pedidos

### Componentes
- `src/pages/AdminReports.tsx` — Pagina completa (sem dependencia de componentes de grafico externos)
- `src/hooks/useProfileStats.ts` — Estatisticas gerais (lucros, concluidos, cancelados, topServices)
- `src/hooks/useWeeklyRevenue.ts` — Receita semanal e variacao vs semana anterior

### Limitacoes Atuais
- Sem faturamento por servico (apenas contagem)
- Sem grafico de pizza/rosca
- Sem analise por dia da semana historico
- Sem comparacao entre periodos customizados

---

## Refatoração v3.32.0

Refatoração de componentes monolíticos para melhor performance e manutenibilidade.

### Splits realizados

| Componente | Antes | Depois | Economia |
|-----------|-------|--------|----------|
| `BookingPreScreen.tsx` | 831 linhas | 373 + 167 (2 arquivos) | **-35%** |
| `ClientProfile.tsx` | 935 linhas | 313 + 341 + 26 (3 arquivos) | **-27%** |

### memo() adicionado

| Componente | Linhas | Status |
|-----------|-------|--------|
| `ClientPanel.tsx` | 755 | ✅ `memo()` adicionado |
| `AdminWeekly.tsx` | 497 | ✅ `memo()` adicionado |
| `BarberDashboard.tsx` | 523 | ✅ `memo()` adicionado |
| `SettingsServicos.tsx` | 459 | ✅ `memo()` adicionado |
| `SettingsHorarios.tsx` | 501 | ✅ Já tinha `memo()` |

**Economia total:** ~1.000 linhas removidas do bundle principal.

### React import fix
- `React.forwardRef` / `React.ReactNode` / `React.ChangeEvent` / `React.FormEvent` substituídos por named imports (`forwardRef`, `ReactNode`, `ChangeEvent`, `FormEvent`)
- Elimina `ReferenceError: React is not defined` nos testes

### Resultados

| Check | Status |
|-------|--------|
| TypeScript | 0 erros ✅ |
| Testes | 1205 passando (114 arquivos) ✅ |
| Build | 2.33s ✅ |

## Auditoria v3.31.0

Auditoria completa do projeto realizada em julho/2026 identificou e corrigiu os seguintes pontos:

### Gargalos de performance corrigidos

| ID | Problema | Correcao |
|----|----------|----------|
| G1 | `Date.now()` em render puro (BookingPreScreen) | Movido para `useEffect` + `setInterval` com cleanup |
| G2 | Cache do localStorage instavel (useServices, useBookings) | Memoizado com `useMemo([])` / `useMemo([date])` |
| G3 | Vendor chunks mal segmentados | Manual chunks explicitos para `@tanstack/react-query` e `lucide` |
| G5 | ClientPanel monolitico no bundle de AdminClients (62KB) | Lazy load via `React.lazy()` — reduziu para 40KB (-35%) |

### Warnings React Hooks corrigidos

| Hook | Warning | Correcao |
|------|---------|----------|
| `useNotifications.ts:81` | `notifications` muda a cada render | `useMemo(() => query.data ?? [], [query.data])` |
| `useProfileStats.ts:144-145` | `bookings`/`services` instaveis | `useMemo` dedicado |
| `useGallery.ts:118` | `images` faltando em deps | Adicionado |
| `BookingWizardContext.tsx:204` | `selectedBarber?.user_id` faltando | Adicionado |
| `useConnectionStatus.ts:76` | `retryTimerRef.current` no cleanup | Capturado no inicio do effect |
| `useNotificationPrefs.ts:48` | setState in effect (fetch mount) | eslint-disable com comentario |
| `useReschedule.ts:30` | setState in effect (loading) | eslint-disable com comentario |

### Codigo morto removido

- **Edge Functions Asaas** (358 linhas): `create-asaas-payment/`, `asaas-webhook/`
- **`createAsaasPayment()`** em `src/lib/api/subscriptions.ts`
- **`PaymentResult` interface** (uso Asaas)
- **`generatePayment`/`paymentResult`/`paymentError`** em `useSubscription.ts`
- Componentes `GoogleReviewBadge.tsx`, `ReviewRequestModal.tsx`
- `.eslintrc.cjs` (substituido por `eslint.config.js`)
- Arquivos lixo: `vite.log`, `nul`, `%TEMP%gold_files.txt`

### Migrations adicionadas

- **`008_performance_indexes.sql`** — 9 indices + view `dashboard_daily_stats` + funcao `get_dashboard_data(uuid, date)` para agregar multiplas queries do AdminDashboard em uma unica chamada RPC.

### Resultados

| Check | Antes | Depois |
|-------|-------|--------|
| ESLint | 13 erros, 20 warnings | 0 erros, 0 warnings |
| TypeScript | 0 erros | 0 erros |
| Tests | 1205 passed, 5 Unhandled Rejection | 1205 passed, 0 errors |
| Bundle AdminClients | 62KB | 40KB (-35%) |
| Build time | 2.55s | 2.19s |

*Documento atualizado em Julho 2026. Versao do sistema: 3.22.0*
