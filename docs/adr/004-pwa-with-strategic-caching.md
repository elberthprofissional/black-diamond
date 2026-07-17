# ADR-004: PWA com Service Worker e Cache Estratégico

**Status:** Aceito  
**Data:** 2026-03-05  
**Decisor:** Elberth Mayan

## Contexto

Clientes acessam o sistema pelo celular, frequentemente com conexão instável. O admin precisa funcionar mesmo offline para visualizar agenda.

## Decisão

Implementar PWA completo com Service Worker usando estratégias de cache diferenciadas por tipo de recurso.

## Estratégias de Cache

| Tipo | Estratégia | TTL | Exemplo |
|------|-----------|-----|---------|
| Assets estáticos | Cache-first + background update | Infinito (versionado) | CSS, JS, imagens |
| Navegações | Network-first + offline fallback | 10 entradas | Rotas HTML |
| API pública | Stale-while-revalidate | 50 entradas | Services, settings |
| API sensível | Network-only | N/A | Bookings, clients |

## Funcionalidades

- **Instalável**: Botão "Instalar" com prompt nativo (Android) e instruções manuais (iOS)
- **Offline**: Página offline customizada com mensagem amigável
- **Push Notifications**: Notificações para novos agendamentos
- **Background Sync**: Fila de agendamentos offline para sincronização posterior
- **Update Notification**: Toast "Nova versão disponível" quando SW atualiza

## Consequências

### Positivas
- Experiência nativa no celular
- Funciona sem internet (navegação)
- Notificações push aumentam engajamento

### Negativas
- Complexidade de invalidação de cache
- iOS não suporta push notifications
- Service Worker pode causar bugs se não versionado corretamente
