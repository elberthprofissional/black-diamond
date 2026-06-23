# Padroes de Mensagem — Black Diamond

Todos os padroes de mensagem que o barbeiro recebe ou envia pelo sistema.

---

## 1. Novo Agendamento (Cliente -> Barbeiro)

Quando um cliente agenda pelo site (`/agendar`), o sistema envia uma mensagem formatada pro WhatsApp do barbeiro:

```
*NOVO AGENDAMENTO - BLACK DIAMOND*

*Cliente:* Joao Silva
*Servico:* Corte de Cabelo, Barba
*Data:* 25/06/2026
*Horario:* 14:00
*Valor:* R$ 62
```

**Onde:** BookingPage.tsx, apos confirmacao do agendamento
**Para:** Numero configurado em `VITE_SUPPORT_WHATSAPP`

---

## 2. Lembrete de Confirmacao (Barbeiro -> Cliente)

Modelo usado quando o barbeiro quer confirmar o horário com o cliente:

```
Fala, {nome}! Beleza? Passando para lembrar do seu horario as {hora} hoje no Black Diamond. Confirmado? 💈
```

**Onde:** WhatsAppReminderButton.tsx (template "confirm")
**Variaveis:** `{nome}` = primeiro nome do cliente, `{hora}` = horario do agendamento

---

## 3. Alerta de Atraso (Barbeiro -> Cliente)

Modelo usado quando o cliente esta atrasado pro horario:

```
Fala, {nome}! Beleza? Notei que voce esta um pouco atrasado para o seu horario das {hora}. Esta tudo bem? 💈
```

**Onde:** WhatsAppReminderButton.tsx (template "delay")

---

## 4. Agradecimento Pos-Corte (Barbeiro -> Cliente)

Modelo usado apos o atendimento ser concluido:

```
Fala, {nome}! Obrigado pela preferencia hoje no Black Diamond. Espero que tenha gostado do corte! Ate a proxima! 💈
```

**Onde:** WhatsAppReminderButton.tsx (template "thanks")

---

## 5. Lembrete Semanal — Terca (Barbeiro -> Cliente)

Mensagem automatica de lembrete para terca-feira:

```
E ai, {nome}! Beleza? 💈 Passando para lembrar de garantir seu horario para essa semana no Black Diamond. Nao deixe para a ultima hora! Agende aqui: {link}
```

**Onde:** AdminClients.tsx (template "tuesday")
**Variaveis:** `{nome}` = primeiro nome, `{link}` = URL do agendamento

---

## 6. Lembrete Semanal — Quinta (Barbeiro -> Cliente)

Mensagem automatica de lembrete para quinta-feira:

```
Fala, {nome}! O fim de semana esta chegando e a agenda esta lotando. 💈 Bora dar aquele trato no visual para o fim de semana? Garanta seu horario: {link}
```

**Onde:** AdminClients.tsx (template "thursday")

---

## 7. Lembrete Personalizado (Barbeiro -> Cliente)

Modelo padrao para lembretes avulsos:

```
Ola, {nome}! Tudo bem? Passando para lembrar de agendar seu horario conosco esta semana no Black Diamond! 💈 Garanta seu corte aqui: {link}
```

**Onde:** AdminClients.tsx (template "custom")

---

## 8. Sugestoes Inteligentes por Data (Barbeiro -> Cliente)

O sistema gera sugestoes automaticas baseadas no dia do ano:

| Periodo | Mensagem |
|---------|----------|
| Natal (15-25/12) | Feliz Natal, {nome}! 🎄 Aproveite o Natal pra se arrumar! Temos horarios disponiveis esta semana. Bora agendar? |
| Ano Novo (1-10/01) | Feliz Ano Novo, {nome}! 🎆 Comece o ano bem resolvido! Vamos agendar seu corte? |
| Carnaval (20-28/02) | E ai, {nome}! Carnaval ta chegando! 🎭 Bora deixar o visual afiado? Temos horarios essa semana! |
| Pos-Carnaval (1-10/03) | Ferias de Carnaval, {nome}! 🎉 Aproveita pra cuidar do visual. Vamos agendar? |
| Pascoa (1-15/04) | Pascoa, {nome}! 🐰 Aproveita o feriado pra se arrumar! Horarios disponiveis esta semana. |
| Dia das Maes (8-12/05) | Dia das Maes, {nome}! 👩 Agende-se pra ficar impecavel! Horarios disponiveis. |
| Dia dos Namorados (8-15/06) | Dia dos Namorados, {nome}! ❤️ Fique no ponto pra data! Bora agendar? |
| Dia da Patria (1-10/09) | Patriota, {nome}! 🇧🇷 Dia da Patria! Vamos agendar um corte especial? |
| Dia das Crianças (25-31/10) | Dia das Crianças, {nome}! 👶 Leve o pequeno pra cortar tambem! Horarios disponiveis. |
| Black Friday (15-30/11) | Black Friday, {nome}! 💰 Aproveite pra agendar com antecedencia. Vamos marcar? |
| Dia dos Pais (1-10/11) | Dia dos Pais, {nome}! 👨 Venha com o pai agendar! Horarios disponiveis. |
| Sem data especial | Temos horarios disponiveis esta semana! Bora agendar? |

**Onde:** AdminClients.tsx (funcao `getSmartSuggestion`)

---

## Resumo Rapido

| Tipo | De | Para | Quando |
|------|-----|------|--------|
| Novo agendamento | Sistema | Barbeiro | Cliente agenda no site |
| Confirmacao | Barbeiro | Cliente | Antes do horario |
| Atraso | Barbeiro | Cliente | Cliente atrasado |
| Agradecimento | Barbeiro | Cliente | Pos-corte |
| Lembrete terca | Barbeiro | Cliente | Terca-feira |
| Lembrete quinta | Barbeiro | Cliente | Quinta-feira |
| Lembrete avulso | Barbeiro | Cliente | Qualquer dia |
| Sugestao data | Barbeiro | Cliente | Data comemorativa |
