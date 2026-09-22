# BLACK DIAMOND 💈

Sistema de gestão e agendamento para barbearias — **multi-tenant**, com página pública de agendamento, painel de dono/barbeiro e área global para superadmins. Tudo isso sem APIs pagas: autenticação e banco pela **Supabase** e confirmação via **WhatsApp** (`wa.me`).

## O que o sistema entrega

- **Página pública por barbearia** (`/agendar/:slug`): sem login, o cliente escolhe serviço → profissional → dia/horário, preenche nome/WhatsApp e recebe link de confirmação via WhatsApp.
- **Painel do dono** (`/admin`): agenda do dia, agendamentos com filtros, clientes, serviços, equipe (convidar barbeiros), bloqueios, financeiro, configuração da página pública (identidade, contatos, rodapé, cor de destaque e horários).
- **Painel do barbeiro**: vê apenas a própria agenda, bloqueia seus próprios horários e edita a própria disponibilidade/perfil.
- **Superadmin** (`/sistema`): cria/desativa barbearias, promove donos e vê métricas globais.
- **Permissões no banco**: cada papel é validado via RLS; o frontend nunca é a única barreira.

## Stack

React 18 + TypeScript + Vite 5 · React Router 6 · Supabase (Postgres + Auth + RLS) · Deploy: Vercel.

# Como rodar localmente

### 1. Pré-requisitos

- Node.js 20+ (testado em 24.x) e npm.
- Uma conta [Supabase](https://supabase.com) criada e um projeto novo.

### 2. Configurar o Supabase

1. Em **Database → Extensions**, habilite `pgcrypto` (usada pelo seed) — ou rode a migração abaixo que já cobre isso.
2. Aplique as migrações. Copie/cole o conteúdo dos arquivos em `supabase/migrations/` na ordem (`0001` → `0005`) no **SQL Editor**, ou use a CLI:
   ```bash
   npx supabase link --project-ref SEU_PROJETO_REF
   npx supabase db push
   ```
   > As migrations já foram consolidadas em 5 arquivos; em bases antigas
   > (0001–0012) prefira `supabase db reset` para recriar a partir delas.
3. Em **Authentication → Providers**, deixe **Email** habilitado (com Confirm email ligado ou desligado — o convite de membros já envia email confirmado).
4. Pegue em **Settings → API**:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public key` → `VITE_SUPABASE_ANON_KEY`
   - `service_role key` → usada **somente** nos scripts de bootstrap (`SEED_SERVICE_ROLE_KEY`), nunca no frontend.

### 3. Variáveis de ambiente

```bash
cp .env.example .env
```

Preencha:

```dotenv
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
SEED_SERVICE_ROLE_KEY=...   # somente para scripts de dev/administração
```

> `scripts/*.mjs` carregam o `.env` na mão e usam a role `service_role` (bypassa RLS). Não exponha essa chave no app.

### 4. Instalar, seedar e rodar

```bash
npm install
npm run dev
```

**Seed de desenvolvimento** (cria a barbearia demo **BLACK DIAMOND**, slug `black-diamond`, dono João e barbeiros Carlos/Pedro, serviços, horários e quadros de galeria de exemplo — **sem clientes/agendamentos fake**, eles nascem do agendamento real):

```bash
npm run seed:dev
```

**Primeiro superadmin** (cria você como administrador global, que então terá acesso a `/sistema`):

```bash
npm run superadmin:create
```

Vai pedir nome + email, e criará o usuário com uma senha temporária informada.

### 5. Criar dono

Com o superadmin em `/sistema`, use **“Convidar dono”** na barbearia: informa nome, email e senha temporária. O dono faz login no `/login` e gerencia tudo da barbearia. Dentro da Equipe, o dono convida barbeiros do mesmo jeito.

### 6. Rodar com um clique (Windows)

```bash
npm run launch
```

Usa `launcher/start-dev.ps1`: instala dependências, inicia o Vite, abre o navegador e espera ENTER para encerrar. Instruções para gerar um `.exe` com PS2EXE em `launcher/README.md`.

# Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Vite em modo desenvolvimento |
| `npm run build` | `tsc --noEmit` + build de produção |
| `npm run typecheck` | Verifica tipos apenas |
| `npm run seed:dev` | Popula o banco com dados de demonstração |
| `npm run superadmin:create` | Cria o primeiro superadmin |
| `npm run launch` | Abre o sistema em um clique (Windows) |

# Deploy na Vercel

1. Suba o repositório e importe na Vercel (framework **Vite**).
2. Config **Build Command**: `npm run build` · **Output Directory**: `dist`.
3. Adicione as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (públicas) no painel.
4. Ajuste em Supabase, **Auth → URL Settings**: `Site URL` e `Redirect URLs` para o domínio de produção.

# Segurança e arquitetura

- **Multi-tenant**: `barbershop_id` em todas as tabelas de negócio; RLS impede cruzamento entre barbearias.
- **Papéis**: `profiles.is_superadmin` (global) e `members.role` (`owner`/`barber` por barbearia). Clientes não criam conta.
- **Disponibilidade**: a função `_find_slots` cruza horário de funcionamento × horários do barbeiro × bloqueios × agendamentos ativos, em passos de 1 hora, e retorna apenas horários futuros. `book_appointment` revalida tudo no servidor com `pg_advisory_xact_lock` para evitar reserva dupla.
- **Convites**: `admin_invite_member` cria o usuário via Auth com `email_confirm = true`; o convidado entra com a senha temporária.
- Detalhes de funções, políticas e RPCs: `supabase/README.md`.

# Estrutura

```
src/
  pages/public/BookingPage.tsx   # agendamento sem login (/agendar/:slug)
  pages/auth/LoginPage.tsx       # login e recuperação de senha
  pages/admin/*                  # painel (agenda, agendamentos, clientes, serviços, equipe, bloqueios, financeiro, perfil, configuração)
  pages/superadmin/              # área global (/sistema)
  components/                    # UI e blocos reutilizáveis
  hooks/                         # Auth, Toast, dados assíncronos
  services/api.ts                # camada única de acesso ao Supabase
  types/index.ts                 # tipos das entidades
  utils/                         # datas, formatação, validação
  styles/                        # base, ui, layout, páginas
scripts/                         # bootstrap (seed, superadmin) — service_role
launcher/                        # launcher Windows
supabase/migrations/             # schema (0001–0005) + documentação
```