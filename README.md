# BLACK DIAMOND 💈

Sistema de agendamento premium para barbearias.

[![Version](https://img.shields.io/badge/version-3.10.0-blue)]()
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Build](https://img.shields.io/badge/build-passing-brightgreen)]()
[![Coverage](https://img.shields.io/badge/coverage-80%25-yellow)]()

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 19 + TypeScript 6.x |
| Build | Vite 8.x |
| Estilo | Tailwind CSS 4.x |
| Animacoes | Framer Motion 12.x |
| Roteamento | React Router DOM 7.x |
| Backend | Supabase (PostgreSQL + RLS + Auth) |
| Error Reporting | Sentry |
| Testes | Vitest 4.x + Playwright |
| Deploy | Vercel |

## Quick Start

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas credenciais

# 3. Rodar em desenvolvimento
npm run dev
```

## Instalação para Novo Cliente (100% automático)

```bash
node instalar-cliente.mjs
```

O script faz TUDO sozinho:
1. Pede dados do cliente (nome, email, senha, WhatsApp)
2. Cria o projeto Supabase via API
3. Roda o `universal.sql` automaticamente (schema do banco)
4. Cria o usuário admin
5. Adiciona o usuário na lista de administradores
6. Gera o arquivo `.env`
7. Faz deploy na Vercel (opcional)

## Scripts Disponíveis

```bash
npm run dev          # Servidor de desenvolvimento
npm run build        # Build de produção
npm run preview      # Preview do build
npm run lint         # Verificar erros
npm run lint:fix     # Corrigir erros
npm run format       # Formatar código

# Testes
npm run test         # Watch mode
npm run test:run     # Run once
npm run test:coverage # Com cobertura
npm run test:e2e     # Testes E2E (Playwright)

# Instalação para novo cliente
node instalar-cliente.mjs   # Modo preguiçoso 🛌
```

## Arquitetura

```
src/
├── components/          # Componentes React
│   ├── Admin/           # Painel admin (dashboard, clientes, horários, galeria)
│   ├── Admin/settings/  # Configurações (conta, galeria, horários, serviços)
│   ├── Admin/shared/    # Componentes compartilhados (modais, painéis)
│   ├── Admin/booking/   # Agendamento manual
│   ├── Booking/         # Agendamento público (4 steps)
│   └── ...              # Navbar, Footer, Hero, Gallery, etc.
├── contexts/            # Contextos React
├── hooks/               # Hooks customizados
├── lib/                 # API, Supabase client, utils
├── pages/               # Páginas (rotas)
├── types/               # Tipos TypeScript
└── test/                # Setup de testes
```


## Segurança

- **Rate Limiting**: Proteção contra brute force no login
- **RLS**: Row Level Security no Supabase
- **Audit Logs**: Registro de ações administrativas
- **Auth Guard**: Proteção de rotas admin
- **CSP + HSTS**: Headers de segurança no deploy

## Deploy

1. Configure as variáveis de ambiente no Vercel
2. Faça push para a branch `main`
3. O deploy será automático

### PWA

O app é um PWA (Progressive Web App). Para instalar no celular, acesse o site e clique em "Instalar app".

## Documentação

Consulte [DOCUMENTACAO.md](./DOCUMENTACAO.md) para detalhes completos.
Consulte [CHANGELOG.md](./CHANGELOG.md) para histórico de versões.
