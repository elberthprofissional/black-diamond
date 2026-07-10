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
- Componentes de booking em `src/components/Admin/booking/` (Desktop/Mobile unificados via `Responsive*`)

### Hooks
- Um hook por arquivo em `src/hooks/`
- Prefixo `use` no nome
- Hooks compostos: hooks de nivel alto importam hooks de nivel baixo
- Hook compartilhado `useMensalistaFilter` — usado por booking publico E admin

### API Layer
- Funcoes de dados em `src/lib/api/` (bookings, clients, services, mensalista, templates)
- Um arquivo por dominio
- Exportar via `src/lib/api/index.ts`

### Testes
- Arquivos de teste junto com o componente (`Componente.test.tsx`)
- Usar `@testing-library/react` e `@testing-library/jest-dom`
- Mockar Supabase com `vi.mock('../lib/supabase')`
- Mockar Framer Motion com `vi.mock('framer-motion')`
- Mockar hooks compartilhados com `vi.mock('../hooks/useMensalistaFilter')`

### Estilos
- Tailwind CSS 4 com tokens no `@theme`
- Tema dark: `#0A0A0A` fundo, `#C5A059` dourado
- Fontes: Plus Jakarta Sans (principal), Bebas Neue (titulos), Montserrat (destaques)
- Avatares coloridos por inicial (26 cores)

## Comandos Uteis

```bash
npm run dev          # Desenvolvimento
npm run build        # Build de producao
npm run test:run     # Rodar testes
npm run test:e2e     # Testes E2E (Playwright)
npm run lint         # Verificar erros
npx tsc --noEmit     # Type check
```

## Estrutura de Pastas

```
src/
├── components/
│   ├── Admin/
│   │   ├── booking/        # Componentes de agendamento admin (Responsive*)
│   │   ├── shared/         # Componentes compartilhados (modais, paineis)
│   │   ├── settings/       # Configuracoes (conta, galeria, horarios, servicos)
│   │   └── *.tsx           # Layout, Sidebar, Navbar
│   ├── Booking/            # Componentes de agendamento do cliente (4 steps)
│   └── *.tsx               # Componentes publicos
├── contexts/               # Contextos React (BarberSettings)
├── hooks/                  # Hooks customizados
│   ├── useMensalistaFilter # Hook compartilhado (publico + admin)
│   ├── useBookingWizard    # Booking publico
│   └── ...
├── lib/
│   ├── api/                # Camada de dados (bookings, clients, services, mensalista, templates)
│   ├── supabase.ts         # Cliente Supabase
│   ├── constants.ts        # Constantes
│   └── utils.ts            # Utilitarios
├── pages/                  # Paginas (rotas)
├── test/                   # Setup de testes
└── types/                  # Definicoes TypeScript
```

## Migrations

- Nunca deletar migrations que ja foram aplicadas em producao
- Para novas features, criar nova migration com data YYYYMMDD_descricao.sql
- O `universal.sql` e o schema consolidado para novas instalacoes
