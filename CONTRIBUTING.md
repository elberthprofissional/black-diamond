# Guia de Contribuição — Black Diamond

## Pré-requisitos

- **Node.js 18+** (veja `.nvmrc` para a versão exata)
- **npm** (não use yarn/pnpm — o lockfile é npm)
- **Git** com configuração de nome/email

## Começando

```bash
# 1. Fork e clone
git clone <seu-fork-url>
cd black-diamond

# 2. Instalar dependências
npm install

# 3. Copiar variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais do Supabase

# 4. Rodar migrations
npx supabase db push

# 5. Iniciar desenvolvimento
npm run dev
```

## Workflow Git

### Branches

| Branch | Uso | Deploy |
|--------|-----|--------|
| `main` | Produção. **Nunca mexer direto.** | Automático na Vercel |
| `staging` | Testes. Merge aqui antes de ir pra main. | Automático (staging) |
| `feature/nome` | Features novas | Nenhum |

### Regra de ouro

> **NUNCA faça deploy direto da main pra testar coisa nova.** Sempre teste no staging primeiro.

### Fluxo de uma feature

```bash
# 1. Criar branch da feature
git checkout staging
git pull
git checkout -b feature/minha-feature

# 2. Desenvolver e commitar
git add .
git commit -m "feat: adiciona X"

# 3. Push e abrir PR
git push origin feature/minha-feature
# Abrir PR → staging

# 4. Após review e CI verde, merge no staging
# Testa no staging.vercel.app

# 5. Quando estiver ok, merge staging → main
```

### Commits

