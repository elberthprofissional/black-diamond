<br/>

<div align="center">
  <img src="https://black-diamond-wheat.vercel.app/assets/logo.webp" alt="Black Diamond" width="140"/>

  # 💈 BLACK DIAMOND

  ### **Sistema Premium de Agendamento para Barbearias**

  <p align="center">
    <a href="#-visão-geral">Visão Geral</a> •
    <a href="#-stack">Stack</a> •
    <a href="#-funcionalidades">Funcionalidades</a> •
    <a href="#-instalação">Instalação</a> •
    <a href="#-deploy">Deploy</a> •
    <a href="#-arquitetura">Arquitetura</a> •
    <a href="#-testes">Testes</a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/version-3.36.0-blue?style=flat-square" alt="Version"/>
    <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License"/>
    <img src="https://img.shields.io/badge/build-passing-brightgreen?style=flat-square" alt="Build"/>
    <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react" alt="React"/>
    <img src="https://img.shields.io/badge/TypeScript-6-3178C6?style=flat-square&logo=typescript" alt="TypeScript"/>
    <img src="https://img.shields.io/badge/Supabase-3FCF8E?style=flat-square&logo=supabase" alt="Supabase"/>
    <img src="https://img.shields.io/badge/Tailwind-4-06B6D4?style=flat-square&logo=tailwindcss" alt="Tailwind"/>
    <img src="https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite" alt="Vite"/>
    <img src="https://img.shields.io/badge/PWA-ready-5A0FC8?style=flat-square&logo=pwa" alt="PWA"/>
  </p>

  <p>
    <b>🌐 <a href="https://black-diamond-wheat.vercel.app/">black-diamond-wheat.vercel.app</a></b>
  </p>

  <br/>
</div>

---

## 📋 Visão Geral

**Black Diamond** é um sistema de agendamento online premium para barbearias, construído com React 19 + TypeScript 6 + Supabase. Oferece uma experiência completa desde o agendamento online pelo cliente até o gerenciamento administrativo com dashboard, relatórios e notificações.

### Público-alvo

- **Clientes**: Agendam serviços online 24/7 pelo celular ou desktop
- **Barbeiro/Admin**: Gerencia agenda, clientes, serviços e financeiro

> 💈 **Barbeiro único por padrão** — O agendamento público esconde a etapa de escolha de barbeiro quando há apenas 1 barbeiro cadastrado (fluxo de 4 etapas: Dados → Serviços → Data/Hora → Revisão). O multi-barbeiro continua suportado: com mais de um barbeiro ativo a seleção aparece, e o escopo RLS por barbeiro (migration `007`) passa a valer no banco (dono vê tudo; barbeiro comum vê só os próprios agendamentos).

---

## 🚀 Stack Tecnológica

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| **Frontend** | React | 19.x |
| **Linguagem** | TypeScript | 6.x |
| **Build** | Vite | 8.x |
| **Estilização** | Tailwind CSS | 4.x |
| **Animações** | Framer Motion | 12.x |
| **Roteamento** | React Router | 8.x |
| **Ícones** | Lucide React | 1.x |
| **Backend/Database** | Supabase (PostgreSQL) | — |
| **Auth** | Supabase Auth | — |
| **Storage** | Supabase Storage (imagens) | — |
| **Testes** | Vitest + Playwright + TestSprite | — |
| **Monitoramento** | Sentry | — |
| **Deploy** | Vercel | — |
| **PWA** | Service Worker + Manifest | — |

---

## ✨ Funcionalidades

### 👤 Área Pública

