# DEPRECATION NOTICE — universal.sql

> **Status:** DEPRECATED (a partir da v3.22.0)
> **Substituto:** `supabase/migrations/` (001-008)

## O que acontece

O arquivo `supabase/universal.sql` e mantido apenas para retrocompatibilidade com instalacoes antigas. Novos projetos devem usar as migrations consolidadas.

## Por que

- `universal.sql` (2130 linhas) e um monolito dificil de manter
- Migrations (001-008) sao incrementais e idempotentes
- Manter ambos cria divergencia de schema

## Como migrar

### Para instalacoes novas
Use apenas `supabase/migrations/`:
```bash
# Rodar todas as migrations em ordem
for f in supabase/migrations/*.sql; do
  psql "$DATABASE_URL" -f "$f"
done
```

### Para instalacoes existentes
1. Compare o que `universal.sql` tem que as migrations nao tem
2. Crie uma migration incremental (009_*.sql) para aplicar as diferencas
3. Nao reexecute `universal.sql` em projetos existentes

## O que as migrations cobrem

| Arquivo | Conteudo |
|---------|----------|
| `001_schema.sql` | 20 tabelas + indexes + constraints + RLS enable |
| `002_rls.sql` | Todas as politicas RLS + is_admin() + storage |
| `003_functions.sql` | 30+ funcoes RPC (versoes finais) |
| `004_triggers.sql` | Triggers de notificacao + realtime |
| `005_seed_data.sql` | Dados iniciais + billing plans |
| `006_cron.sql` | 6 cron jobs consolidados |
| `007_reminder_logs.sql` | Logs de lembretes WhatsApp |
| `008_multi_barber.sql` | Suporte multi-barbeiro |

## NOTA

O `universal.sql` continua funcional e sera mantido funcionando, mas nao recebera novas funcionalidades. Use as migrations para todo o desenvolvimento futuro.
