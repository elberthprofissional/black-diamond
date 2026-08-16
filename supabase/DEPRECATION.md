# DEPRECATION NOTICE — universal.sql

> **Status:** REMOVIDO (v3.24.0)
> **Substituto:** `supabase/migrations/` (8 arquivos)

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
| `001_schema_core.sql` | Schema base + RPCs + triggers + cron |
| `002_multi_barber_pagamentos.sql` | Multi-barbeiro + assinaturas/PIX |
| `003_auditoria_rls.sql` | Performance/auditoria + RLS estrito |
| `004_escopo_barbeiro_acesso.sql` | Escopo por barbeiro + acesso público seguro |
| `005_conta_cliente_v2.sql` | Conta do cliente v2 (login, recuperação, e-mail, horários) |
| `006_agenda_duration_auth.sql` | Conflito por duração + Supabase Auth |
| `007_remove_assinaturas_pix.sql` | Remoção do sistema de assinaturas/PIX (2026-08-15) |
| `008_gallery_barber_id.sql` | Galeria: coluna `barber_id` para filtro por barbeiro (2026-08-16) |

> Consolidado em 8 arquivos (2026-08-16) a partir das 15 migrations originais — veja `supabase/migrations/README.md` para o mapeamento.

> Consulte `supabase/migrations/README.md` para o detalhamento das faixas.

## Seeds

Dados iniciais (depoimentos, etc) ficam em `supabase/seeds/`.

## Para projetos antigos

Se você ainda tem `universal.sql` no seu projeto, pode deletá-lo com segurança. As migrations em `supabase/migrations/` cobrem todo o schema necessário.
