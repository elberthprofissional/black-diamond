# BLACK DIAMOND

Sistema de agendamento premium para barbearias.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 19 + TypeScript 6.x |
| Build | Vite 8.x |
| Estilo | Tailwind CSS 4.x |
| Animacoes | Framer Motion 12.x |
| Roteamento | React Router DOM 7.x |
| Backend | Supabase (PostgreSQL + RLS + Auth) |
| Testes | Vitest 4.x + Testing Library |
| Deploy | Vercel |

## Rodar

```bash
npm install
npm run dev
```

## Testes

```bash
npm run test          # Watch mode
npm run test:run      # Run once
npm run test:coverage # Com cobertura
```

## Build & Deploy

```bash
npm run build    # Build de producao
npm run preview  # Preview do build
npm run lint     # Verificar erros de codigo
```

Configure as env vars no Vercel e faca push. Veja [DOCUMENTACAO.md](./DOCUMENTACAO.md) para detalhes completos.

## Contribuicao

Consulte [CONTRIBUTING.md](./CONTRIBUTING.md) para guia de contribuicao, padroes de codigo e workflow Git.

## Documentacao

Consulte [DOCUMENTACAO.md](./DOCUMENTACAO.md) para setup, arquitetura, seguranca, integracao com email e troubleshooting.