| Funcionalidade | Descrição |
|----------------|-----------|
| **📅 Agendamento Online** | Fluxo em 4 etapas (Dados → Serviços → Data/Hora → Revisão) |
| **🕐 Horários em Tempo Real** | Slots disponíveis calculados automaticamente com base nos horários configurados |
| **📱 PWA Instalável** | App "Black Diamond" instalável no celular (cliente e barbeiro) |
| **✂️ Galeria de Fotos** | Carrossel com filtro por barbeiro e preview em tela cheia |
| **📍 Localização** | Mapa integrado com Google Maps |
| **💬 WhatsApp** | Contato direto via botão flutuante |
| **📋 Gerenciar Agendamento** | Cancelar/reagendar via token ou telefone (rota unificada `/cancelar`) |
| **🔗 Compartilhar** | Botao no Hero que copia o link da barbearia |
| **🚪 Porta Única de Acesso** | Uma tela só (`/entrar`): celular entra como cliente, e-mail abre o painel admin |
| **🏆 Programa de Fidelidade** | Cliente acumula visitas e ganha servicos gratuitos |

### 🔐 Área Administrativa

| Funcionalidade | Descrição |
|----------------|-----------|
| **📊 Dashboard** | Layout responsivo 1440px, metricas do dia, cards de proximo cliente e lucro, resumo de clientes/concluidos/cancelados/no-shows, **botão 'Tirar Folga'** pra bloquear/liberar dia inteiro, **auto-cancel silencioso** de bookings apos 2h (sem banner) |
| **📆 Agenda Semanal** | Visão completa da semana com horários ocupados/livres/bloqueados |
| **👥 Gestão de Clientes** | Cards simplificados com status visual (bolinha verde/amarela/vermelha), filtros de lembrete |
| **📋 Histórico do Cliente** | Lista completa de agendamentos com filtros, paginação e ocultar/restaurar |
| **⚡ Reagendar Rápido** | 1 toque pra reagendar com últimos dados do cliente |
| **✂️ Serviços** | Gerenciar preços, duração e descrição dos serviços |
| **🕐 Horários de Funcionamento** | Configurar dias abertos/fechados, horário de almoço |
| **📸 Galeria** | Upload de fotos com conversão WebP, reordenação, preview, filtro por barbeiro |
| **💎 Mensalista** | Planos de assinatura mensal com CRUD premium, badges de expiração (🟢/🟡/🔴), booking inteligente com detecção automática, filtros de clientes mensalistas |
| **🚫 Controle de Faltas** | Marcar no-show, notificação inteligente com WhatsApp DM ao invés de bloqueio automático |
| **🎁 Fidelidade** | Configurar visitas para prêmio, notificação automática |
| **🔔 Notificações Push** | Notificações in-app + push para novos agendamentos |
| **💬 Lembretes WhatsApp** | Envio de lembretes com templates personalizáveis |
| **📋 Audit Logs** | Registro de todas as ações administrativas |
| **👤 Login Opcional do Cliente** | Dashboard com sidebar, historico, stats, cancelamento e instalação PWA — telefone direto + link magico |
| **🔗 Compartilhar Link** | Botao no Hero que copia o link da barbearia para divulgar |

---

## ⚡ Instalação

### 🛠️ Instalação Manual

```bash
# 1. Clonar e instalar dependências
git clone <repo-url>
cd black-diamond
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Validate variables (optional)
# Install dotenv-cli globally if not present: npm install -g dotenv-cli
# Then run: npx dotenv -e .env -- npx dotenv-safe
# Edite .env com suas credenciais do Supabase

# 3. Rodar migrations do banco
# Abra o SQL Editor do Supabase e cole o conteudo de supabase/_RODAR_NO_SQL_EDITOR.sql
# (ou execute cada arquivo de supabase/migrations/ em ordem — veja supabase/migrations/README.md)

# 4. Iniciar em desenvolvimento
npm run dev
```

### Scripts Disponíveis

```bash
npm run dev            # Servidor de desenvolvimento
npm run build          # Build de produção
npm run preview        # Preview do build
npm run lint           # Verificar lint
npm run lint:fix       # Corrigir lint automaticamente
npm run format         # Formatar código com Prettier

# Testes
npm run test           # Testes unitários (watch)
npm run test:run       # Testes unitários (once)
npm run test:coverage  # Com cobertura
npm run test:e2e       # Testes E2E (Playwright)
```

