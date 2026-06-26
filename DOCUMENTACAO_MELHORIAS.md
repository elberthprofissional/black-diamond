
---

### 1.3 Configurar Google Calendar (Opcional)

**Passo 1:** Criar projeto no Google Cloud Console
1. Acesse https://console.cloud.google.com
2. Crie projeto "Black Diamond Calendar"
3. Ative a Google Calendar API

**Passo 2:** Criar OAuth Credentials
1. APIs & Services → Credentials → Create → OAuth 2.0 Client ID
2. Application type: Web application
3. Copie Client ID e Client Secret

**Passo 4:** Configurar secrets no Supabase:
```bash
supabase secrets set GOOGLE_CLIENT_ID=<seu_client_id>
supabase secrets set GOOGLE_CLIENT_SECRET=<seu_client_secret>
supabase secrets set GOOGLE_REFRESH_TOKEN=<seu_refresh_token>
```

**Passo 5:** Deploy da edge function:
```bash
supabase functions deploy sync-google-calendar
```

---

## PARTE 2: Melhorias de UX (código)

### 2.1 Botão "Concluir" mais rápido

**Problema:** São 3 cliques pra concluir atendimento (clicar no agendamento → abrir painel → clicar "Concluir").

**Solução:** Adicionar botão de check direto na lista de agendamentos.

**Onde modificar:** `src/pages/AdminDashboard.tsx`, linha ~200, adicionar um botão de check ao lado do WhatsAppReminderButton:

```tsx
{booking.status !== 'completed' && (
  <button
    onClick={(e) => { e.stopPropagation(); setCompletingBooking(booking); }}
    className="p-2.5 text-zinc-500 hover:text-emerald-500 transition-colors shrink-0"
    title="Concluir atendimento"
  >
    <Check size={14} />
  </button>
)}
```

---

### 2.2 Faturamento semanal no Dashboard

**Problema:** Barbeiro precisa ir em "Perfil" pra ver faturamento.

**Solução:** Adicionar card de faturamento semanal já no dashboard.

**Onde modificar:** `src/pages/AdminDashboard.tsx`, após o card "Lucro do Dia" (linha ~173):

Adicionar state e cálculo:
```tsx
const weeklyRevenue = bookings
  .filter(b => b.status === 'completed' || b.status === 'confirmed')
  .reduce((sum, b) => sum + (b.total_price || 0), 0);
```

Adicionar card visual:
```tsx
<div className="bg-[#111111] border border-white/5 py-3 px-4 rounded-2xl flex flex-col items-start">
  <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.15em]">Lucro Semanal</span>
  <span className="text-sm font-black text-[#C5A059] tabular-nums">R$ {weeklyRevenue.toFixed(0)}</span>
</div>
```

---

### 2.3 Busca de clientes

**Problema:** Lista de clientes pode ficar lenta com muitos registros.

**O campo de busca já existe** no código (`searchTerm` state + filtro na linha ~167). Só precisa garantir que o input de busca tá visível e acessível. Verificar se `AdminClients.tsx` tem o campo de busca renderizado no mobile.

---

### 2.4 Aba rápida com dias da semana

**Problema:** Barbeiro precisa navegar pra ver outros dias.

**Solução:** Adicionar abas com os 6 dias da semana no topo do dashboard.

**Onde modificar:** `src/pages/AdminDashboard.tsx`, adicionar acima dos FilterTabs:

```tsx
<div className="flex gap-2 overflow-x-auto pb-2">
  {getNextDays().map(day => (
    <button
      key={day.fullDate}
      onClick={() => setSelectedDate(day.fullDate)}
      className={`px-3 py-2 rounded-lg text-[10px] font-bold uppercase shrink-0 ${
        selectedDate === day.fullDate
          ? 'bg-[#C5A059] text-black'
          : 'bg-white/[0.04] text-zinc-500 hover:text-white'
      }`}
    >
      {day.dayName} {day.dayNumber}
    </button>
  ))}
</div>
```

---

## PARTE 3: Checklist Rápido

### O que rodar AGORA (5 min):
- [ ] Colar seção 19 + 20 do SQL no Supabase Editor → Run
- [ ] Colar seção 21 do SQL → Run

### O que configurar DEPOIS (30 min):
- [ ] Google Cloud Console → projeto + Calendar API
- [ ] OAuth credentials → Client ID + Secret
- [ ] `supabase secrets set GOOGLE_CLIENT_ID=...`
- [ ] `supabase secrets set GOOGLE_CLIENT_SECRET=...`
- [ ] `supabase secrets set GOOGLE_REFRESH_TOKEN=...`
- [ ] `supabase functions deploy sync-google-calendar`

### Melhorias de UX (1-2h):
- [ ] Botão check direto na lista de agendamentos
- [ ] Card de faturamento semanal no dashboard
- [ ] Aba rápida com dias da semana

---

*Documento gerado em 26/06/2026. Versão: 2.1.0*
