# Migrations do Supabase

Estrutura de `supabase/migrations/`. As migrations são a **fonte de verdade**
do schema — o arquivo `supabase/_RODAR_NO_SQL_EDITOR.sql` é apenas uma
consolidação gerada por `scripts/regenerate-mega.mjs`.

## Estrutura (11 arquivos)

| Arquivo | Conteúdo | Origem (migrations antigas) |
|---------|----------|------------------------------|
| `001_schema_core.sql` | Schema base (tabelas, extensões, índices, constraints, RLS, storage) + RPCs (agendamento, slots, cupons, no-show, fidelidade) + triggers + seeds + cron | 001_schema_rls, 002_functions_triggers |
| `002_multi_barber_pagamentos.sql` | Multi-barbeiro (`barbers`, `get_barbers`) + assinaturas, PIX e bloqueio por pagamento | 003_features_fixes, 004_subscriptions_pix |
| `003_auditoria_rls.sql` | Índices de performance, auditoria, seeds de planos mensalistas + RLS estrito | 005_performance_auditoria, 006_rls_estricto |
| `004_escopo_barbeiro_acesso.sql` | Escopo por barbeiro (`is_barber_owner`, `current_barber_id`), acesso público seguro de bookings (RPCs com rate limit), fix de disponibilidade | 011_barber_scope_rls, 012_secure_bookings_public_access, 013_barber_availability_fix |
| `005_conta_cliente_v2.sql` | Conta do cliente v2: login por telefone/e-mail com senha (bcrypt), horário próprio por barbeiro (`barbers.barber_hours`), recuperação de senha por código, e-mail no dashboard | 014_login_contas, 015_barber_hours, 016_conta_cliente_recuperacao, 017_conta_cliente_email_dashboard |
| `006_agenda_duration_auth.sql` | Conflito por duração (slots que não comportam o serviço somem) + integração Supabase Auth (`sync_client_user`, `clients.user_id`) | 018_duration_overlap, 019_client_supabase_auth |
| `007_remove_assinaturas_pix.sql` | Remoção do sistema de assinaturas/PIX (tabelas, funções, trigger, cron, `owner_pix_key`) | — (nova em 2026-08-15) |
| `008_gallery_barber_id.sql` | Adiciona coluna `barber_id` na tabela `gallery_images` para filtrar fotos por barbeiro | — (nova em 2026-08-16) |
| `20260816223353_add_google_linking.sql` | Integração Login com Google: `buscar_cliente_por_email_auth` + link de conta de cliente com auth do Google | — (nova em 2026-08-16) |
| `009_cupons_resgatados.sql` | Cupons estilo Shopee: tabela `client_coupons` (posse cliente↔cupom) + RPCs `resgatar_cupom`, `get_client_coupons`, `usar_cupom_resgatado` (rate limit 10/min) | — (nova em 2026-08-17) |
| `010_cupons_vitrine_publica.sql` | Fix RLS: RPC pública `get_available_coupons` para a vitrine do `/cliente` (a tabela `coupons` é admin-only, então SELECT direto voltava vazio para o anon) | — (nova em 2026-08-17) |

Cada arquivo preserva os marcadores `-- >>> MIGRATION: <arquivo_original> <<<`
para rastreabilidade, e o conteúdo é **idêntico** ao das migrations originais
(apenas agrupado — mesmo SQL, mesma ordem de execução).

## Regras

- Toda alteração de schema → **nova migration numerada** (ex.: `007_...sql`).
- `_RODAR_NO_SQL_EDITOR.sql` é **gerado** — rode `node scripts/regenerate-mega.mjs`
  após criar/editar migrations e commite junto.
- Valide com: `node scripts/audit-migrations.mjs` (compara migrations vs banco real).

## Limpeza 2026-08-15

Tabelas mortas dropadas (sem uso no app): `barber_commissions`,
`barber_schedules`, `barber_settings`, `expenses`, `fixed_expenses`,
`recurring_expenses`, `loyalty_config`, `system_settings` — backup em
`scripts/backup-tabelas-mortas.json`. A função quebrada `send_push_notification`
(referenciava a tabela dropada `secrets`) também foi removida — o push real é a
edge function `send-push`.
