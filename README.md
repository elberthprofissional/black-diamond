# BLACK DIAMOND 💈

Sistema de agendamento premium para barbearias.

[![Version](https://img.shields.io/badge/version-3.18.0-blue)]()
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Build](https://img.shields.io/badge/build-passing-brightgreen)]()
[![Coverage](https://img.shields.io/badge/coverage-80%25-yellow)]()

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 19 + TypeScript 6.x |
| Build | Vite 8.x |
| Estilo | Tailwind CSS 4.x |
| Fontes | Plus Jakarta Sans, Bebas Neue, Montserrat |
| Animacoes | Framer Motion 12.x |
| Roteamento | React Router DOM 7.x |
| Backend | Supabase (PostgreSQL + RLS + Auth) |
| Error Reporting | Sentry |
| Testes | Vitest 4.x + Playwright (unit + E2E + visual) |
| Deploy | Vercel |

## Quick Start

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variaveis de ambiente
cp .env.example .env
# Editar .env com suas credenciais

# 3. Rodar em desenvolvimento
npm run dev
```

## Instalacao para Novo Cliente (100% automatico)

```bash
node instalar-cliente.mjs
```

O script faz TUDO sozinho:
1. Coleta dados do cliente (nome, email, senha, WhatsApp)
2. Valida email, senha (2x), telefone
3. Cria o projeto Supabase via API
4. Roda o `universal.sql` automaticamente
5. Cria o usuario admin + cadastra na tabela admin_users
6. Gera o arquivo `.env`
7. Faz deploy na Vercel (com retry)

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
│   ├── useMensalistaFilter  # Hook compartilhado (publico + admin)
│   ├── useBookingWizard     # Booking publico
│   ├── useAdminClientSearch # Busca de clientes admin
│   └── ...
├── lib/                 # API, Supabase client, utils
│   └── api/             # Camada de dados (bookings, clients, services, mensalista, templates)
├── pages/               # Paginas (rotas)
├── types/               # Tipos TypeScript
└── test/                # Setup de testes
```

## Funcionalidades

### Publico
- Booking online em 4 steps (Dados -> Servicos -> Agenda -> Revisar)
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

## Hook Compartilhado

O `useMensalistaFilter` e compartilhado entre o booking publico e o admin:
- Filtra servicos inclusos no plano de mensalista
- Filtra dias permitidos (Seg-Qui para mensalista)
- Reseta servicos selecionados quando status muda

## Seguranca

- **Rate Limiting**: Protecao server-side (3/min booking, 10/min lookup, 5/min phone)
- **RLS**: Row Level Security em todas as tabelas
- **Audit Logs**: Registro de acoes administrativas
- **Token-based booking**: Gerenciamento via token unico (30 dias)
- **LGPD**: Nomes e telefones mascarados em funcoes publicas
- **Preco server-side**: Calculado no banco, impossivel manipular pelo client
- **Cron jobs**: Auto-complete de agendamentos, cleanup de tokens, relatorio semanal

## Deploy

1. Configure as variaveis de ambiente no Vercel
2. Faca push para a branch `main`
3. O deploy sera automatico

### PWA

O app e um PWA (Progressive Web App). Para instalar no celular, acesse o site e clique em "Instalar app".

## Documentacao

Consulte [CHANGELOG.md](./CHANGELOG.md) para historico de versoes.
