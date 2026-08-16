# Projeto Supabase separado para testes E2E

Os testes do Playwright (`e2e/`) criam agendamentos reais na base. Para não
poluir a produção, rode-os contra um **segundo projeto Supabase grátis**.

> O plano free do Supabase permite **2 projetos** — um é a produção
> (`dbukdhycfaibdshxnatt`), o outro pode ser exclusivo para testes.

## Passo 1 — Criar o projeto de teste

1. Acesse [app.supabase.com](https://app.supabase.com) → **New project**
2. Nome sugerido: `black-diamond-e2e`
3. Escolha uma senha de banco (pode ser diferente da produção — anote)
4. Região: a mais próxima disponível no free (ex.: `us-east-1`)
5. Aguarde a criação (~2 min)

## Passo 2 — Aplicar as migrations

Opção A — SQL Editor (recomendada):

1. No projeto de teste, abra **SQL Editor** → **New query**
2. Copie TODO o conteúdo de `supabase/_RODAR_NO_SQL_EDITOR.sql`
   (é a consolidação das 7 migrations) e rode.
3. Confira: `node scripts/audit-migrations.mjs` apontando o `.env` para o
   projeto de teste (veja passo 3).

Opção B — script (exige `SUPABASE_SERVICE_KEY` + `SUPABASE_MGMT_KEY` do
projeto de teste no ambiente):

```bash
SUPABASE_SERVICE_KEY=<service_key_e2e> node scripts/executar-todas-migrations.mjs
```

## Passo 3 — Configurar o ambiente de teste

Crie um arquivo `.env.e2e` na raiz (NÃO versionar — já coberto pelo `.gitignore`
via `*.local` e `.env.*.local`):

```env
VITE_SUPABASE_URL=https://SEU-PROJETO-E2E.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ... (anon key do projeto E2E)
```

Depois rode os e2e com as envs sobrepostas (o Vite prioriza variáveis de
ambiente sobre os arquivos `.env`):

```bash
# Local — sobe o dev server apontando para o projeto de teste
set -a && source .env.e2e && set +a && npm run test:e2e
```

> Se os testes exigirem a sessão de admin (`e2e/.auth/admin.json`), gere o
> storage state apontando `BASE_URL` para um deploy do projeto de teste:
> ```bash
> BASE_URL=https://<seu-deploy>.vercel.app ADMIN_EMAIL=... ADMIN_PASSWORD=... npx playwright test e2e/auth.setup.ts
> ```

## Passo 4 — Seeds de dados para o teste

O projeto de teste começa vazio. Para os fluxos de agendamento funcionarem,
crie no mínimo:

- **Serviços** (pelo painel admin ou SQL): corte, barba, etc.
- **Barbeiros** (1+ com horários em `barbers.barber_hours`)
- **Admin** em *Authentication > Users* (e adicione em `admin_users`)
- (opcional) `supabase/seeds/seed_data.sql` e `testimonials.sql`

## Passo 5 — CI (GitHub Actions)

No `ci.yml`, os jobs `e2e`/`accessibility`/`lighthouse` já leem as envs do
workflow. Para apontá-los ao projeto de teste em vez da produção, use secrets
separados:

```yaml
env:
  VITE_SUPABASE_URL: ${{ secrets.E2E_SUPABASE_URL }}
  VITE_SUPABASE_ANON_KEY: ${{ secrets.E2E_SUPABASE_ANON_KEY }}
  ADMIN_EMAIL: ${{ secrets.E2E_ADMIN_EMAIL }}
  ADMIN_PASSWORD: ${{ secrets.E2E_ADMIN_PASSWORD }}
```

## Por que isso importa

- **Dados de teste não poluem a produção** (clientes fake, bookings fake,
  notificações acumuladas — hoje há lixo real na base)
- **Segurança**: os e2e nunca tocam dados reais de clientes
- **Reprodutível**: o projeto de teste pode ser dropado/recriado à vontade