---

## 🏗️ Arquitetura

```
src/
├── components/              # Componentes React
│   ├── Admin/               # Painel administrativo
│   │   ├── settings/        # Configurações (Conta, Galeria, Serviços, etc.)
│   │   ├── shared/          # Componentes compartilhados (Painéis, Modais)
│   │   └── booking/         # Agendamento manual pelo admin
│   ├── Booking/             # Fluxo de agendamento público (4 etapas)
│   ├── About.tsx            # Seção Sobre
│   ├── Gallery.tsx          # Galeria de fotos
│   ├── Hero.tsx             # Hero section
│   ├── Services.tsx         # Lista de serviços
│   ├── Location.tsx         # Mapa e endereço
│   └── ...
├── contexts/                # Contextos React (BarberSettings)
├── hooks/                   # Hooks customizados
│   ├── useBookings.ts       # Gestão de agendamentos
│   ├── useClients.ts        # Gestão de clientes
│   ├── useDashboardData.ts  # Dados do dashboard
│   ├── useGallery*.ts       # Galeria (upload, dados, seleção, preview)
│   ├── useBookingSlots.ts   # Cálculo de horários disponíveis
│   ├── useLoyalty*.ts       # Fidelidade
│   └── ...
├── lib/                     # Camada de dados
│   ├── api/                 # Funções de API (bookings, clients, services, etc.)
│   ├── supabase.ts          # Cliente Supabase
│   ├── utils.ts             # Utilitários
│   └── constants.ts         # Constantes
├── pages/                   # Páginas (rotas)
│   ├── Home.tsx             # Página inicial
│   ├── BookingPage.tsx      # Página de agendamento
│   ├── AdminDashboard.tsx   # Dashboard admin
│   ├── AdminClients.tsx     # Gestão de clientes
│   ├── AdminWeekly.tsx      # Agenda semanal
│   ├── AdminProfile.tsx     # Perfil + Configurações
│   └── ...
├── types/                   # Tipos TypeScript
└── test/                    # Setup de testes
```

### Fluxo de Agendamento

```
Cliente → Home → BookingPage → Dados → Serviços → Data/Hora → Revisão → Confirmado
                                    ↓                                       ↓
                              (nome+tel)                              (token único)
                                    ↓                                       ↓
                              Busca cliente                              Sucesso
                              existente ou cria novo                     (notificação push)
```

---

## 📋 Architecture Decision Records (ADRs)

Decisões de arquitetura documentadas em [`docs/adr/`](docs/adr/):

| ADR | Decisão | Status |
|-----|---------|--------|
| [ADR-001](docs/adr/001-supabase-as-backend.md) | Supabase como Backend-as-a-Service | Aceito |
| [ADR-002](docs/adr/002-server-side-pricing.md) | Preço calculado server-side via RPC | Aceito |
| [ADR-003](docs/adr/003-lazy-loading-with-preloading.md) | Lazy loading com route preloading | Aceito |
| [ADR-004](docs/adr/004-pwa-with-strategic-caching.md) | PWA com Service Worker e cache estratégico | Aceito |
| [ADR-005](docs/adr/005-testing-strategy.md) | Estratégia de testes em 4 camadas | Aceito |

---

## 🛡️ Segurança

