# Proximos Passos — Black Diamond

> Gerado em 17/07/2026. Status: correcoes P0/P1/P2 concluidas, pendente validacao em ambiente com Supabase.

---

## ✅ Concluido (esta sessao)

### P0 — Corrigido
- [x] `criar_agendamento` SQL — `p_coupon_id` adicionado, cupom server-side funcional
- [x] `tsconfig.app.json` — billing files excluidos com justificativa
- [x] `send-push` Edge Function — CORS restrito (removido `*.vercel.app` generico)

### P1 — Corrigido
- [x] `health_check()` versao sincronizada com `package.json` (3.20.0)
- [x] `DEPLOY_GUIDE.md` — referencias corrigidas (`universal.sql`, `instalar-cliente.mjs`, `logo.webp`)
- [x] `DOCUMENTACAO.md` — hooks duplicados removidos, reviews duplicado removido, CSP corrigido
- [x] `.gitignore` — `test-results/` e `playwright-report/` adicionados
- [x] `CancelPage.tsx` — working days agora usa `getNextDays()` em vez de hardcoded seg-sex
- [x] `sw.js` — logica de caching renomeada, `syncOfflineBookings` morto removido

### P2 — Corrigido
- [x] `.husky/commit-msg` — hook de validacao Conventional Commits
- [x] `playwright.config.ts` — projetos WebKit e mobile-safari adicionados
- [x] `src/lib/api/testimonials.ts` — arquivo vazio deletado
- [x] `.github/` — issue templates, PR template, CODEOWNERS criados
- [x] `useProfileStats.ts` — setters expostos removidos

### Validacao
- [x] `tsc -b --noEmit` — compila sem erros
- [x] `npm run build` — build de producao OK
- [x] `vitest run` — 55 arquivos, 409 testes, todos passando
- [x] WebKit instalado no Playwright

---

## 🔴 Proximo passo imediato

### 1. Configurar `.env` com credenciais do Supabase
```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```
Pegar em **Supabase Dashboard > Settings > API**.

### 2. Rodar testes E2E completos (com Supabase)
```bash
npm run test:e2e                    # Chromium (todos os testes)
npx playwright test --project=webkit  # Safari/WebKit
npx playwright test --project=mobile-safari  # iPhone 13
```

### 3. Testar fluxo de cupom manualmente
1. Criar um cupom no painel admin
2. Fazer agendamento publico com cupom aplicado
3. Verificar no Supabase: tabela `bookings` deve ter `coupon_id` e `discount_amount` preenchidos
4. Verificar que `coupons.current_uses` incrementou

---

## 📋 Curto prazo (esta semana)

- [ ] Rodar `npm audit` e corrigir vulnerabilidades se houver
- [ ] Configurar Sentry DSN no `.env` de producao
- [ ] Testar PWA install no celular real (Android + iOS)
- [ ] Verificar se as migracoes do Supabase estao sincronizadas com `universal.sql`

---

## 📋 Medio prazo

### Testes (gap de cobertura)
- [ ] `BookingSlidePanel` componente
- [ ] `RescheduleWizard` componente
- [ ] `useDashboardData` hook
- [ ] `useNotifications` hook
- [ ] `usePushNotifications` hook
- [ ] `useGallery*` hooks (5 arquivos)
- [ ] `useNoShow` hook
- [ ] `lib/csv.ts` e `lib/xlsx.ts`
- [ ] `lib/whatsapp.ts`
- [ ] `lib/notifications.ts`
- [ ] `lib/api/mensalista.ts`
- [ ] `lib/api/templates.ts`
- [ ] `lib/api/services.ts`
- [ ] `BarberSettingsContext`

### Billing/SaaS
- [ ] Decidir: implementar ou deletar de vez os arquivos de billing
- [ ] Se implementar: criar ADR, completar `billing.ts`, `useSubscription.ts`, `SettingsPlano.tsx`
- [ ] Se deletar: remover `Pricing.tsx`, `SubscriptionGuard.tsx`, `SettingsPlano.tsx`, `billing.ts`

### Infra
- [ ] Adicionar `conftest.py` para testes Python (pytest)
- [ ] Configurar CI/CD para branch `staging`
- [ ] Adicionar testes visuais para WebKit (snapshots separados)
- [ ] considerar `chunkSizeWarningLimit` de 600 para 300-400 no vite.config

---

## ⚠️ Notas

- O hook `commit-msg` foi criado mas o repo nao tem git commits ainda nesta sessao — fazer commit das alteracoes antes de push
- Os testes E2E no WebKit falharam por falta de `.env` — com Supabase configurado devem passar
- `MASK_SENSITIVE_DATA` flag continua ativa em 8+ arquivos — util para gravacao de video, mas code smell
- A funcao `criar_agendamento` no `universal.sql` e a versao correta; `migrations/003_functions.sql` ja tinha a versao correta com cupom
