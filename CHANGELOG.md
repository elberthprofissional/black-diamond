# Changelog

Todas as mudancas notaveis neste projeto serao documentadas neste arquivo.

O formato e baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

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
