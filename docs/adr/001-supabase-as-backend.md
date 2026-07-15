# ADR-001: Supabase como Backend-as-a-Service

**Status:** Aceito  
**Data:** 2026-01-15  
**Decisor:** Elberth Mayan

## Contexto

O Black Diamond precisa de um backend completo: banco de dados relacional, autenticação, storage de imagens, edge functions, real-time subscriptions e push notifications. Opções consideradas:

1. **Supabase** (BaaS completo)
2. **Firebase** (BaaS completo)
3. **Backend customizado** (Node.js + PostgreSQL)

## Decisão

Utilizar **Supabase** como plataforma backend completa.

## Justificativa

- **PostgreSQL real**: Schema relacional completo com RLS, indexes compostos, funções RPC complexas
- **Row Level Security**: Controle de acesso nativo no banco, sem lógica duplicada no client
- **Edge Functions**: Deno runtime para webhooks (Asaas) e push notifications
- **Real-time**: Subscriptions para dashboard admin atualizar em tempo real
- **Storage**: Upload de imagens da galeria com policies de acesso
- **Auth**: Autenticação admin com Supabase Auth
- **Cron Jobs**: `pg_cron` para automações (auto-complete, cleanup, relatório semanal)
- **Custo**: Free tier generoso para barbearias (500MB DB, 1GB storage, 500K edge function invocations)

## Consequências

### Positivas
- Zero infraestrutura para gerenciar
- Schema versionado via migrations SQL
- RLS garante segurança no nível do banco
- RPC functions movem lógica crítica para server-side

### Negativas
- Vendor lock-in moderado (SQL padrão, migrável)
- Limite de 500MB no free tier (suficiente para barbearias)
- Edge functions rodam em Deno (não Node.js)
