# DOCUMENTACAO — BLACK DIAMOND

Sistema completo de agendamento online para barbearias, com painel administrativo, PWA, notificacoes push e integracao com Google Calendar.

**Versao:** 3.7.0 | **Ultima atualizacao:** Julho 2026

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
16. [Notas de Negocio](#16-notas-de-negocio)
17. [Notificacoes Push (Web Push)](#17-notificacoes-push-web-push)
18. [Sistema de Avaliacao](#18-sistema-de-avaliacao)
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

- PWA instalavel na tela inicial do celular
- Galeria editavel com lightbox e delete pelo admin
- Conversao automatica para WebP em uploads
- Menu de foto estilo Instagram (alterar/remover foto)
- Placeholder de perfil generico (sem foto fixa do Tato)
- Acessibilidade: focus-visible, contraste aprimorado, skip-link
- Estado gerenciado com hooks + Context API (leve e sem dependências)
- Error reporting com Sentry (captura automatica de erros)
- Coverage minimo no CI (qualidade garantida)
- Projeto universal: template pronto para qualquer barbearia
- Custo operacional zero (Vercel + Supabase Free Tier + Sentry Free)
- Instalação 100% automática: `node instalar-cliente.mjs` faz tudo

---

## 2. Stack Tecnica

| Camada | Tecnologia | Versao |
|--------|-----------|--------|
| Frontend | React + TypeScript | React 19, TS 6.x |
| Build | Vite | 8.x |
| Estilo | Tailwind CSS | 4.x (via PostCSS) |
| Animacoes | Framer Motion | 12.x |
| Icones | Lucide React | 0.460 |
| Roteamento | React Router DOM | 7.x |
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
- `instalar-cliente.mjs` — Script automático de instalação para novos clientes
- `supabase/universal.sql` — Schema universal do banco (tabelas, RLS, funções, crons)
- Placeholder generico na secao About (sem foto fixa do Tato)
- Script de instalação automática (`instalar-cliente.mjs`)
- Sentry para error reporting em producao

### Filosofia "Template de Barbearia"
> O projeto e feito para ser **replicado**. Cada barbeiro tem seu proprio deploy (Vercel + Supabase), seu proprio dominio, e configura tudo pelo painel. O sistema usa `universal.sql` para setup instantâneo do banco.

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

Erros → Sentry (error reporting automatico)
```

### Como funciona o agendamento
1. O cliente seleciona servicos, data e horario no site
2. O frontend chama a RPC `criar_agendamento` no Supabase
3. A RPC verifica conflitos, cria o client (se novo) e insere o booking
4. O frontend redireciona pro WhatsApp com a mensagem formatada
5. Um trigger dispara notificacao push para o admin
6. O booking e confirmado e notificacoes push sao enviadas

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

### Componentes de agendamento (Booking)
- `ServiceStep` — Selecao de servicos (desktop + mobile)
- `DateTimeStep` — Date picker + time grid (desktop + mobile)
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
- `usePushNotifications` — Inscricao/cancelamento de Web Push
- `useReducedMotion` — Respeita preferencia de movimento do usuario
- `useModalA11y` — Acessibilidade de modais (Escape, focus trap)
- `useConnectionStatus` — Monitora conectividade com o Supabase
- `useAdminLogout` — Logout seguro do admin
- `useRateLimit` — Rate limiting client-side com persistencia
- `useAuditLog` — Logging de acoes administrativas
- `useBookingWizard` — Orquestra todo o fluxo de agendamento
- `useBookingManagement` — Composicao de modais, filtros, reagendamento
- `useBookingFilters` — Filtros do dashboard
- `useBookingModals` — Gerenciamento de modais
- `useClientLookup` — Auto-fill por telefone
- `useDateDragScroll` — Drag scroll no date picker
- `useWizardStep` — Controle de steps do wizard
- `useBarberSettings` — Hook standalone do context
- `useClients` — Composição de hooks para gestão de clientes
- `useDashboardData` — Dados do dashboard (próximo booking, receita, slots)
- `useNotifications` — Notificações in-app com polling em tempo real
- `usePwaInstall` — Detecção e instalação do PWA

### Gerenciamento de Estado
O projeto removeu as stores Zustand. Autenticação usa `supabase.auth` direto via `AuthGuard`, e o estado compartilhado usa Context API + hooks customizados.

---

## 4. Funcionalidades

### Area do Cliente (`/agendar`)
- Selecao de multiplos servicos com precos
- Calendario semanal com slots disponiveis em tempo real
- Formulario de dados com validacao de WhatsApp
- Revisao antes de confirmar
- Tela de sucesso com link de gerenciamento, copiar/enviar WhatsApp
- Layout responsivo desktop/mobile com drag-to-scroll no date picker
- **PWA do cliente:** Instalavel no celular, recebe lembretes push

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

### Avaliacao (`/avaliar/:bookingId`)
- Apos concluir atendimento, cliente avalia de 1 a 5 estrelas
- Avaliacoes reais alimentam o TestimonialsSlider na homepage

### Notificacoes In-App (`/admin/notificacoes`)
- Centro de notificações estilo Instagram
- Desktop: painel lateral que desliza da esquerda
- Mobile: tela cheia com botao voltar
- Badge de nao-lido, mark all as read, deletar individual
- Realtime — novas notificacoes aparecem instantaneamente
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
- **PWA:** Instalacao na tela inicial com guia visual

### Configuracoes (`/admin/profile?tab=settings`)
- **Conta:** Nome, WhatsApp, Bio, Frase, Instagram, foto de perfil
- **Galeria:** Upload, delete, reordenacao e multi-select de fotos do portfolio (max 8 fotos)
- **Horarios:** Configuracao de dias e horarios de funcionamento + **horario de almoço recorrente**
- **Servicos:** Gerenciamento de servicos e precos
- **Mensalista:** Planos, servicos exclusos, gestao de clientes mensalistas
- **Notificacoes:** Toggle de notificacoes push
- **Zona de Seguranca:** Resetar financeiro e deletar clientes

---

## 5. Schema do Banco de Dados

Schema completo: `supabase/universal.sql`

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
reminder_sent BOOLEAN, notes TEXT, created_at TIMESTAMPTZ
```

**notifications** — Notificacoes in-app
```sql
id UUID PK, user_id UUID FK (auth.users), title TEXT, body TEXT,
tag TEXT, url TEXT, read BOOLEAN, created_at TIMESTAMPTZ
```

**reviews** — Avaliacoes de clientes
```sql
id UUID PK, booking_id UUID FK, client_id UUID FK,
rating INTEGER (1-5), comment TEXT, created_at TIMESTAMPTZ
```

**settings** — Configuracoes do sistema
```sql
key TEXT PK, value TEXT, updated_at TIMESTAMPTZ
-- Chaves: opening_time, closing_time, saturday_opening, saturday_closing,
-- working_days, barber_name, barber_phone
```

**reviews** — Avaliacoes de clientes
```sql
id UUID PK, booking_id UUID FK, client_id UUID FK, rating INTEGER, comment TEXT, created_at TIMESTAMPTZ
```

**push_subscriptions** — Inscricoes de notificacao push
```sql
id UUID PK, endpoint TEXT, p256dh TEXT, auth TEXT, user_agent TEXT, created_at TIMESTAMPTZ
```

**secrets** — Chaves de API (VAPID, Google, etc.)
```sql
key TEXT PK, value TEXT, created_at TIMESTAMPTZ
```

**admin_users** — Lista de administradores
```sql
user_id UUID PK (FK para auth.users), created_at TIMESTAMPTZ
```

**gallery_images** — Fotos da galeria do portfolio
```sql
id UUID PK, image_url TEXT, alt TEXT, position INTEGER, created_at TIMESTAMPTZ
```

### Indexes
- `idx_no_double_booking` — Unique em (booking_date, booking_time) WHERE status != 'cancelled'
- `idx_bookings_client_id` — Index em (client_id) para queries por cliente

### RPCs (Funcoes Seguras)

| Funcao | Descricao |
|--------|-----------|
| `criar_agendamento` | Cria booking de forma transacional com rate limit (max 3/dia por telefone) |
| `get_occupied_slots` | Retorna horarios ocupados de uma data |
| `get_available_slots` | Retorna slots livres (respeitando horarios de funcionamento e almoco) |
| `get_business_hours` | Retorna configuracoes de horario como JSON |
| `toggle_slot_block` | Alterna bloqueio de um horario (usa is_blocked) |
| `unblock_day` | Desbloqueia todos os horarios de um dia |
| `save_push_subscription` | Salva inscricao push do admin |
| `delete_push_subscription` | Remove inscricao push |
| `get_average_rating` | Retorna media e total de avaliacoes |
| `get_top_reviews` | Retorna melhores avaliacoes |

### Views
- `faturamento_diario` — Calcula faturamento por data (security_invoker)

### Triggers
- `notificar_push_agendamento` — AFTER INSERT ON bookings, envia push notification
- `limpar_subscriptions_antigas` — Cron diario que remove inscricoes antigas

---

## 6. Seguranca

### RLS (Row Level Security)
- **services/settings:** Leitura publica, escrita apenas admin autenticado
- **clients/bookings:** Leitura e escrita apenas admin autenticado
- **reviews:** Leitura publica, insercao publica, gerenciamento admin
- **push_subscriptions:** Apenas admin autenticado
- **admin_users:** Apenas admin pode ver/modificar a lista de admins
- **gallery_images:** Leitura publica, gerenciamento apenas admin autenticado

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
- **Rate limit:** Max 3 agendamentos por telefone por dia
- **Double-booking:** Index unique impede dois agendamentos no mesmo horario
- **SQL injection:** Todas as consultas usam PostgREST parametrizado
- **XSS:** React escapa inputs automaticamente
- **Modais:** Hook `useModalA11y` com Escape-to-close, focus trap e restauracao de foco
- **Acessibilidade:** Skip link, aria-labels, aria-modal em todos os modais
- **Error Reporting:** Sentry captura erros em producao com contexto completo

### Headers de seguranca (vercel.json)
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com; ...
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

### Opção A: Instalação Automática (Recomendado)
```bash
node instalar-cliente.mjs
```
O script faz tudo sozinho:
1. Cria o projeto Supabase via API de gerenciamento
2. Roda o `universal.sql` automaticamente
3. Cria o usuário admin e já adiciona na tabela `admin_users`
4. Gera o `.env` completo
5. Faz deploy na Vercel (opcional)

### Opção B: Manual
1. Crie um projeto no [supabase.com](https://supabase.com)
2. Acesse o SQL Editor
3. Cole e execute o conteudo de `supabase/universal.sql` no SQL Editor
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
| Producao | `main` | `black-diamond.vercel.app` | Clientes |
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
│   │   │   ├── booking/        # Componentes de agendamento admin
│   │   │   │   ├── index.ts
│   │   │   │   ├── BookingStepIndicator.tsx
│   │   │   │   ├── CalendarModal.tsx
│   │   │   │   ├── RescheduleBanner.tsx
│   │   │   │   ├── DesktopClientStep.tsx
│   │   │   │   ├── DesktopServicesStep.tsx
│   │   │   │   ├── DesktopDateTimeStep.tsx
│   │   │   │   ├── MobileClientStep.tsx
│   │   │   │   ├── MobileServicesStep.tsx
│   │   │   │   └── MobileDateTimeStep.tsx
│   │   │   └── shared/         # Componentes compartilhados
│   │   │       ├── BlockedPanel.tsx
│   │   │       ├── BookingDetailPanel.tsx
│   │   │       ├── BookingSearchModal.tsx
│   │   │       ├── BookingSummaryPanel.tsx
│   │   │       ├── ClientPanel.tsx
│   │   │       ├── CompleteModal.tsx
│   │   │       ├── DashboardHeader.tsx
│   │   │       ├── DeleteClientModal.tsx
│   │   │       ├── DeleteModal.tsx
│   │   │       ├── EditClientModal.tsx
│   │   │       ├── FilterTabs.tsx
│   │   │       ├── FreePanel.tsx
│   │   │       ├── NewClientModal.tsx
│   │   │       ├── OccupiedPanel.tsx
│   │   │       ├── ProfileDesktopMetrics.tsx
│   │   │       ├── ProfileMobile.tsx
│   │   │       ├── ProfileServicesChart.tsx
│   │   │       ├── ReminderModal.tsx
│   │   │       ├── RescheduleWizard.tsx
│   │   │       ├── ThankYouModal.tsx
│   │   │       ├── ToastNotification.tsx
│   │   │       ├── UnblockModal.tsx
│   │   │       └── WhatsAppReminderButton.tsx
│   │   │   └── settings/       # Configuracoes do admin
│   │   │       ├── SettingsList.tsx
│   │   │       ├── SettingsConta.tsx
│   │   │       ├── SettingsGaleria.tsx
│   │   │       ├── SettingsNotificacoes.tsx
│   │   │       └── SettingsDados.tsx
│   │   ├── Booking/            # Componentes de agendamento
│   │   │   ├── DataStep.tsx
│   │   │   ├── DateTimeStep.tsx
│   │   │   ├── ReviewStep.tsx
│   │   │   ├── ServiceStep.tsx
│   │   │   └── SuccessStep.tsx
│   │   ├── About.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── Footer.tsx
│   │   ├── Gallery.tsx
│   │   ├── GalleryLightbox.tsx
│   │   ├── Hero.tsx
│   │   ├── Location.tsx
│   │   ├── Navbar.tsx
│   │   ├── PwaGuard.tsx
│   │   ├── Services.tsx
│   │   └── TestimonialsSlider.tsx
│   ├── hooks/
│   │   ├── useAdminLogout.ts
│   │   ├── useAuditLog.ts
│   │   ├── useBarberSettings.ts
│   │   ├── useBookingFilters.ts
│   │   ├── useBookingManagement.ts
│   │   ├── useBookingModals.ts
│   │   ├── useBookings.ts
│   │   ├── useBookingWizard.ts
│   │   ├── useCallbackRef.ts
│   │   ├── useClientCreation.ts
│   │   ├── useClientLookup.ts
│   │   ├── useClientPanel.ts
│   │   ├── useClients.ts
│   │   ├── useClientsData.ts
│   │   ├── useConnectionStatus.ts
│   │   ├── useDateDragScroll.ts
│   │   ├── useDebounce.ts
│   │   ├── useGallery.ts
│   │   ├── useGalleryData.ts
│   │   ├── useGalleryPreview.ts
│   │   ├── useGallerySelection.ts
│   │   ├── useGalleryUpload.ts
│   │   ├── useIsDesktop.ts
│   │   ├── useLatest.ts
│   │   ├── useModalA11y.ts
│   │   ├── useProfileStats.ts
│   │   ├── usePushNotifications.ts
│   │   ├── useRateLimit.ts
│   │   ├── useReducedMotion.ts
│   │   ├── useReminders.ts
│   │   ├── useReschedule.ts
│   │   ├── useServices.ts
│   │   ├── useSlotBlocking.ts
│   │   ├── useToast.ts
│   │   ├── useWeeklyCongrats.ts
│   │   └── useWizardStep.ts
│   ├── lib/
│   │   ├── api/                # Funcoes de API separadas por domínio
│   │   │   ├── index.ts        #   Barrel export
│   │   │   ├── bookings.ts     #   Agendamentos
│   │   │   ├── clients.ts      #   Clientes
│   │   │   ├── services.ts     #   Serviços
│   │   │   └── mensalista.ts   #   Planos mensalistas
│   │   ├── api.ts              # Funcoes de API (legado, mantido para compatibilidade)
│   │   ├── supabase.ts         # Cliente Supabase
│   │   └── utils.ts            # Utilitarios (formatPhone, dates, slots)
│   ├── pages/
│   │   ├── AdminBooking.tsx
│   │   ├── AdminClients.tsx
│   │   ├── AdminDashboard.tsx
│   │   ├── AdminLogin.tsx           # Splitado em 5 componentes
│   │   ├── AdminProfile.tsx
│   │   ├── AdminResetPassword.tsx
│   │   ├── AdminWeekly.tsx
│   │   ├── BookingPage.tsx
│   │   ├── Home.tsx
│   │   ├── NotFound.tsx
│   │   └── RatingPage.tsx
│   ├── test/
│   │   └── setup.ts
│   ├── types/
│   │   └── index.ts            # Definicao de tipos TypeScript
│   ├── App.tsx                 # Roteamento principal
│   ├── index.css               # Estilos globais + Tailwind
│   ├── main.tsx                # Entry point + Service Worker
│   └── vite-env.d.ts           # Tipos globais (Window, Navigator)
├── supabase/
│   ├── universal.sql           # Schema completo do banco (universal)
│   └── functions/
│       └── send-push/          # Edge function de notificacao push
├── e2e/                        # Testes E2E (Playwright)
│   ├── admin.spec.ts           # Testes do admin (login, navegacao, rate limiting)
│   ├── booking.spec.ts         # Testes do agendamento
│   └── booking-errors.spec.ts  # Testes de erros, concorrencia, limites
├── instalar-cliente.mjs       # Script automatico de instalacao para novos clientes
├── supabase-helper.mjs         # Helper para debug do Supabase
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
vi.mock('react-router-dom', () => ({
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

- 40+ arquivos de teste
- 335+ testes (unit + E2E)
- Hooks, Utils, API, Componentes e Paginas cobertos
- CI/CD com GitHub Actions: lint → test:coverage → typecheck → build
- **Coverage minimo:** 70% (statements, branches, functions, lines)

---

## 15. Troubleshooting

### "Nenhum agendamento aparece no admin"
- Verifique se o usuario esta na tabela `admin_users` (SELECT * FROM admin_users)
- Verifique se o RLS esta ativo no Supabase

### "Servico nao carrega"
- Verifique as variaveis de ambiente no `.env`
- Verifique se o Supabase esta acessivel

### "PWA nao instala"
- Só funciona em HTTPS (produção) ou localhost (desenvolvimento).
- **iOS (iPhone):** O Safari não suporta instalação programática. O usuário deve clicar em **Compartilhar (quadrado com seta para cima) > Adicionar à Tela de Início**. O app exibe um guia visual passo a passo automaticamente.
- **Android/Chrome (Instalação Inteligente):**
  - Se o navegador permitir a instalação automática, o app acionará diretamente a janela nativa do Chrome ao clicar em "Aplicativo".
  - Se o Chrome bloquear o prompt automático (o que ocorre temporariamente após desinstalações recentes ou cache), o aplicativo exibirá automaticamente um guia passo a passo ensinando a instalar manualmente através do menu do Chrome (três pontinhos > Instalar aplicativo).

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

## 16. Notas de Negocio

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
- [x] Notificacoes push via navegador
- [x] Lembrete no Google Calendar para o cliente (link na confirmacao)
- [x] Sistema de avaliacoes
- [x] PWA instalavel com guia de instalacao iOS
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
- [x] Script de instalação automática (instalar-cliente.mjs)
- [x] Schema universal do banco (universal.sql)
- [x] Clipping mask na foto de perfil (drag + zoom estilo Instagram)
- [x] Anti-burro: validacao de horarios, preco minimo, DDD
- [x] UX da galeria estilo Google Fotos (header compacto, selecao integrada)
- [x] Scrollbar dourada so no desktop (mobile limpo)
- [x] Error reporting com Sentry (captura automatica de erros em producao)
- [x] Coverage minimo no CI (70% — bloqueia merge abaixo do threshold)
- [x] Testes E2E robustos (erro de rede, concorrencia, limites, acessibilidade, performance)
- [x] AdminLogin splitado em 5 componentes (melhor manutenibilidade)
- [x] Horarios do Footer e Location dinamicos (refletem configuracoes do admin)
- [x] Admin booking filtra dias desativados (working_days) igual o cliente
- [x] Login com inputs transparentes, borda dourada no focus e altura maior no desktop

### Possiveis melhorias futuras
- [ ] Multi-tenancy (varias barbearias no mesmo sistema)
- [ ] Pagamento online (Stripe/Mercado Pago)
- [ ] API de WhatsApp (Evolution API) para lembretes automaticos
- [ ] Grafico de faturamento mensal no dashboard
- [ ] App nativo Android (APK) via Capacitor
- [ ] Drag and drop para reordenar fotos na galeria
- [ ] Filtros e edicao de imagens no admin
- [ ] Tema claro/escuro alternavel pelo admin
- [ ] Adicionar mais testes E2E para fluxos complexos
- [ ] Integrar Sentry com GitHub para vincular erros a commits
- [ ] Refatorar getNextDays() para buscar working_days do Supabase em vez de localStorage
- [ ] Adicionar observer de `barber-settings-changed` no admin booking para atualizar dias em tempo real

---

## 17. Notificacoes Push (Web Push)

### Visao Geral
O sistema envia notificacoes push automaticamente ao criar um novo agendamento. O admin recebe a notificacao no celular/desktop mesmo com o app fechado.

### Como funciona
1. Admin ativa notificacoes em **Perfil > Notificar**
2. O browser pede permissao e salva a subscription no Supabase
3. Quando alguem agenda, o trigger `notificar_push_agendamento` dispara
4. A edge function `send-push` envia a notificacao criptografada (VAPID) para todos os devices inscritos
5. O service worker recebe o push e mostra a notificacao

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

#### 4. Rodar SQL no Supabase Execute as secoes de push do `estrutura_barbearia.sql`

#### 5. Deploy da edge function
```bash
supabase functions deploy send-push
```

### Arquivos envolvidos
- `supabase/functions/send-push/index.ts` — Edge function que envia o push
- `src/hooks/usePushNotifications.ts` — Hook React para subscribe/unsubscribe
- `public/sw.js` — Service Worker que recebe e mostra a notificacao
- `supabase/universal.sql` — Trigger, RPCs e cron jobs

---

## 18. Sistema de Avaliacao

### Visao Geral
Apos cada atendimento, o cliente recebe um email com link pra avaliar de 1 a 5 estrelas. Avaliacoes 4-5 redirecionam pro Google Maps.

### Como funciona
1. Admin clica "Concluir Atendimento"
2. Trigger `enviar_email_avaliacao` envia email automaticamente
3. Cliente abre `/avaliar/:bookingId` e avalia
4. Avaliacoes ficam salvas na tabela `reviews`
5. Dashboard mostra media de avaliacao
6. TestimonialsSlider usa avaliacoes reais

### Configuracao
O schema completo com reviews está em `supabase/universal.sql`.

### URL do link de avaliacao
Configure no Supabase:
- Authentication > URL Configuration > Redirect URLs: adicione `https://seu-supabase-id.supabase.co/**`

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

*Documento atualizado em Julho 2026. Versao do sistema: 3.7.0*
