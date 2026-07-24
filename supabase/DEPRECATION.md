# DEPRECATION NOTICE — universal.sql

> **Status:** REMOVIDO (v3.24.0)
> **Substituto:** `supabase/migrations/` (001-006)

## O que aconteceu

O arquivo `supabase/universal.sql` foi **removido** na v3.24.0.

Era um monolito de 2130 linhas difícil de manter e que criava divergência com as migrations incrementais.

## Substituto oficial

Use apenas as migrations consolidadas em `supabase/migrations/`:

```bash
# Rodar todas as migrations em ordem
for f in supabase/migrations/*.sql; do
  psql "$DATABASE_URL" -f "$f"
done
```

| Arquivo | Conteudo |
|---------|----------|
| `001_schema.sql` | 20+ tabelas + indexes + constraints + RLS enable |
| `002_rls.sql` | Todas as politicas RLS + is_admin() + storage |
| `003_functions.sql` | 30+ funcoes RPC (versoes finais) |
| `004_triggers.sql` | Triggers de notificacao + realtime |
| `005_seed_cron.sql` | Dados iniciais + cron jobs |
| `006_multi_barber.sql` | Multi-barber + cleanup mensalista |

## Seeds

Dados iniciais (depoimentos, etc) ficam em `supabase/seeds/`.

## Para projetos antigos

Se você ainda tem `universal.sql` no seu projeto, pode deletá-lo com segurança. As migrations 001-006 cobrem todo o schema necessário.
