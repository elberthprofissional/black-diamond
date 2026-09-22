# Migrations do BLACK DIAMOND

O schema é multi-tenant. Cada registro de negócio possui `barbershop_id`
e as RLS policies isolam os dados por barbearia.

As migrations foram consolidadas em **7 arquivos** para manter a
estrutura organizada. Se o seu banco já foi criado com as versões
anteriores (0001–0012), o caminho recomendado é:

```bash
supabase db reset        # recria a base do zero a partir destas migrations
# ou recrie o projeto no dashboard e aplique os arquivos em ordem
```

## Ordem de execução

As migrations rodam em ordem numérica (via `supabase db push` ou o
editor SQL do dashboard, na ordem):

| Arquivo | Conteúdo |
|---|---|
| `0001_schema.sql` | Extensões, tipos, tabelas, índices, triggers comuns |
| `0002_security.sql` | Helpers de RLS + policies + triggers de proteção de campos |
| `0003_features.sql` | Galeria, cupons (e colunas `coupon_id`/`discount` em agendamentos), bucket `gallery` |
| `0004_functions.sql` | RPCs: disponibilidade (passo de 1h), agendamento com cupom, convites, cancelar/reagendar, bootstrap de superadmin |
| `0005_seed_development.sql` | Seed de dev (BLACK DIAMOND, João, Carlos, Pedro) — sem clientes fake |
| `0006_clients_manual.sql` | `clients.is_manual` para cadastro manual no painel; policy de INSERT libera barbeiro |
| `0007_repeat_last_service.sql` | RPC público: último serviço do cliente (WhatsApp) para o "repetir agendamento" |

> Clientes e agendamentos **não** são seedados: eles nascem da página
> pública de agendamento. Para limpar dados demo de bases antigas, veja
> o comentário no topo de `0005_seed_development.sql`.

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