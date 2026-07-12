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
    <img src="https://img.shields.io/badge/version-3.20.0-blue?style=flat-square" alt="Version"/>
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
- **Barbeiros/Admin**: Gerenciam agenda, clientes, serviços e financeiro

---

## 🚀 Stack Tecnológica

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| **Frontend** | React | 19.x |
| **Linguagem** | TypeScript | 6.x |
| **Build** | Vite | 8.x |
| **Estilização** | Tailwind CSS | 4.x |
| **Animações** | Framer Motion | 12.x |
| **Roteamento** | React Router DOM | 7.x |
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
| **📱 PWA Instalável** | Funciona como app nativo no celular |
| **✂️ Galeria de Fotos** | Carrossel com preview em tela cheia |
| **📍 Localização** | Mapa integrado com Google Maps |
| **💬 WhatsApp** | Contato direto via botão flutuante |
| **📋 Gerenciar Agendamento** | Cancelar/reagendar via token enviado por email |
| **🏆 Programa de Fidelidade** | Cliente acumula visitas e ganha serviços gratuitos |

### 🔐 Área Administrativa

| Funcionalidade | Descrição |
|----------------|-----------|
| **📊 Dashboard** | Métricas do dia, faturamento, próximos clientes, taxa de ocupação |
| **📆 Agenda Semanal** | Visão completa da semana com horários ocupados/livres |
| **👥 Gestão de Clientes** | CRUD completo, busca, filtros, anotações, status de lembrete |
| **✂️ Serviços** | Gerenciar preços, duração e descrição dos serviços |
| **🕐 Horários de Funcionamento** | Configurar dias abertos/fechados, horário de almoço |
| **📸 Galeria** | Upload de fotos com conversão WebP, reordenação, preview |
| **💎 Mensalista** | Planos de assinatura mensal com renovação |
| **🚫 Controle de Faltas** | Marcar no-show, bloquear cliente após N faltas |
| **🎁 Fidelidade** | Configurar visitas para prêmio, notificação automática |
| **🔔 Notificações Push** | Notificações in-app + push para novos agendamentos |
| **💬 Lembretes WhatsApp** | Envio de lembretes com templates personalizáveis |
| **📋 Audit Logs** | Registro de todas as ações administrativas |

---

## ⚡ Instalação

### 🤖 Instalação Automática (Recomendado)

O instalador configura tudo em ~5 minutos — Supabase, GitHub e Vercel:

```bash
node instalar-cliente.mjs
```

**Pré-requisitos gratuitos:**
- **Node.js 18+** — [nodejs.org](https://nodejs.org)
- **GitHub CLI** — `gh auth login` ([cli.github.com](https://cli.github.com))
- **Vercel CLI** — `npm i -g vercel && vercel login`
- **Supabase Access Token** — [Criar token](https://supabase.com/dashboard/account/tokens)

### 🛠️ Instalação Manual

```bash
# 1. Clonar e instalar dependências
git clone <repo-url>
cd black-diamond
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais do Supabase

# 3. Rodar migrations do banco
npx supabase db push

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

## 🛡️ Segurança

| Mecanismo | Descrição |
|-----------|-----------|
| **Rate Limiting** | 3 agendamentos/min, 10 buscas/min, 5 consultas de telefone/min |
| **Row Level Security (RLS)** | Proteção em todas as tabelas do banco |
| **Preço Server-Side** | Calculado na function SQL, impossível manipular pelo client |
| **Token Único** | Gerenciamento de agendamento via token de 30 dias |
| **Audit Logs** | Registro de todas as ações administrativas |
| **Cron Jobs** | Auto-complete de agendamentos, cleanup, relatório semanal |
| **Content Security Policy** | Headers restritivos no Vercel |
| **Auth Admin** | Login com email/senha via Supabase Auth |

---

## 🧪 Testes

| Tipo | Framework | Status |
|------|-----------|--------|
| **Unitários** | Vitest | 55+ testes |
| **Integração** | Vitest + Supabase mock | APIs |
| **E2E** | Playwright | Fluxos críticos |
| **Visual** | TestSprite | 14/16 passando |
| **Acessibilidade** | axe-core | Checklist |

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

2. Faça push para a branch `main`

3. O deploy é automático via GitHub Actions + Vercel

---

## 🌐 Variáveis de Ambiente

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...
VITE_VAPID_PUBLIC_KEY=BLxxx...
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
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
