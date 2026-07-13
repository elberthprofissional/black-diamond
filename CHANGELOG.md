# Changelog

Todas as mudancas notaveis neste projeto serao documentadas neste arquivo.

O formato e baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [3.21.0] - 2026-07-13

### Added
- **Badge "🔥 Mais Pedido" nos serviços** — Corte de Cabelo e Barba agora exibem badge verde com "🔥 Mais Pedido" na página pública (Services.tsx) e no fluxo de agendamento (ServiceStep.tsx). Mobile mostra "🔥 Popular" (texto mais curto).
- **Skeleton no agendamento público** — Novo componente `SkeletonBooking` com placeholders animados para nome, WhatsApp, cupom e lista de serviços. Aparece enquanto os serviços carregam no `/agendar`.
- **Indicador "Ao vivo" no Dashboard** — Badge verde com ponto pulsante e texto "Ao vivo" ao lado do título "Agenda do Dia", usando `useConnectionStatus`. Versão compacta "AO VIVO" no mobile.
- **Botão de refresh manual** — Ícone de refresh (RefreshCw) no Dashboard e Agenda Semanal para recarregar dados manualmente.
- **Realtime na Agenda Semanal (AdminWeekly)** — Subscription Supabase Realtime para a data selecionada, atualiza bookings e slots automaticamente.
- **Toast mais alto no mobile** — Posição do `ToastNotification` alterada de `bottom-28` para `bottom-24 sm:bottom-28` para evitar ficar atrás do teclado no celular.

### Changed
- **Transição entre steps do booking** — Animação mudada de fade vertical (y-axis) para slide horizontal (x-axis). Steps entram pela direita (x: 40) e saem pela esquerda (x: -40), com easing `easeInOut` para sensação mais fluida.
- **Botão "Marcar lidas" nas notificações** — Agora é um botão dourado com fundo `#C5A059/10`, borda sutil, ícone de check e texto dinâmico mostrando a quantidade (ex: "Marcar 3 lidas").
- **Modal de excluir cliente** — Agora exige digitar "EXCLUIR" no campo de texto para habilitar o botão de confirmação. Adicionado ícone de alerta, spinner durante exclusão e descrição mais clara.
- **Dashboard "Lucro do Dia"** — Quando o valor é R$ 0, exibe "Sem movimento" com ponto pulsante ao invés de "R$ 0".
- **Dias passados na Agenda Semanal** — Dias anteriores ao atual aparecem com opacidade reduzida, texto riscado (line-through), badge "FIM" no canto, cursor not-allowed e tooltip "Dia já encerrado".

### Removed
- **API de depoimentos removida** — Arquivo `src/lib/api/testimonials.ts` deletado, exports removidos do barrel, interface `Testimonial` removida dos tipos. Depoimentos agora são exclusivamente hardcoded no `TestimonialsSlider.tsx`.

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
- **Desktop/Mobile Steps unificados** — 6 componentes (DesktopClientStep, MobileClientStep, DesktopServicesStep, MobileServicesStep, DesktopDateTimeStep, MobileDateTimeStep) substituídos por 3 componentes responsivos (ResponsiveClientStep, ResponsiveServicesStep, ResponsiveDateTimeStep) que usam `useIsDesktop()` internamente.
- **AdminBooking.tsx** — Importa 3 componentes em vez de 6. Menos código duplicado, mais fácil de manter.
- **auto_block_lunch_break** — Corrigido com `'{}'::UUID[]` no lugar de `ARRAY[]::UUID[]` para evitar NOT NULL violation.
- **Notificações canceladas na UI** — `NotificationDetail` detecta automaticamente notificações de cancelamento e mostra apenas botão "Falar com Cliente" + banner vermelho, sem os botões quebrados de ação.

### Removed
- **6 arquivos mortos** — DesktopClientStep.tsx, MobileClientStep.tsx, DesktopServicesStep.tsx, MobileServicesStep.tsx, DesktopDateTimeStep.tsx, MobileDateTimeStep.tsx (substituídos pelos responsivos).
- **Variável `prevCountRef`** — Dead code removido do `useNotifications.ts`.

