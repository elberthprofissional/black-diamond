# Guia de Contribuicao - Black Diamond

## Como Contribuir

1. Fork o repositorio
2. Crie uma branch de features (`git checkout -b feature/nova-funcionalidade`)
3. Faca seus commits (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## Workflow Git

- **main** — Producao. Nunca mexer direto.
- **versao-teste** — Branch de testes. Fazer merge aqui antes de ir pra main.

### Regra simples

> **NUNCA mexa direto na main pra testar coisa nova.** Sempre testa na versao-teste primeiro.

## Padroes de Codigo

### Componentes
- Functional components com TypeScript
- Um componente por arquivo
- Componentes compartilhados em `src/components/Admin/shared/`
- Componentes de booking em `src/components/Admin/booking/`

### Hooks
- Um hook por arquivo em `src/hooks/`
- Prefixo `use` no nome
- Exportar tipo de retorno

### Testes
- Arquivos de teste junto com o componente (`Componente.test.tsx`)
- Usar `@testing-library/react` e `@testing-library/jest-dom`
- Mockar Supabase com `vi.mock('../lib/supabase')`
- Mockar Framer Motion com `vi.mock('framer-motion')`

### Estilos
- Tailwind CSS 4 com tokens no `@theme`
- z-index usando variaveis CSS (`--z-modal`, `--z-overlay`, etc.)
- Tema dark: `#0A0A0A` fundo, `#C5A059` dourado

## Comandos Uteis

```bash
npm run dev          # Desenvolvimento
npm run build        # Build de producao
npm run test:run     # Rodar testes
npm run lint         # Verificar erros
npx tsc --noEmit     # Type check
```

## Estrutura de Pastas

```
src/
├── components/
│   ├── Admin/
│   │   ├── booking/        # Componentes de agendamento admin
│   │   ├── shared/         # Componentes compartilhados
│   │   └── *.tsx           # Layout, Sidebar, Navbar
│   ├── Booking/            # Componentes de agendamento do cliente
│   └── *.tsx               # Componentes publicos
├── hooks/                  # Hooks customizados
├── lib/
│   ├── api.ts              # Funcoes de API (CRUD)
│   ├── supabase.ts         # Cliente Supabase
│   └── utils.ts            # Utilitarios
├── pages/                  # Paginas (rotas)
├── test/                   # Setup de testes
└── types/                  # Definicoes TypeScript
```