Use [Conventional Commits](https://www.conventionalcommits.org/):

| Tipo | Quando usar | Exemplo |
|------|-------------|---------|
| `feat:` | Feature nova | `feat: adiciona cupom de desconto` |
| `fix:` | Bug fix | `fix: calendário pula domingo` |
| `refactor:` | Refatoração sem mudar comportamento | `refactor: extrai NotificationItem` |
| `test:` | Adiciona/corrige teste | `test: cobre useRateLimit` |
| `docs:` | Documentação | `docs: atualiza DEPLOY_GUIDE` |
| `style:` | Formatação, semântica visual | `style: corrige padding no modal` |
| `chore:` | Tooling, CI, configs | `chore: atualiza dependências` |

---

## Arquitetura do Projeto

### Estrutura

```
src/
├── components/
│   ├── Admin/
│   │   ├── booking/              # Booking admin (Responsive*)
│   │   ├── notifications/        # Notificações (detail, item, panel, filters)
│   │   ├── shared/               # Modais, paineis, toasts reutilizáveis
│   │   ├── settings/             # Configurações (conta, galeria, horários...)
│   │   └── *.tsx                 # Layout, Sidebar, Navbar, Bell
│   ├── Booking/                  # Booking público (4 steps)
│   └── *.tsx                     # Hero, About, Gallery, Footer...
├── contexts/                     # Context API (BarberSettings)
├── hooks/                        # Hooks customizados (um por arquivo)
├── lib/
│   ├── api/                      # Camada de dados (bookings, clients, services...)
│   ├── supabase.ts               # Cliente Supabase
│   ├── notifications.ts          # Parse e utilitários de notificação
│   └── utils.ts                  # Utilitários gerais
├── pages/                        # Páginas (rotas)
├── test/                         # Setup de testes
└── types/                        # Definições TypeScript
```

### Convenções de código

#### Componentes
- **Functional components** com TypeScript (nunca `React.FC` nos params — use `type FC` se necessário)
- **Um componente por arquivo.** Arquivo = componente principal + helpers privados do mesmo componente
- **Componentes de booking** ficam em `booking/` e usam prefixo `Responsive*` (desktop + mobile no mesmo arquivo)
- **Componentes compartilhados** ficam em `shared/` — modais, paineis, toasts
- **Notificações** ficam em `notifications/` — detail, item, panel, filters separados

#### Hooks
- **Um hook por arquivo** em `src/hooks/`
- Prefixo `use` no nome
- Hooks compostos: hooks de nível alto importam hooks de nível baixo
- Hook compartilhado `useMensalistaFilter` — usado por booking público E admin

#### API Layer
- Funções de dados em `src/lib/api/` — um arquivo por domínio
- Exportar via `src/lib/api/index.ts` (barrel)
- Chamadas ao Supabase usam PostgREST parametrizado (nunca concatene strings SQL)

#### Estilos
- **Tailwind CSS 4** com tokens no `@theme`
- Tema dark: `#0A0A0A` fundo, `#C5A059` dourado
- Fontes: Plus Jakarta Sans (corpo), Bebas Neue (títulos), Montserrat (destaques)
- Nunca usar cores hardcoded fora do tema — use as variáveis do Tailwind

### Gerenciamento de Estado

- **Context API** + hooks customizados (sem Zustand, sem Redux)
- Autenticação: `supabase.auth` direto via `AuthGuard`
- Cache module-level para dados estáticos (serviços)
- Realtime via Supabase para notificações e bookings

### Migrations

- Nunca deletar migrations que já foram aplicadas em produção
- Para novas features, criar migration com nome `YYYYMMDD_descricao.sql`
- O `universal.sql` é o schema consolidado para novas instalações

---

## Testes

### Tipos de teste

| Tipo | Framework | Comando | Onde |
|------|-----------|---------|------|
| **Unitários** | Vitest + Testing Library | `npm run test:run` | `src/**/*.test.{ts,tsx}` |
| **Cobertura** | Vitest + V8 | `npm run test:coverage` | Mínimo 70% |
| **E2E** | Playwright | `npm run test:e2e` | `e2e/*.spec.ts` |
| **Visual** | TestSprite | `npx testsprite run` | `.testsprite/` |
| **Lint** | ESLint | `npm run lint` | Todo o projeto |

### Escrevendo testes

```tsx
// Arquivo junto com o componente: MeuComponente.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock do Supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    })),
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
  },
}));

// Mock do Framer Motion (importante — causa erro sem mock)
vi.mock('framer-motion', () => ({
  motion: { div: 'div' },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

import MeuComponente from './MeuComponente';

describe('MeuComponente', () => {
  it('renderiza corretamente', () => {
    render(<MeuComponente />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

### CI check

O GitHub Actions roda em todo PR/merge na `main`:
1. `npm run lint`
2. `npm run test:coverage` (mínimo 70%)
3. `npx tsc --noEmit`
4. `npm run build`

**Se qualquer etapa falhar, o PR não pode ser mergeado.**

---

## Comandos Úteis

```bash
# Desenvolvimento
npm run dev              # Server de dev (hot reload)
npm run build            # Build de produção
npm run preview          # Preview do build

# Código
npm run lint             # Verificar erros
npm run lint:fix         # Corrigir automaticamente
npm run format           # Formatar com Prettier

# Testes
npm run test             # Watch mode
npm run test:run         # Rodar uma vez
npm run test:coverage    # Com cobertura
npm run test:e2e         # E2E com Playwright

# Type check
npx tsc --noEmit         # Verificar tipos
```

## Configuração

### Variáveis de ambiente

Copie `.env.example` para `.env`:

| Variável | Descrição | Obrigatório |
|----------|-----------|-------------|
| `VITE_SUPABASE_URL` | URL do projeto Supabase | Sim |
| `VITE_SUPABASE_ANON_KEY` | Chave anon do Supabase | Sim |
| `VITE_BARBER_WHATSAPP` | WhatsApp do barbeiro (5531999999999) | Sim |
| `VITE_VAPID_PUBLIC_KEY` | Chave pública VAPID (push notifications) | Sim |
| `VITE_SENTRY_DSN` | DSN do Sentry (error reporting) | Opcional |

### Supabase

Cada barbearia tem seu próprio projeto Supabase. Para setup:
1. Crie o projeto em [supabase.com](https://supabase.com)
2. Execute o `supabase/universal.sql` no SQL Editor
3. Crie o usuário admin em Authentication > Users
4. Adicione na tabela `admin_users`

Ou use a instalação automática: `node instalar-cliente.mjs`

---

## Deploy

### Staging (automático)

Toda merge na branch `staging` faz deploy automático na Vercel.

### Produção (automático)

Toda merge na branch `main` faz deploy automático na Vercel.

### Envio de push notifications

Após deploy, a edge function `send-push` precisa estar deployada:
```bash
supabase functions deploy send-push
```

---

## Problemas Comuns

| Problema | Solução |
|----------|---------|
| `npm run dev` não inicia | Verifique `.env` — variáveis obrigatórias faltando |
| Testes falham | Rode `npm install` — dependências podem estar desatualizadas |
| Build falha | Rode `npm run lint` e `npx tsc --noEmit` para ver erros |
| Push notifications não funcionam | Verifique VAPID keys + edge function deployada |
| WhatsApp não abre | Formato correto: `5531999999999` (código país + DDD + número) |
| Coverage falha no CI | Adicione testes — mínimo 70% em todas as métricas |

---

## Checklist do PR

Antes de abrir um PR, confira:

- [ ] Código compila sem erros (`npx tsc --noEmit`)
- [ ] Lint passa (`npm run lint`)
- [ ] Testes passam (`npm run test:run`)
- [ ] Coverage não caiu abaixo de 70%
- [ ] Funcionalidade testada no browser (se mudou UI)
- [ ] Commit message segue Conventional Commits
- [ ] Branch criada a partir da `staging`
