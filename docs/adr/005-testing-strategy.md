# ADR-005: Estratégia de testes em 4 camadas

**Status:** Aceito  
**Data:** 2026-04-10  
**Decisor:** Elberth Mayan

## Contexto

O sistema tem múltiplas camadas (UI, hooks, API, DB) cada uma com diferentes requisitos de teste. Precisamos de uma estratégia que maximize cobertura com custo mínimo de manutenção.

## Decisão

Estratégia de testes em 4 camadas com ferramentas específicas para cada uma.

## Camadas

### 1. Unitários (Vitest + Testing Library)
- **Escopo**: Hooks, funções utilitárias, componentes isolados
- **Cobertura**: 607+ testes
- **Setup**: Mock global do Supabase em `src/test/setup.ts`
- **Exemplo**: `useToast`, `useBookingWizard`, `getErrorMessage`

### 2. API/Integração (Vitest + Supabase mock)
- **Escopo**: Funções de API (bookings, clients, billing, loyalty, coupons)
- **Cobertura**: 38+ testes em arquivos `*.test.ts` no `lib/api/`
- **Setup**: Mock de query builder com chain methods
- **Exemplo**: `createBooking`, `validateCoupon`, `getClientMilestones`

### 3. E2E (Playwright)
- **Escopo**: Fluxos críticos (booking completo, navegação, PWA)
- **Browsers**: Chromium, Firefox, Mobile Chrome
- **Setup**: Web server automático, retries em CI
- **Exemplo**: Fluxo de agendamento do início ao fim

### 4. Visual/Acessibilidade (TestSprite + axe-core)
- **Escopo**: Regressão visual e auditoria de acessibilidade
- **Setup**: Snapshots comparativos, regras axe-core críticas
- **Exemplo**: Home page, booking page, login admin

## Consequências

### Positivas
- Cada camada testa o que é melhor testado por ela
- Mocks globais reduzem boilerplate
- E2E rodam apenas em CI (economizam tempo local)

### Negativas
- Mais ferramentas para manter
- Testes E2E frágeis com Supabase live
- Coverage threshold pode causar falsos negativos
