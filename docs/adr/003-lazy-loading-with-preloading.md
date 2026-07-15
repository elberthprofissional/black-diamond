# ADR-003: Lazy loading com route preloading

**Status:** Aceito  
**Data:** 2026-02-10  
**Decisor:** Elberth Mayan

## Contexto

O Black Diamond tem 15+ rotas (Home, Booking, Admin Dashboard, Admin Weekly, Admin Clients, etc.). Carregar tudo no bundle inicial impactaria o tempo de carregamento da home page.

## Decisão

Utilizar `React.lazy()` para todas as rotas + preload inteligente baseado na navegação provável.

## Implementação

```tsx
// Lazy loading de todas as rotas
const Home = lazy(() => import('./pages/Home'));
const BookingPage = lazy(() => import('./pages/BookingPage'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

// Preloading baseado na rota atual
const preloadPaths: Record<string, string[]> = {
  '/': ['/agendar'],
  '/agendar': ['/cancelar', '/gerenciar'],
  '/admin': ['/admin/weekly', '/admin/clients', '/admin/profile'],
};
```

## Justificativa

- **Bundle splitting automático**: Cada rota vira um chunk separado
- **Preloading inteligente**: Carrega chunks prováveis após 1s de delay
- **Suspense com fallback**: Loading spinner elegante durante carregamento
- **Performance**: Home page carrega apenas o essencial

## Consequências

### Positivas
- First Contentful Paint rápido na home
- Navegação subsequente instantânea (pré-carregada)
- Bundle size reduzido por página

### Negativas
- Splash de loading na primeira navegação (mitigado pelo preloading)
- Mais chunks para gerenciar no build
