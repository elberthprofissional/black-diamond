# BLACK DIAMOND 💈

Sistema de agendamento premium para barbearias.

[![Version](https://img.shields.io/badge/version-3.19.0-blue)]()
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Build](https://img.shields.io/badge/build-passing-brightgreen)]()
[![Coverage](https://img.shields.io/badge/coverage-80%25-yellow)]()

## Instalacao para Novo Cliente (Recomendado)

O instalador automatizado faz tudo sozinho em ~5 minutos:

```bash
node instalar-cliente.mjs
```

**O que o script faz:**
1. Pergunta o nome, email, senha e WhatsApp da barbearia
2. Cria o projeto no Supabase automaticamente
3. Roda o schema do banco de dados
4. Cria o usuario admin
5. Gera o arquivo `.env`
6. Faz deploy na Vercel

**Pre-requisitos (tudo gratuito):**
- Node.js 18+ — https://nodejs.org
- Conta no Supabase (plano free) — https://supabase.com
- Conta na Vercel (plano free) — https://vercel.com
- Supabase Access Token — https://supabase.com/dashboard/account/tokens

## Instalacao Manual

Se preferir configurar passo a passo:

```bash
# 1. Instalar dependencias
npm install

# 2. Copiar variaveis de ambiente
cp .env.example .env

# 3. Editar .env com suas credenciais do Supabase

# 4. Rodar em desenvolvimento
npm run dev
```

## Stack Tecnologica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 19 + TypeScript 6.x |
| Build | Vite 8.x |
| Estilo | Tailwind CSS 4.x |
| Fontes | Plus Jakarta Sans, Bebas Neue |
| Animacoes | Framer Motion 12.x |
| Roteamento | React Router DOM 7.x |
| Backend | Supabase (PostgreSQL + RLS + Auth) |
| Error Reporting | Sentry |
| Testes | Vitest 4.x + Playwright |
| Deploy | Vercel |

## Scripts Disponiveis

```bash
npm run dev          # Servidor de desenvolvimento
npm run build        # Build de producao
npm run preview      # Preview do build
npm run lint         # Verificar erros
npm run lint:fix     # Corrigir erros
npm run format       # Formatar codigo

# Testes
npm run test         # Watch mode
npm run test:run     # Run once
npm run test:coverage # Com cobertura
npm run test:e2e     # Testes E2E (Playwright)
```

## Arquitetura

```
src/
├── components/          # Componentes React
│   ├── Admin/           # Painel admin
│   │   ├── settings/    # Configuracoes
│   │   ├── shared/      # Componentes compartilhados
│   │   └── booking/     # Agendamento manual
│   ├── Booking/         # Agendamento publico (4 steps)
│   └── ...              # Navbar, Footer, Hero, Gallery, etc.
├── contexts/            # Contextos React
├── hooks/               # Hooks customizados
├── lib/                 # API, Supabase client, utils
│   └── api/             # Camada de dados
├── pages/               # Paginas (rotas)
├── types/               # Tipos TypeScript
└── test/                # Setup de testes
```

## Funcionalidades

### Publico
- Booking online em 4 steps (Dados → Serviços → Agenda → Revisar)
- Sistema de mensalista com planos personalizados
- Gerenciamento de agendamento via token (cancelar/reagendar)
- PWA (instalavel no celular)

### Admin
- Dashboard com agenda do dia e proximo cliente
- Agenda semanal com visao por dia
- Gerenciamento de clientes (CRUD, notas, mensalista)
- Notificacoes push + in-app (tempo real)
- Sistema de lembretes via WhatsApp
- Configuracoes (conta, galeria, horarios, servicos, mensalista)
- Audit logs para todas as acoes

## Seguranca

- **Rate Limiting**: Protecao server-side (3/min booking, 10/min lookup, 5/min phone)
- **RLS**: Row Level Security em todas as tabelas
- **Audit Logs**: Registro de acoes administrativas
- **Token-based booking**: Gerenciamento via token unico (30 dias)
- **Preco server-side**: Calculado no banco, impossivel manipular pelo client
- **Cron jobs**: Auto-complete, cleanup, relatorio semanal

## Deploy

1. Configure as variaveis de ambiente no Vercel
2. Faca push para a branch `main`
3. O deploy sera automatico

## Suporte

WhatsApp do desenvolvedor: **(31) 98015-9559** — Elberth Mayan

## Documentacao

Consulte [CHANGELOG.md](./CHANGELOG.md) para historico de versoes.
