# BLACK DIAMOND

Sistema de agendamento premium para barbearias.

[![Version](https://img.shields.io/badge/version-3.2.0-blue)](https://github.com/seu-usuario/black-diamond)
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

## Scripts Disponíveis

```bash
npm run dev          # Servidor de desenvolvimento
npm run build        # Build de produção
npm run preview      # Preview do build

# Testes
npm run test         # Watch mode
npm run test:run     # Run once
npm run test:coverage # Com cobertura
npm run test:e2e     # Testes E2E (Playwright)

# Qualidade
npm run lint         # Verificar erros
npm run lint:fix     # Corrigir erros
npm run format       # Formatar código
npm run format:check # Verificar formatação
```

## Arquitetura

```
src/
├── components/     # Componentes React
│   ├── Admin/      # Componentes do painel admin
│   ├── Booking/    # Componentes de agendamento
│   └── shared/     # Componentes compartilhados
├── contexts/       # Contextos React
├── hooks/          # Hooks customizados
├── lib/            # Utilitários e integrações
├── pages/          # Páginas (rotas)
├── types/          # Tipos TypeScript
└── test/           # Setup de testes
```

## Segurança

- **Rate Limiting**: Proteção contra brute force no login
- **RLS**: Row Level Security no Supabase
- **Audit Logs**: Registro de ações administrativas
- **Auth Guard**: Proteção de rotas admin

## Deploy

1. Configure as variáveis de ambiente no Vercel
2. Faça push para a branch `main`
3. O deploy será automático

### PWA

O app é um PWA (Progressive Web App) que só captura as rotas `/admin`. Links públicos (`/`, `/agendar`) abrem normalmente no navegador.

**Para atualizar o PWA após mudanças no manifest:**
1. Desinstale o app do celular
2. Acesse o site novamente
3. Instale o PWA

## Contribuição

Consulte [CONTRIBUTING.md](./CONTRIBUTING.md) para guia de contribuição.

## Documentação

Consulte [DOCUMENTACAO.md](./DOCUMENTACAO.md) para detalhes completos.
Consulte [CHANGELOG.md](./CHANGELOG.md) para histórico de versões.