| Mecanismo | Descrição |
|-----------|-----------|
| **Rate Limiting** | 3 agendamentos/min, 10 buscas/min, 5 consultas de telefone/min |
| **Row Level Security (RLS)** | Proteção em todas as 20 tabelas do banco |
| **Preço Server-Side** | Calculado na function SQL, impossível manipular pelo client |
| **Token Único** | Gerenciamento de agendamento via token de 30 dias |
| **Audit Logs** | Estrutura preservada mas escrita desativada (v3.31.0) — ações críticas continuam em tabelas dedicadas |
| **Cron Jobs** | Auto-complete de agendamentos, cleanup, relatório semanal |
| **Content Security Policy** | Headers restritivos no Vercel |
| **Auth Admin** | Login com email/senha via Supabase Auth; AuthGuard valida `is_admin` antes de liberar as telas |
| **Sem leitura pública de bookings** | A chave anon não lê a tabela `bookings` (migration `004_escopo_barbeiro_acesso.sql`); consultas públicas passam por RPCs `SECURITY DEFINER` com rate limit |

---

## 🧪 Testes

| Tipo | Framework | Status |
|------|-----------|--------|
| **Unitários** | Vitest | 1181 testes em 114 arquivos |
| **Integração** | Vitest + Supabase mock | APIs |
| **E2E** | Playwright | Fluxos críticos |
| **Visual** | Playwright | Screenshots responsivos |
| **Acessibilidade** | axe-core | Checklist |

**Qualidade de código:**
- ESLint: 0 erros, 0 warnings
- TypeScript: 0 erros (strict mode)
- Build: ~5.5s com chunks separados por vendor

```bash
# Rodar testes
npm run test:run           # Unitários
npm run test:coverage      # Com cobertura
npm run test:e2e           # E2E (Playwright)
npx playwright show-report # Relatório E2E
```

---

## 🚀 Deploy

O deploy é feito na **Vercel** com integração contínua via GitHub Actions.

1. Configure as variáveis de ambiente no Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_VAPID_PUBLIC_KEY` (para push notifications)
   - `SENTRY_DSN` (opcional)

2. Faça push para a branch `main` (o CI também cobre `master` e `develop`)

3. O deploy é automático via GitHub Actions + Vercel

---

## 🌐 Variáveis de Ambiente

### Obrigatórias

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `VITE_SUPABASE_URL` | URL do projeto Supabase | `https://xxxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Chave anônima do Supabase (pública) | `eyJxxx...` |
| `VITE_BARBER_WHATSAPP` | Número de WhatsApp do barbeiro (com DDI) | `5531999999999` |

### Opcionais

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `VITE_SITE_URL` | URL pública do site (para links de gerenciamento) | `https://black-diamond.vercel.app` |
| `VITE_VAPID_PUBLIC_KEY` | Chave pública VAPID para notificações push | `BLxxx...` |
| `VITE_GA_ID` | Google Analytics ID | `G-XXXXXXXXXX` |
| `VITE_SENTRY_DSN` | DSN do Sentry para monitoramento de erros | `https://xxx@xxx.ingest.sentry.io/xxx` |
| `SUPABASE_PUBLISHABLE_KEY` | Chave publishable do Supabase (usada apenas por scripts de auditoria em `scripts/`) | `sb_publishable_...` |

### Supabase Edge Functions (secrets)

| Variável | Descrição |
|----------|-----------|
| `VAPID_PRIVATE_KEY` | Chave privada VAPID para push notifications |
| `VAPID_PUBLIC_KEY` | Chave pública VAPID (mesma do VITE) |
| `VAPID_SUBJECT` | Email de contato para VAPID |

### Arquivo .env.example

```env
# Obrigatórias
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...
VITE_BARBER_WHATSAPP=5531999999999

# Opcionais
VITE_SITE_URL=https://black-diamond.vercel.app
VITE_VAPID_PUBLIC_KEY=BLxxx...
VITE_GA_ID=G-XXXXXXXXXX
VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

---

## 📄 Licença

Distribuído sob licença MIT. Veja [`LICENSE`](LICENSE) para mais informações.

---

## 📞 Suporte

**Desenvolvedor:** Elberth Mayan — (31) 98015-9559

---

<div align="center">
  <sub>Built with ❤️ using React + TypeScript + Supabase</sub>
  <br/>
  <sub>© 2026 Black Diamond — Todos os direitos reservados</sub>
</div>