### Fixed
- **Notificação de agendamento cancelado** — Notificações de agendamentos cancelados não aparecem mais como se estivessem ativas. Ao clicar, mostra UI de cancelado em vez de botões que não funcionam.
- **Edge case `unblock_day`** — Trigger de cancelamento ignora slots bloqueados (client_id IS NULL) para não gerar notificações falsas.
- **auto_block_lunch_break** — NOT NULL violation (23502) corrigida no INSERT de blocos de almoço.

## [3.13.0] - 2026-07-10

### Added
- **PWA Install Inteligente** — Hook `usePwaInstall` + componente `PwaInstallModal` reutilizáveis. Banner público no rodapé convidando a instalar. No iPhone mostra instruções passo-a-passo com ícones; no Android dispara prompt nativo do navegador (`beforeinstallprompt`).
- **Banner PWA no site público** — Pequeno card fixo no rodapé das páginas públicas com botão "Instalar". Pode ser dispensado pelo usuário.

### Changed
- **AdminProfile refatorado** — Lógica de instalação PWA extraída para hook compartilhado `usePwaInstall`.

### Removed
- **Sistema de Avaliação removido** — `RatingPage.tsx`, tabela `reviews`, funções `get_average_rating`/`get_top_reviews`, rota `/avaliar/:bookingId`, link de review no modal de agradecimento. (Funcionalidade nunca usada, código morto.)

### Fixed
- **ClientProfile.tsx cancelamento sem token** — `BookingEntry` agora passa o `token` do booking para `cancelBooking`, que o RPC `get_bookings_by_phone` já retornava mas o frontend ignorava.
- **`get_admin_user_ids()` exposta** — Função SQL removida do banco e do `universal.sql` (nunca era usada no frontend).
- **Shadowing em `useNotifications.ts`** — Variável `prev` renomeada para evitar conflito com escopo externo.
- **Diretório `scripts/` vazio removido** — Falsa pista de código não utilizado.

## [3.12.0] - 2026-07-10

### Added
- **Último agendamento (Login Invisível)** — Quando o cliente insere o telefone, o sistema busca o último agendamento e sugere manter os mesmos serviços. Experiência similar a Uber/iFood.
- **Filter tabs no painel de notificações** — Abas "Tudo", "Agendamentos", "Lembretes", "Sistema" estilo Instagram
- **Botão Lembretes no desktop** — sino no topo da lista de clientes que abre modal de seleção
- **Indicadores de clientes** — Verde (recente), Amarelo (15-30 dias), Vermelho (30+ dias)
- **Cards de clientes desktop** — Layout responsivo com 3 colunas, hover effects dourados
- **Mensagem pro barbeiro** — WhatsApp com resumo do agendamento quando cliente agenda
- **Ícone voltar no detalhe da notificação** — Botão circular para retornar à lista

### Changed
- **Notificações mobile** — Header com badge de não lidas e "Marcar todas"
- **Notificações desktop** — Ícone de calendário para agendamentos, indicador de não lido
- **Cor dourada padronizada** — #C5A059 em todo o site (Planos Mensais, botões, etc)
- **Validação de telefone** — Aceita 10 ou 11 dígitos (fixos e celulares)
- **README** — Removido texto amador "R$ 1.990 na conta"

### Fixed
- **PWA Guard** — Usuário fica preso no admin quando usa o PWA
- **Edição de telefone** — Sincronização corrigida após salvar

## [3.11.0] - 2026-07-10

### Fixed
- **WhatsApp dinâmico no Footer** — Link "Criado por Elberth Mayan" agora usa `barberPhone` do banco em vez de número hardcoded
- **WhatsApp na confirmação do booking** — Mensagem agora vai pro BARBEIRO (não pro cliente) com o número configurado no painel admin
- **working_days corrompido** — `lunch_break` não é mais tratado como dia da semana; bug de iteração corrigido no `updateBarberHours`
- **Clientes Teste removidos** — 3 registros de teste deletados do banco
- **AdminLogin.test.tsx** — Adicionado mock de `motion.form` e `motion.p`; inputs de login com placeholder
- **AdminClients.test.tsx** — Seletor de filtro 'Todos' corrigido
- **useBookingWizard.test.ts** — StepTitle atualizado de 'Agende seu corte' para 'Seus dados'
- **Lint warnings** — console.log → console.warn no NotificationBell; destructuring de lunch_break corrigido

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
