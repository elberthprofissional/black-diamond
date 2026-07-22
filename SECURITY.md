# Seguranca — Black Diamond

## Visao Geral

O Black Diamond implementa seguranca em varias camadas: frontend, backend (Supabase RPCs), banco de dados (RLS), e infraestrutura (headers HTTP). Este documento consolida todas as praticas de seguranca do projeto.

---

## 1. Autenticacao

- **Provider:** Supabase Auth (email + senha)
- **Sessao:** `persistSession: true` com auto-refresh de token
- **Recuperacao de senha:** Fluxo via Supabase Email com redirect para `/admin/reset-password`
- **Logout:** `signOut()` + audit log + hard redirect (`window.location.replace`)

## 2. Autorizacao

### Funcao `is_admin()`
```sql
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

- Usada em **todas** as politicas RLS de administracao
- `SECURITY DEFINER` garante que roda com privilegios do owner do banco
- `STABLE` permite caching dentro de uma transacao

### Controle de acesso por rota
| Rota | Protecao | Descricao |
|------|----------|-----------|
| `/`, `/agendar`, `/cancelar`, `/gerenciar`, `/cliente` | Publica | Acesso livre ao cliente |
| `/admin/*` | `AuthGuard` | Requer sessao Supabase ativa |
| `/barber` | `BarberGuard` | Apenas barbeiros (nao owner) |
| `/admin/login` | `StandaloneGuard` | Bloqueado no PWA (admin so acessa via PWA) |

### PWA como ferramenta admin
Quando o app e instalado como PWA, o `StandaloneGuard` bloqueia todas as rotas publicas e redireciona para `/admin/login`. Isso garante que o app instalado seja exclusivamente para o admin.

## 3. Row Level Security (RLS)

**RLS habilitado em TODAS as 19 tabelas.**

| Tabela | Leitura | Escrita |
|--------|---------|---------|
| `services` | Publica | Admin |
| `settings` | Publica | Admin |
| `mensalista_plans` | Publica | Admin |
| `gallery_images` | Publica (anon) | Admin |
| `testimonials` | Publica (ativos) | Admin |
| `barbers` | Publica (ativos) | Admin |
| `clients` | Admin | Admin |
| `bookings` | Admin + publica (futuros) | Admin |
| `notifications` | Dono | Dono |
| `push_subscriptions` | Admin | Admin |
| `admin_users` | Admin | Admin |
| `audit_logs` | Admin | Admin (via SECURITY DEFINER) |
| `booking_tokens` | Admin | Admin |
| `coupons` | Admin | Admin |
| `rate_limits` | N/A (SECURITY DEFINER) | N/A |

## 4. Rate Limiting

### Server-side (via RPC `check_rate_limit`)
| Operacao | Limite | Janela |
|----------|--------|--------|
| `criar_agendamento` | 3 tentativas | 60 segundos |
| `lookup_client` | 10 tentativas | 60 segundos |
| `get_bookings_by_phone` | 5 tentativas | 60 segundos |
| `get_last_booking_by_phone` | 5 tentativas | 60 segundos |
| Login admin | 5 tentativas | 900 segundos (15 min) |

### Client-side (`useRateLimit`)
- Persistido em `localStorage`
- Configuravel por operacao (maxAttempts + windowMs)
- Usado como primeira linha de defesa antes do server-side

## 5. Protecoes de Dados

### PII Masking
Funcoes RPC mascaram dados sensiveis em consultas publicas:
```sql
-- Em get_bookings_by_token():
CONCAT(LEFT(c.name, 1), '****') AS client_name
CONCAT(LEFT(c.phone, 3), '****', RIGHT(c.phone, 2)) AS client_phone
```

### Soft Delete
- Clientes usam `deleted_at` em vez de DELETE fisico
- Dados historicos preservados (`historical_visits`, `historical_spent`)
- `preserve_client_stats()` agrega estatisticas antes da limpeza

### Token-based Access
- Tokens de gerenciamento de agendamento expiram em 30 dias
- Tokens sao gerados com `encode(gen_random_bytes(16), 'hex')` (32 chars hex)

## 6. Headers de Seguranca (HTTP)

Configurados em `vercel.json`:

| Header | Valor | Protecao |
|--------|-------|----------|
| `X-Frame-Options` | `DENY` | Clickjacking |
| `X-Content-Type-Options` | `nosniff` | MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Controle de referrer |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | HSTS (2 anos) |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), notifications=(self)` | APIs sensiveis |

### Content Security Policy (CSP)
```
default-src 'self'
script-src 'self' https://fonts.googleapis.com https://www.googletagmanager.com
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com
font-src 'self' https://fonts.gstatic.com
img-src 'self' data: https: blob:
connect-src 'self' https://*.supabase.co wss://*.supabase.co https://sentry.io
frame-src 'self' https://*.google.com https://maps.google.com
worker-src 'self' blob:
```

**Nota:** `style-src 'unsafe-inline'` e necessario para Tailwind CSS v4 e Framer Motion.

## 7. Edge Functions — Verificacao de Admin

Todas as edge functions verificam:
1. JWT valido via `authClient.auth.getUser(token)`
2. Usuario e admin via query em `admin_users`

```typescript
const { data: adminCheck } = await authClient
  .from('admin_users')
  .select('user_id')
  .eq('user_id', user.id)
  .maybeSingle();

if (!adminCheck) {
  return new Response(JSON.stringify({ error: 'Acesso negado.' }), { status: 403 });
}
```

**Edge functions protegidas:**
- `send-push` — envio de notificacoes push
- `sync-google-reviews` — sincronizacao de reviews do Google

## 8. Banco de Dados — Constraints

```sql
-- Status valido
CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed'))

-- Precos e duracoes validos
CHECK (price >= 0)        -- services.price
CHECK (duration > 0)      -- services.duration
CHECK (total_price >= 0)  -- bookings.total_price
CHECK (total_duration > 0) -- bookings.total_duration

-- Regras de bloqueio
CHECK (
    (is_blocked = true AND client_id IS NULL AND total_price = 0 AND total_duration = 0) OR
    (is_blocked = false AND client_id IS NOT NULL)
)
```

## 9. Indice de Protecao

```sql
-- Impede duplo agendamento no mesmo horario
CREATE UNIQUE INDEX idx_no_double_booking
ON bookings (booking_date, booking_time)
WHERE (status != 'cancelled' AND is_blocked = FALSE);
```

## 10. Audit Logging

Todas as acoes administrativas sao registradas em `audit_logs`:

| Acao | Descricao |
|------|-----------|
| `login_success` | Login bem-sucedido |
| `login_failed` | Tentativa de login com falha |
| `logout` | Logout do admin |
| `booking_created` | Agendamento criado |
| `booking_completed` | Agendamento concluido |
| `booking_cancelled` | Agendamento cancelado |
| `booking_deleted` | Agendamento removido |
| `client_created` | Cliente criado |
| `client_deleted` | Cliente removido |
| `client_updated` | Cliente atualizado |

## 11. Sentry (Error Reporting)

- Captura erros de React, JavaScript runtime, promises rejeitadas, e erros de rede
- `logError()` centralizado: `console.warn` em dev, Sentry em prod
- Replay de sessao quando ha erro (apenas erros)
- So envia em producao (nao em desenvolvimento)

## 12. Dependencias de Seguranca

- **npm audit** roda no pre-push hook (`npm run audit`)
- **TruffleHog** scan no CI (apenas secrets verificados)
- **Dependabot** atualizacoes semanais com auto-merge para minor/patch
- **eslint-plugin-security** regras de lint para codigo inseguro
- **overrides** em package.json forçam versoes seguras de `tmp` e `uuid`

## 13. Boas Praticas

1. **Nunca commitar `.env`** — `.gitignore` exclui arquivos `.env*` (exceto `.env.example`)
2. **Secrets no Supabase** — `VAPID_PRIVATE_KEY`, `GOOGLE_PLACES_API_KEY` ficam em Edge Function secrets, nao no frontend
3. **SQL parametrizado** — Todas as queries usam PostgREST (parametrizado por padrao)
4. **React XSS** — React escapa inputs automaticamente
5. **CSP** — Previne carregamento de scripts externos nao autorizados
6. **HSTS** — Forca HTTPS por 2 anos com preload
