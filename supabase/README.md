# Migrations do BLACK DIAMOND

O schema é multi-tenant. Cada registro de negócio possui `barbershop_id`
e as RLS policies isolam os dados por barbearia.

## Ordem de execução

As migrations rodam em ordem numérica (via `supabase db push` ou o
editor SQL do dashboard, na ordem):

| Arquivo | Conteúdo |
|---|---|
| `0001_extensions.sql` | Extensões |
| `0002_schema.sql` | Tipos, tabelas, índices, constraints, triggers |
| `0003_helpers.sql` | Funções de RLS (`is_superadmin`, `is_member_of`, `current_role`, ...) |
| `0004_policies.sql` | RLS policies + triggers de proteção de campos |
| `0005_functions.sql` | RPCs: disponibilidade, agendamento, convite, memberships |
| `0006_seed_development.sql` | Seed de dev (BLACK DIAMOND, João, Carlos, Pedro) |
| `0007_admin_tools.sql` | Bootstrap de SUPERADMIN (apenas service_role/script) |

## Como aplicar

```bash
# opção A — Supabase CLI (recomendado)
supabase link --project-ref SEU_REF
supabase db push

# opção B — editar o banco manualmente
#  1. Crie o projeto no dashboard do Supabase
#  2. Abra "SQL Editor" e cole cada arquivo 000X... em ordem
```

## Após as migrations

```bash
cp .env.example .env    # preencha VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
npm install
npm run superadmin:create            # cria/promove o primeiro SUPERADMIN
npm run seed:dev                     # (opcional, dev) cria contas de João/Carlos/Pedro
npm run dev                          # usa a imagem pública em /agendar/black-diamond
```

### Fluxo alternativo (sem o script de seed)
1. `npm run superadmin:create`.
2. Login como SUPERADMIN e crie a barbearia/tela própria.
3. Na tela **Sistema → Barbearias**, o SUPERADMIN convida João (OWNER).
4. João entra em `/admin` → **Equipe** → convida Carlos e Pedro (BARBER).