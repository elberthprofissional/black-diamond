# DOCUMENTACAO — BLACK DIAMOND

Sistema completo de agendamento online para barbearias, com painel administrativo, PWA e integração WhatsApp.

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
9. [Integracao com Email (Resend)](#9-integracao-com-email-resend)
10. [Recuperacao de Senha](#10-recuperacao-de-senha)
11. [Variaveis de Ambiente](#11-variaveis-de-ambiente)
12. [Estrutura de Pastas](#12-estrutura-de-pastas)
13. [Troubleshooting](#13-troubleshooting)
14. [Notas de Negocio](#14-notas-de-negocio)

---

## 1. Visao Geral

**Black Diamond** e um sistema de agendamento premium para barbearias, construido com o conceito de **Quiet Luxury** (luxo silencioso). O cliente agenda pelo site, e o barbeiro gerencia tudo por um painel administrativo completo — sem custo de infraestrutura.

### Publico-alvo
- Barbearias e estetos que querem presença digital profissional
- Barbeiros que precisam organizar agenda, clientes e faturamento

### Principais diferencias
- Agendamento online em 4 etapas com confirmacao via WhatsApp
- Painel admin com agenda do dia, semana, clientes e relatorios
- PWA instalavel na tela inicial do celular
- Custo operacional zero (Vercel + Supabase Free Tier)

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
| Hospedagem | Vercel | Gratis |

---

## 3. Arquitetura do Projeto

### Fluxo de dados
```
Cliente (Browser)
  ↓ HTTP/HTTPS
Vercel (SPA estatica)
  ↓ API REST (PostgREST)
Supabase (PostgreSQL + RLS + Auth)
```

### Como funciona o agendamento
1. O cliente seleciona servicos, data e horario no site
2. O frontend chama a RPC `criar_agendamento` no Supabase
3. A RPC verifica conflitos, cria o client (se novo) e insere o booking
4. O frontend redireciona pro WhatsApp com a mensagem formatada
5. O barbeiro ve o agendamento no painel admin em tempo real

### Bloqueio de horarios
- O sistema usa a coluna `is_blocked` na tabela `bookings`
- Horarios bloqueados aparecem na aba "Bloqueados" do dashboard
- RPCs `toggle_slot_block` e `unblock_day` gerenciam o bloqueio

### Componentes compartilhados
- `RescheduleWizard` — Wizard de 3 steps para reagendamento
- `BookingDetailPanel` — Painel de detalhe do agendamento
- `FilterTabs` — Abas de filtro (ocupados/livres/bloqueados)
- `ToastNotification` — Sistema de notificacoes

---

## 4. Funcionalidades

### Area do Cliente (`/agendar`)
- Selecao de multiplos servicos com precos
- Calendario semanal com slots disponiveis em tempo real
- Formulario de dados com validacao de WhatsApp
- Revisao antes de confirmar
- Redirecionamento pro WhatsApp com mensagem formatada
- Tela de sucesso com resumo do agendamento

### Area do Admin (`/admin`)

| Rota | Descricao |
|------|-----------|
| `/admin` | Dashboard do dia — agenda, lucro, proximo cliente |
| `/admin/weekly` | Agenda da semana com navegacao por dia |
| `/admin/agendar` | Agendamento manual com busca de cliente |
| `/admin/clients` | Gestao de clientes com lembretes WhatsApp |
| `/admin/available` | Visualizacao de horarios disponiveis |
| `/admin/profile` | Relatorios, faturamento, instalacao PWA, logout |
| `/admin/login` | Login do administrador |
| `/admin/reset-password` | Redefinicao de senha |

### Funcionalidades do Admin
- **Dashboard do dia:** Proximo cliente, lucro do dia, filtros por ocupados/livres/bloqueados
- **Agenda semanal:** Navegacao por 6 dias, bloqueio/desbloqueio de dia inteiro
- **Agendamento manual:** Busca por WhatsApp/nome, selecao de servicos, data/hora
- **Gestao de clientes:** CRUD, notas, historico, lembretes via WhatsApp
- **Reagendamento:** Wizard de 3 steps (servicos, data/hora, revisao)
- **Relatorios:** Faturamento semanal/mensal, servicos mais vendidos, novos clientes
- **PWA:** Instalacao na tela inicial com guia visual

---

## 5. Schema do Banco de Dados

### Tabelas

**services** — Servicos oferecidos
```sql
id UUID PK, name TEXT, description TEXT, price DECIMAL, duration INTEGER, created_at TIMESTAMPTZ
```

**clients** — Cadastro de clientes
```sql
id UUID PK, name TEXT, phone TEXT UNIQUE, email TEXT, notes TEXT, created_at TIMESTAMPTZ
```

**bookings** — Agendamentos
```sql
id UUID PK, client_id UUID FK, service_ids UUID[], booking_date DATE,
booking_time TIME, total_price DECIMAL, total_duration INTEGER,
status TEXT (pending/confirmed/cancelled/completed), is_blocked BOOLEAN,
notes TEXT, created_at TIMESTAMPTZ
```

**settings** — Configuracoes (horarios de funcionamento)
```sql
key TEXT PK, value TEXT, updated_at TIMESTAMPTZ
```

### Indexes
- `idx_no_double_booking` — Unique em (booking_date, booking_time) WHERE status != 'cancelled'

### RPCs (Funcoes Seguras)

| Funcao | Descricao |
|--------|-----------|
| `criar_agendamento` | Cria booking de forma transacional com rate limit (max 3/dia por telefone) |
| `get_occupied_slots` | Retorna horarios ocupados de uma data |
| `get_available_slots` | Retorna slots livres (respeitando horarios de funcionamento e almoco) |
| `get_business_hours` | Retorna configuracoes de horario como JSON |
| `toggle_slot_block` | Alterna bloqueio de um horario (usa is_blocked) |
| `unblock_day` | Desbloqueia todos os horarios de um dia |

### View
- `faturamento_diario` — Calcula faturamento por data (security_invoker)

---

## 6. Seguranca

### RLS (Row Level Security)
- **services/settings:** Leitura publica, escrita apenas admin autenticado
- **clients/bookings:** Leitura e escrita apenas admin com email `tato@gmail.com`

> **IMPORTANTE:** O email do admin esta hardcoded nas policies do SQL. Se o barbeiro tiver outro email, altere no `supabase_schema.sql` antes de rodar.

### Protecoes implementadas
- **Rate limit:** Max 3 agendamentos por telefone por dia
- **Double-booking:** Index unique impede dois agendamentos no mesmo horario
- **SQL injection:** Todas as consultas usam PostgREST parametrizado
- **XSS:** React escapa inputs automaticamente
- **CSP:** Headers de Content-Security-Policy configurados no vercel.json
- **X-Frame-Options:** DENY (impede iframe)
- **X-Content-Type-Options:** nosniff

### Headers de seguranca (vercel.json)
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' ...
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

---

## 7. Setup e Desenvolvimento

### Pre-requisitos
- Node.js 18+
- npm ou yarn
- Conta no Supabase (gratis)
- Conta no Vercel (gratis, para deploy)

### Passo 1: Clonar e instalar
```bash
git clone <url-do-repositorio>
cd "Black Diamond"
npm install
```

### Passo 2: Configurar Supabase
1. Crie um projeto no [supabase.com](https://supabase.com)
2. Acesse o SQL Editor
3. Cole e execute o conteudo de `supabase_schema.sql`
4. Acesse Authentication > Users e crie o usuario admin

### Passo 3: Configurar variaveis de ambiente
Copie `.env.example` para `.env` e preencha:
```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anon
VITE_BARBER_WHATSAPP=5531999999999
VITE_SUPPORT_WHATSAPP=5531980159559
```

### Passo 4: Rodar
```bash
npm run dev
```

### Comandos uteis
```bash
npm run dev      # Desenvolvimento
npm run build    # Build de producao
npm run lint     # Verificar erros de codigo
npm run preview  # Preview do build
```

---

## 8. Deploy na Vercel

1. Crie conta na [Vercel](https://vercel.com) com GitHub
2. Importe o repositorio
3. Configure as Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_BARBER_WHATSAPP`
   - `VITE_SUPPORT_WHATSAPP`
4. Clique em Deploy
5. A Vercel gera um link HTTPS automatico

### Configuracao do Supabase para producao
- Adicione o dominio da Vercel nos **Redirect URLs** do Supabase (Authentication > URL Configuration)
- Ex: `https://seu-app.vercel.app/**`

### Script SQL para rodar apos o primeiro deploy
```sql
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;
```

---

## 9. Integracao com Email (Resend)

Para enviar emails de confirmacao e lembretes automaticamente.

### Passo 1: Criar conta no Resend
1. Acesse [resend.com](https://resend.com) e crie conta gratuita
2. Crie uma API Key com permissao Full Access
3. Copie a chave (comeca com `re_...`)

### Passo 2: Criar Edge Function no Supabase
Crie o arquivo `supabase/functions/send-email/index.ts` com a funcao que:
1. Recebe o payload do webhook (booking criado)
2. Busca o email do cliente no banco
3. Monta o corpo do email em HTML com identidade visual Black Diamond
4. Envia via API do Resend

### Passo 3: Configurar variavel de ambiente
No Supabase (Project Settings > Edge Functions), adicione:
- Nome: `RESEND_API_KEY`
- Valor: sua chave do Resend

### Passo 4: Criar Webhook
No Supabase (Database > Webhooks):
- Name: `send_booking_email_trigger`
- Table: `bookings`
- Events: Insert
- Type: Supabase Edge Function
- Function: `send-email`

### Limites do plano gratuito
- 3.000 emails/mes
- Remetente: `onboarding@resend.dev` (pode ir pra spam no primeiro envio)
- Para envio profissional, compre um dominio e configure no Resend

---

## 10. Recuperacao de Senha

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

### Template HTML do email
O template usa a identidade visual do Black Diamond (fundo #0A0A0A, dourado #C5A059). Verifique o template completo no painel do Supabase apos configurar.

---

## 11. Variaveis de Ambiente

| Variavel | Descricao | Obrigatorio |
|----------|-----------|-------------|
| `VITE_SUPABASE_URL` | URL do projeto Supabase | Sim |
| `VITE_SUPABASE_ANON_KEY` | Chave anon/public do Supabase | Sim |
| `VITE_BARBER_WHATSAPP` | Numero WhatsApp do barbeiro (formato: 5531999999999) | Sim |
| `VITE_SUPPORT_WHATSAPP` | Numero WhatsApp de suporte tecnico | Nao |

---

## 12. Estrutura de Pastas

```
Black Diamond/
├── public/
│   ├── assets/          # Imagens (logo, galeria, fundos)
│   ├── manifest.json    # Configuracao PWA
│   └── sw.js            # Service Worker (cache offline)
├── src/
│   ├── components/
│   │   ├── Admin/       # Componentes do painel admin
│   │   │   ├── AdminLayout.tsx
│   │   │   ├── AdminSidebar.tsx
│   │   │   ├── AuthGuard.tsx
│   │   │   ├── BottomTabs.tsx
│   │   │   ├── Navbar.tsx
│   │   │   └── shared/  # Componentes compartilhados
│   │   │       ├── BookingDetailPanel.tsx
│   │   │       ├── RescheduleWizard.tsx
│   │   │       ├── FilterTabs.tsx
│   │   │       ├── ToastNotification.tsx
│   │   │       ├── WhatsAppReminderButton.tsx
│   │   │       ├── CompleteModal.tsx
│   │   │       ├── DeleteModal.tsx
│   │   │       └── UnblockModal.tsx
│   │   ├── Hero.tsx
│   │   ├── About.tsx
│   │   ├── Services.tsx
│   │   ├── Gallery.tsx
│   │   ├── Location.tsx
│   │   ├── Footer.tsx
│   │   ├── Navbar.tsx
│   │   ├── TestimonialsSlider.tsx
│   │   └── ConnectionBanner.tsx
│   ├── hooks/
│   │   ├── useAdminLogout.ts
│   │   ├── useBookings.ts
│   │   ├── useConnectionStatus.ts
│   │   ├── useServices.ts
│   │   ├── useSlotBlocking.ts
│   │   └── useToast.ts
│   ├── lib/
│   │   ├── api.ts       # Funcoes de API (CRUD)
│   │   ├── supabase.ts  # Cliente Supabase
│   │   └── utils.ts     # Utilitarios (formatPhone, dates, slots)
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── BookingPage.tsx
│   │   ├── AdminLogin.tsx
│   │   ├── AdminResetPassword.tsx
│   │   ├── AdminDashboard.tsx
│   │   ├── AdminWeekly.tsx
│   │   ├── AdminBooking.tsx
│   │   ├── AdminClients.tsx
│   │   ├── AdminAvailableSlots.tsx
│   │   ├── AdminProfile.tsx
│   │   └── NotFound.tsx
│   ├── types/
│   │   └── index.ts     # Definicao de tipos TypeScript
│   ├── App.tsx           # Roteamento principal
│   ├── main.tsx          # Entry point + Service Worker
│   ├── index.css         # Estilos globais + Tailwind
│   └── vite-env.d.ts     # Tipos globais (Window, Navigator)
├── supabase_schema.sql   # Schema completo do banco
├── vercel.json           # Configuracao de deploy + headers
├── package.json
├── vite.config.ts
├── tsconfig.json
└── eslint.config.js
```

---

## 13. Troubleshooting

### "Nenhum agendamento aparece no admin"
- Verifique se o email do usuario logado e igual ao configurado nas RLS policies (`tato@gmail.com`)
- Verifique se o RLS esta ativo no Supabase

### "Horarios aparecem com segundos (08:00:00)"
- Ja corrigido no codigo. Se persistir, limpe o cache do navegador

### "Servico nao carrega"
- Verifique as variaveis de ambiente no `.env`
- Verifique se o Supabase esta acessivel

### "PWA nao instala"
- So funciona em HTTPS (producao)
- No iOS, use Safari > Compartilhar > Adicionar a Tela de Inicio

### "Build falha"
- Rode `npm run lint` para ver erros
- Verifique se todas as dependencias estao instaladas (`npm install`)

### "Reset de senha nao envia email"
- Configure o SMTP no Supabase (Authentication > Email Templates)
- Verifique o Redirect URL em Authentication > URL Configuration
- O template de email precisa do link `{{ .ConfirmationURL }}`

---

## 14. Notas de Negocio

### Custo de operacao
- Hospedagem (Vercel): R$ 0,00
- Banco de dados (Supabase Free): R$ 0,00
- Email (Resend Free): R$ 0,00 (ate 3.000/mes)
- Dominio: ~R$ 40,00/ano (opcional)

### O que cobrar do cliente
- Valor do desenvolvimento
- Compra do dominio anual (se aplicavel)
- Manutencao mensal (opcional)

### Proximos passos sugeridos
- [x] Notificacoes push via navegador
- [ ] API de WhatsApp (Evolution API) para lembretes automaticos
- [ ] Grafico de faturamento mensal no dashboard
- [ ] Integracao com Google Calendar

---

## 15. Notificacoes Push (Web Push)

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
VAPID_SUBJECT=mailto:elberthmayan2007@gmail.com
SUPABASE_SERVICE_ROLE_KEY=<sua_service_role_key>
```

#### 4. Rodar SQL no Supabase Editor
Execute as secoes 15, 16 e 17 do `estrutura_black_diamond.sql` para criar:
- Funcao `delete_push_subscription`
- Trigger `notificar_push_agendamento` (AFTER INSERT ON bookings)
- Funcao `limpar_subscriptions_antigas` + cron diario
- Secret `supabase_url` na tabela `secrets`

#### 5. Deploy da edge function
```bash
supabase functions deploy send-push
```

### Arquivos envolvidos
- `supabase/functions/send-push/index.ts` — Edge function que envia o push
- `src/hooks/usePushNotifications.ts` — Hook React para subscribe/unsubscribe
- `public/sw.js` — Service Worker que recebe e mostra a notificacao
- `estrutura_black_diamond.sql` — Trigger, RPCs e cron jobs

---

## 16. Sistema de Avaliação

### Visao Geral
Após cada atendimento, o cliente recebe um email com link pra avaliar de 1 a 5 estrelas. Avaliações 4-5 redirecionam pro Google Maps.

### Como funciona
1. Admin clica "Concluir Atendimento"
2. Trigger `enviar_email_avaliacao` envia email automaticamente
3. Cliente abre `/avaliar/:bookingId` e avalia
4. Avaliações ficam salvas na tabela `reviews`
5. Dashboard mostra média de avaliação
6. TestimonialsSlider usa avaliações reais

### Configuracao
Execute as secoes 19 e 20 do `estrutura_black_diamond.sql` para criar:
- Tabela `reviews`
- Funcoes `get_average_rating()` e `get_top_reviews()`
- Trigger `enviar_email_avaliacao` (AFTER UPDATE ON bookings)

### Importante: URL do link de avaliação
O email usa `https://dbukdhycfaibdshxnatt.supabase.co/avaliar/:bookingId`. Para que funcione, configure no Supabase:
- Authentication → URL Configuration → Redirect URLs: adicione `https://dbukdhycfaibdshxnatt.supabase.co/**`

---

## 17. Google Calendar Auto-Sync

### Visao Geral
Agendamentos são sincronizados automaticamente com o Google Calendar do barbeiro.

### Como funciona
1. Booking criado → cria evento no Google Calendar
2. Booking cancelado → remove evento
3. Booking reagendado → atualiza evento
4. ID do evento salvo na coluna `google_event_id` da tabela bookings

### Configuracao

#### 1. Criar projeto no Google Cloud Console
1. Acesse https://console.cloud.google.com
2. Crie um novo projeto (ex: "Black Diamond Calendar")
3. Ative a Google Calendar API

#### 2. Criar OAuth 2.0 Credentials
1. APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
2. Application type: Web application
3. Authorized redirect URIs: adicione `https://dbukdhycfaibdshxnatt.supabase.co/functions/v1/sync-google-calendar`
4. Copie o Client ID e Client Secret

#### 3. Obter Refresh Token
1. Gere uma URL de autorização com seu Client ID
2. Autorize uma vez (barbeiro clica no link)
3. Copie o código de autorização
4. Troque o código por refresh token usando a API OAuth
5. Salve o refresh token

#### 4. Configurar secrets no Supabase
```bash
supabase secrets set GOOGLE_CLIENT_ID=<seu_client_id>
supabase secrets set GOOGLE_CLIENT_SECRET=<seu_client_secret>
supabase secrets set GOOGLE_REFRESH_TOKEN=<seu_refresh_token>
```

#### 5. Rodar SQL
Execute a secao 21 do `estrutura_black_diamond.sql` para adicionar a coluna `google_event_id` na tabela bookings.

#### 6. Deploy da edge function
```bash
supabase functions deploy sync-google-calendar
```

### Arquivos envolvidos
- `supabase/functions/sync-google-calendar/index.ts` — Edge function CRUD no Google Calendar
- `estrutura_black_diamond.sql` — Coluna `google_event_id`

---

*Documento gerado em Junho 2026. Versao do sistema: 2.1.0*
