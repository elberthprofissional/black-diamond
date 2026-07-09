# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [3.10.0] - 2026-07-10

### Fixed
- **WhatsApp do barbeiro no Services.tsx** — Botões "Tenho interesse" dos planos mensais agora usam `useBarberSettings()` (busca do banco) em vez de `import.meta.env.VITE_BARBER_WHATSAPP` (env var). Quando o barbeiro altera o WhatsApp no painel admin, o número agora reflete em todo o site.
- **Toggle horário de almoço** — Corrigido bug onde o toggle do horário de almoço nunca desligava de verdade. Agora ao desativar, o objeto `lunch_break` é removido completamente do JSON, fazendo o toggle visual e as funções SQL respeitarem o estado desligado.

## [3.9.0] - 2026-07-10

### Changed
- **Mensalista mobile** — Cards redesignados com visual limpo e minimalista
- **Horário de almoço** — Card clicável que abre modal (mobile e desktop)
- **Notificações** — Seleção profissional com checkboxes, agrupamento por data, empty state
- **Painel notificações desktop** — Mais largo (420px), hover effects dourados
- **Validação de telefone** — Corrigido para 11 dígitos (padrão brasileiro)
- **Planos Mensais** — Visual minimalista com cor dourada padronizada (#C5A059)
- **Filtros de clientes** — Pills arredondados no mobile para melhor usabilidade
- **Botões** — Removidos círculos desnecessários (X, ✓)

### Added
- **PWA Guard** — Usuário fica preso no admin no PWA
- **Modo seleção notificações** — Desktop: duplo clique; Mobile: long press
- **Agrupamento por data** — Notificações em Hoje, Ontem, Anteriores
- **Indicador de não lido** — Bolinha dourada em notificações não lidas
- **Enviar Lembrete** — Botão na agenda semanal e no painel de detalhes do agendamento
- **Salvar alterações** — Botão no modal de horário de almoço

### Fixed
- **Toggle almoço** — Bug onde toggle não funcionava no modal desktop
- **Aplicar para todos** — Botão voltou para posição correta no mobile
- **Cor dourada** — Padronizada para #C5A059 em todo o site

## [3.8.0] - 2026-07-08

### Changed
- **Fluxo de notificacao simplificado** — Cliente agenda → barbeiro recebe push + notificacao no painel → clica icone WhatsApp → mensagem pronta pro cliente
- **Mensagem WhatsApp formatada** — Barbeiro envia confirmacao pro cliente com servicos, data, hora, valor e link de gerenciamento
- **Navbar limpa** — Removido painel "Meu Horário" do navbar (localStorage booking card)
- **Removido PWA do cliente** — Service Worker de push mantido apenas para admin
- **Display de notificacoes limpo** — Corpo da notificacao mostra apenas nome, servicos e data (sem telefone/URL)
- **Notificacoes minimalista** — Lista com avatar, nome, horario; detalhes com acoes (Lembrete, Reagendar, Cancelar)
- **Visual premium** — Fundo preto original, tipografia limpa, sem cards cinza

### Removed
- **PWA do cliente** — Botao "Instalar app" removido do SuccessStep
- **PwaGuard** — Rota redirect PWA → admin removida do App.tsx
- **Service Worker registration** — Removido do main.tsx (mantido o sw.js para cache)
- **Remover notificacao** — Botao removido do detalhe (redundante)
- **localStorage booking** — Logica de persistencia de agendamento no cliente removida
- **useClientBooking hook** — Hook morto removido
- **Beforeinstallprompt handler** — Removido do main.tsx

### Added
- **Botao WhatsApp nas notificacoes** — Icone verde aparece ao hover em notificacoes de agendamento
- **Mensagem de confirmacao** — Template formatado com confirmacao, servicos, data, link de gerenciamento
- **Dados enriquecidos na notificacao** — Body inclui telefone do cliente e link de gerenciamento (separados por `|`)

## [3.7.0] - 2026-07-08

### Added
- **PWA do cliente** — Perfil do cliente (`/cliente`) com agendamentos, stats e gerenciamento
- **Centro de notificacoes in-app** — Painel lateral estilo Instagram (desktop) + tela cheia (mobile)
- **Horario de almoço recorrente** — Bloqueio automatico de slots via cron pg_cron
- **Agradecimento com link de avaliacao** — Mensagem inclui nome do servico e link `/avaliar/:id`
- **Card do cliente com link de gerenciamento** — Botao "Gerenciar" no card de agendamento
- **Limpeza de dados antigos** — Cron mensal: bookings > 6 meses, audit logs > 90 dias, preservando stats
- **Relatorio semanal via push** — Toda segunda as 8h: faturamento, atendimentos, top servico
- **Flag de cliente inativo** — Badge amber para clientes sem visita > 30 dias
- **SQL migrations** — notifications, lunch_break, data_cleanup, weekly_report

### Fixed
- **Step titles trocados** — Step 1 agora mostra "Seus dados" em vez de "Agende seu corte"
- **formatPhone traço** — Numero incompleto nao mostra mais traço pendurado
- **lunch_break CHECK constraint** — INSERT corrigido para NULL client_id e total_duration=0

### Removed
- **Zustand** — Dependencia removida do package.json (stores nao eram usadas)
- **useCallbackRef, useDebounce** — Hooks mortos deletados
- **7 arquivos mortos** — GalleryLightbox, ClientBookingCard, BookingSummaryPanel, WhatsAppReminderButton, InlineEditField, CalendarModal, useLatest
- **api.ts barrel duplicado** — Consolidado em api/index.ts

### Fixed
- **Domingo não aparecia na agenda** — corrigido lógica de geração de datas no `getNextDays`
- **Mensalista não era identificado** — coluna `is_mensalista` adicionada ao schema SQL
- **Colunas faltantes na tabela clients** — `is_mensalista`, `is_favorite`, `is_blocked`, `manually_added` adicionadas
- **PhotoCropper removido** — upload agora é direto com conversão WebP
- **Admin booking não mostrava badge mensalista** — adicionado badge visual no desktop e mobile
- **Admin booking não detectava mensalista** — busca por telefone agora verifica status de mensalista
- **Mobile não setava mensalista ao selecionar do modal** — corrigido `onSelectClient`

### Changed
- **getNextDays** agora começa de hoje (inclui domingo se habilitado)
- **useClientLookup** agora tem debounce de 500ms
- **AdminBooking** detecta mensalista automaticamente ao digitar telefone
- **DesktopClientStep** e **MobileClientStep** recebem prop `isMensalista`

## [3.5.0] - 2026-07-05

### Added
- **Sentry** — Error reporting em produção (captura automática de erros com contexto)
- **15+ novos testes E2E** — Erro de rede, concorrência, limites, 404, acessibilidade, performance, rate limiting, proteção de rotas
- **Coverage mínimo no CI** — Thresholds de 70% (statements, branches, functions, lines)
- Variável de ambiente `VITE_SENTRY_DSN`
- SQL de migração para colunas faltantes na tabela `clients`

### Changed
- **AdminLogin.tsx** splitado em 5 componentes: `ForgotPasswordModal`, `LoginBackground`, `LoginHeader`, `LoginForm`, `LoginToast` (459 linhas → 6 arquivos limpos)
- CI agora usa `npm run test:coverage` ao invés de `test:run`
- Documentação atualizada com novas features
- **PhotoCropper removido** — upload agora é direto (conversão para WebP automática)
- **getNextDays** agora começa de hoje (inclui domingo se habilitado)
- **useClientLookup** agora tem debounce de 500ms

### Fixed
- Coverage mínimo agora bloqueia merge se abaixo de 70%
- **Domingo não aparecia na agenda** — corrigido lógica de geração de datas
- **Mensalista não era identificado** — coluna `is_mensalista` adicionada ao schema SQL
- **Colunas faltantes na tabela clients** — `is_mensalista`, `is_favorite`, `is_blocked`, `manually_added` adicionadas

## [3.3.0] - 2026-07-05

### Fixed
- **SECURITY**: Removida busca de VAPID private keys no client (useWeeklyCongrats.ts) — chaves agora ficam apenas no servidor
- **BUG**: Timezone do Google Calendar corrigido (setHours(-3) em vez de setMinutes(+3))
- **BUG**: Service Worker catch block corrigido — lê text() primeiro, depois tenta JSON.parse
- **BUG**: Consolidados dois hooks useBarberSettings duplicados — componentes públicos agora usam o mesmo context

### Changed
- Removidos 14 console.error/warn de código de produção (ErrorBoundary mantido apenas em DEV)
- WhatsAppIcon extraído como componente compartilhado (eliminada duplicação em 3 arquivos)
- formatPhone e formatDateBR centralizados em lib/utils.ts
- og:image e twitter:image agora usam URL absoluta (preview em redes sociais funciona)
- ReviewWithClient tipo morto removido
- deleteAllBookings usa WHERE limpo em vez de gte('created_at', '1970-01-01')
- deleteAllClients usa Promise.all para paralelizar updates
- getNextDays lê horário de fechamento do sábado do localStorage
- Services section usa skeleton loading em vez de texto
- GalleryLightbox e modal de lembrete agora têm role="dialog" e aria-modal="true"

### Added
- Componente WhatsAppIcon compartilhado (src/components/WhatsAppIcon.tsx)
- Utilidade formatDateBR para conversão de datas

## [3.2.0] - 2026-07-04

### Added
- Rate limiting no login (5 tentativas, bloqueio de 15 minutos)
- Audit logs para ações críticas (login, logout, agendamentos, clientes)
- Tabela `audit_logs` no banco de dados
- Testes E2E com Playwright
- Configuração Prettier para formatação consistente
- Husky + lint-staged para prevenir commits sujos
- Skeleton loading no AdminWeekly

### Changed
- ESLint com regras mais rigorosas
- README com badges de status e guia rápido
- PWA agora só abre nas rotas `/admin` (scope ajustado)
- Mensagem WhatsApp pro barbeiro enviada antes do Google Calendar

### Fixed
- WhatsApp pro barbeiro não abria quando cliente escolhia "Quero ser lembrado"
- Ordem de abertura de pop-ups corrigida (WhatsApp primeiro, Google Calendar depois)

### Security
- Validação de rate limit em tentativas de login
- Registro de ações administrativas para auditoria

## [3.1.0] - 2026-07-03

### Added
- Skeleton loading em páginas admin
- Sistema de mensalista (serviços, dias, promoção)
- WhatsApp automático pós-agendamento
- Perfil com foto e bio
- Configurações estilo Instagram
- Telefone do barbeiro configurável
- 34 novos testes unitários

### Changed
- Layout minimalista nas configurações
- Booking separado Desktop/Mobile
- Context dinâmico para dados do barbeiro

### Fixed
- WhatsApp não abria no iOS
- Telefone mostrava valor da env var quando banco vazio
- Diversos fixes de UX e performance

## [3.0.0] - 2026-07-01

### Added
- Sistema de agendamento completo
- Painel admin com dashboard
- Gestão de clientes
- Sistema de serviços
- Bloqueio de horários
- Reagendamento
- Push notifications
- PWA completo

### Architecture
- React 19 + TypeScript 6
- Vite 8 + Tailwind CSS 4
- Supabase (PostgreSQL + RLS + Auth)
- Framer Motion para animações
- Vitest para testes
