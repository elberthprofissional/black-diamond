# FUNCIONALIDADES NOVAS — BLACK DIAMOND

**Versão:** 4.0.0 | **Data:** Julho 2026

---

## Sumario

1. [Visao Geral](#1-visao-geral)
2. [Programa de Fidelidade](#2-programa-de-fidelidade)
3. [Multi-Barbeiro](#3-multi-barbeiro)
4. [Cupons e Promocoes](#4-cupons-e-promocoes)
5. [Export CSV/PDF](#5-export-csvpdf)
6. [Marcacao Nao Compareceu](#6-marcacao-nao-compareceu)
7. [Taxa de Ocupacao](#7-taxa-de-ocupacao)
8. [Grafico de Faturamento](#8-grafico-de-faturamento)

---

## 1. Visao Geral

Essas 7 funcionalidades foram pensadas pra colocar o Black Diamond no mesmo nivel do App Barber (que cobra R$80-220/mes), mas de forma 100% gratuita.

### O que muda

| Recurso | Status atual | Depois |
|---------|-------------|--------|
| Programa de fidelidade | ❌ | ✅ |
| Multi-barbeiro | ❌ | ✅ |
| Cupons/Promocoes | ❌ | ✅ |
| Export CSV/PDF | ❌ | ✅ |
| Marcacao nao compareceu | ❌ | ✅ |
| Taxa de ocupacao | ❌ | ✅ |
| Grafico de faturamento | ❌ | ✅ |

### Tecnologias utilizadas

- **Frontend:** React + TypeScript + Tailwind CSS + Framer Motion
- **Backend:** Supabase (PostgreSQL + RPCs)
- **Testes:** Vitest + Playwright
- **Custo:** R$0 (tudo roda no Supabase Free Tier)

---

## 2. Programa de Fidelidade

### O que e

Barbeiro cria regras de pontos. Cliente acumula e troca por servico gratis.

### Configuracao no admin

```
Programa de Fidelidade
─────────────────────────────────────
Regra: A cada [3] cortes, ganhe [1] gratis
Servico gratis: [Corte de Cabelo]
─────────────────────────────────────
[Ativar]  [Desativar]
```

### Fluxo do cliente

1. Cliente agenda → ve barra de progresso (2/3 estrelas)
2. Barbeiro conclui atendimento → sistema soma ponto
3. Cliente atinge meta → proximo servico e gratis
4. Cliente usa gratuidade → pontos resetam

### Experiencia no agendamento

```
Joao Silva - Corte + Barba - R$85
─────────────────────────────────────
Seus pontos: 2/3 ⭐⭐☆
Proximo corte gratis!
```

### Experiencia ao atingir meta

```
Joao Silva - Corte - R$45
─────────────────────────────────────
CLIENTE VIP - 1 corte gratis disponivel!
Servicos: [✓] Corte de Cabelo (GRATIS)
[ ] Barba (+R$40)
─────────────────────────────────────
Total: R$0,00
```

### Regras configuraveis

| Campo | O que define |
|-------|-------------|
| Quantidade de cortes | 2, 3, 5, 10... |
| Servico gratis | Qualquer um do catalogo |
| Reset | Mensal, anual ou nunca |

### Schema do banco

```sql
-- Tabela de configuracao do programa
CREATE TABLE loyalty_program (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  required_visits INTEGER NOT NULL DEFAULT 3,
  free_service_id UUID REFERENCES services(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de pontos por cliente
CREATE TABLE loyalty_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  current_points INTEGER DEFAULT 0,
  total_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id)
);

-- Historico de resgates
CREATE TABLE loyalty_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  booking_id UUID REFERENCES bookings(id),
  service_id UUID REFERENCES services(id),
  points_used INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### RPCs

```sql
-- Adicionar ponto apos concluir agendamento
CREATE OR REPLACE FUNCTION add_loyalty_point(p_client_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO loyalty_points (client_id, current_points, total_earned)
  VALUES (p_client_id, 1, 1)
  ON CONFLICT (client_id)
  DO UPDATE SET
    current_points = loyalty_points.current_points + 1,
    total_earned = loyalty_points.total_earned + 1;
END;
$$ LANGUAGE plpgsql;

-- Verificar se cliente tem ponto gratis disponivel
CREATE OR REPLACE FUNCTION check_loyalty_reward(p_client_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_required INTEGER;
  v_current INTEGER;
BEGIN
  SELECT required_visits INTO v_required FROM loyalty_program WHERE is_active = true LIMIT 1;
  SELECT current_points INTO v_current FROM loyalty_points WHERE client_id = p_client_id;

  RETURN COALESCE(v_current, 0) >= COALESCE(v_required, 999);
END;
$$ LANGUAGE plpgsql;

-- Resgatar ponto gratis
CREATE OR REPLACE FUNCTION redeem_loyalty_reward(
  p_client_id UUID,
  p_booking_id UUID,
  p_service_id UUID
)
RETURNS VOID AS $$
BEGIN
  -- Descontar pontos
  UPDATE loyalty_points
  SET current_points = current_points - (SELECT required_visits FROM loyalty_program WHERE is_active = true LIMIT 1)
  WHERE client_id = p_client_id;

  -- Registrar resgate
  INSERT INTO loyalty_rewards (client_id, booking_id, service_id, points_used)
  VALUES (p_client_id, p_booking_id, p_service_id, 1);
END;
$$ LANGUAGE plpgsql;
```

### Componentes

| Arquivo | Funcao |
|---------|--------|
| `src/hooks/useLoyalty.ts` | Hook principal (pontos, regras, resgate) |
| `src/components/Admin/settings/SettingsFidelidade.tsx` | Painel de configuracao no admin |
| `src/components/Booking/ServiceStep.tsx` | Barra de progresso no agendamento do cliente |
| `src/components/Admin/shared/ClientPanel.tsx` | Exibe pontos do cliente no painel |

### Tests

- Verificar se ponto e adicionado apos completar agendamento
- Verificar se alerta aparece quando atinge meta
- Verificar se resgate funciona e zera pontos
- Verificar se regras configuraveis funcionam

---

## 3. Multi-Barbeiro

### O que e

Varios barbeiros no mesmo sistema, cada um com sua agenda, comissao e relatorio.

### Configuracao no admin

```
Profissionais
─────────────────────────────────────
+ Adicionar profissional

┌─────────────────────────────────┐
│ Carlos - Principal              │
│ Comissao: 40%                   │
│ Horarios: Seg-Sex 9h-19h       │
│ [Editar] [Desativar]           │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ Pedro - Secundario              │
│ Comissao: 35%                   │
│ Horarios: Seg-Sex 10h-18h      │
│ [Editar] [Desativar]           │
└─────────────────────────────────┘
```

### Dashboard do dono (todos os barbeiros)

```
Dashboard - Hoje (15/07)
─────────────────────────────────────
Carlos: 6 atendimentos | R$510
Pedro: 4 atendimentos | R$320
─────────────────────────────────────
Total do dia: R$830
```

### Dashboard do barbeiro (só ele)

```
Minha Agenda - Hoje
─────────────────────────────────────
09:00 - Joao Silva - Corte ✅
10:00 - Pedro Santos - Barba ✅
11:00 - (vago)
14:00 - Lucas Oliveira - Corte + Barba
15:00 - (vago)
```

### Agendamento do cliente

**Cliente escolhe barbeiro:**

```
1. Escolha o profissional
─────────────────────────────────────
[Carlos] ⭐⭐⭐⭐⭐ (120 avaliacoes)
[Pedro]  ⭐⭐⭐⭐ (45 avaliacoes)

2. Escolha o servico
─────────────────────────────────────
Corte - R$45
Barba - R$40
Corte + Barba - R$85
```

### Transferencia de agendamento

```
Meus agendamentos - 15/07
─────────────────────────────────────
14:00 - Lucas Oliveira - Corte + Barba
        [Transferir para outro profissional]
─────────────────────────────────────
Selecionar: [Carlos] [Pedro]
[Confirmar transferencia]
```

### Relatorio de comissao

```
Julho/2026 - Carlos
─────────────────────────────────────
Atendimentos: 85
Faturamento: R$7.225
Comissao (40%): R$2.890
```

### Schema do banco

```sql
-- Tabela de barbeiros
CREATE TABLE barbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  commission DECIMAL(5,2) DEFAULT 0,
  working_days JSONB DEFAULT '{"mon":true,"tue":true,"wed":true,"thu":true,"fri":true,"sat":true}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Vincular agendamento ao barbeiro
ALTER TABLE bookings ADD COLUMN barber_id UUID REFERENCES barbers(id);

-- Tabela de comissoes (historico)
CREATE TABLE barber_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id UUID REFERENCES barbers(id),
  booking_id UUID REFERENCES bookings(id),
  amount DECIMAL(10,2),
  commission_rate DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### RPCs

```sql
-- Criar agendamento vinculado ao barbeiro
CREATE OR REPLACE FUNCTION criar_agendamento_multi(
  p_client_id UUID,
  p_service_ids UUID[],
  p_booking_date DATE,
  p_booking_time TIME,
  p_barber_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_booking_id UUID;
BEGIN
  -- Criar agendamento
  INSERT INTO bookings (client_id, service_ids, booking_date, booking_time, barber_id, status)
  VALUES (p_client_id, p_service_ids, p_booking_date, p_booking_time, p_barber_id, 'confirmed')
  RETURNING id INTO v_booking_id;

  -- Calcular comissao
  INSERT INTO barber_commissions (barber_id, booking_id, amount, commission_rate)
  SELECT
    p_barber_id,
    v_booking_id,
    SUM(s.price),
    (SELECT commission FROM barbers WHERE id = p_barber_id)
  FROM services s
  WHERE s.id = ANY(p_service_ids);

  RETURN v_booking_id;
END;
$$ LANGUAGE plpgsql;

-- Buscar agendamentos por barbeiro
CREATE OR REPLACE FUNCTION get_bookings_by_barber(
  p_barber_id UUID,
  p_date DATE
)
RETURNS TABLE (
  id UUID,
  client_name TEXT,
  service_names TEXT[],
  booking_time TIME,
  total_price DECIMAL,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    c.name,
    ARRAY(SELECT s.name FROM services s WHERE s.id = ANY(b.service_ids)),
    b.booking_time,
    b.total_price,
    b.status
  FROM bookings b
  JOIN clients c ON c.id = b.client_id
  WHERE b.barber_id = p_barber_id
  AND b.booking_date = p_date
  AND b.status != 'cancelled'
  ORDER BY b.booking_time;
END;
$$ LANGUAGE plpgsql;
```

### Componentes

| Arquivo | Funcao |
|---------|--------|
| `src/hooks/useBarbers.ts` | Hook de barbeiros |
| `src/components/Admin/settings/SettingsBarbers.tsx` | Gerenciamento de barbeiros |
| `src/components/Booking/BarberStep.tsx` | Selecao de barbeiro pelo cliente |
| `src/pages/AdminDashboard.tsx` | Dashboard multi-barbeiro |
| `src/pages/AdminBarberProfile.tsx` | Relatorio individual por barbeiro |

### Permissoes

| Acao | Dono | Barbeiro |
|------|------|----------|
| Ver agenda | Todos | So dele |
| Criar agendamento | ✅ | ✅ |
| Completar | ✅ | ✅ |
| Ver faturamento | Todos | So dele |
| Ver comissao | ✅ | So dele |
| Configurar sistema | ✅ | ❌ |

### Tests

- Verificar se barbeiro so ve sua agenda
- Verificar se transferencia funciona
- Verificar se comissao e calculada corretamente
- Verificar se relatorio mostra dados corretos

---

## 4. Cupons e Promocoes

### O que e

Barbeiro cria cupons de desconto. Cliente usa no agendamento.

### Configuracao no admin

```
Cupons de Desconto
─────────────────────────────────────
+ Criar cupom

┌─────────────────────────────────┐
│ CORTESQ10 - 10% OFF            │
│ Tipo: Porcentagem              │
│ Valor: 10%                     │
│ Valido ate: 31/12/2026         │
│ Usos: 5/100                    │
│ [Editar] [Desativar]           │
└─────────────────────────────────┘
```

**Criar novo cupom:**

```
Novo Cupom
─────────────────────────────────────
Codigo: [CORTESQ10]
Tipo: [% Desconto] [R$ Fixo] [Servico Gratis]
Valor: [10]%
Servicos validos: [Todos]
Limite de usos: [100]
Valido ate: [31/12/2026]
Minimo: [R$0]
─────────────────────────────────────
[Salvar]
```

### Tipos de cupom

| Tipo | Exemplo | Resultado |
|------|---------|-----------|
| Porcentagem | 10% OFF | R$85 → R$76,50 |
| Fixo | R$20 OFF | R$85 → R$65 |
| Servico gratis | Barba gratis | Corte+Barba → R$45 (so corte) |

### Cliente usa no agendamento

**Tela de revisao:**

```
Resumo do Agendamento
─────────────────────────────────────
Corte + Barba .............. R$85,00
─────────────────────────────────────
Cupom: [CORTESQ10] [Aplicar]
─────────────────────────────────────
Desconto (10%) ............ -R$8,50
─────────────────────────────────────
Total ...................... R$76,50
```

**Cupom aplicado:**

```
Resumo do Agendamento
─────────────────────────────────────
Corte + Barba .............. R$85,00
Cupom CORTESQ10 ........... -R$8,50
─────────────────────────────────────
Total ...................... R$76,50
```

### Admin ve uso

```
Relatorio de Cupons - Julho/2026
─────────────────────────────────────
CORTESQ10 - 12 usos - R$102 desconto
BARBA50 - 3 usos - R$120 desconto
─────────────────────────────────────
Total de descontos: R$222
```

### Exemplo de uso

Barbeiro quer fazer promocao de Natal:

```
Cupom: NATAL2026
Tipo: 15% OFF
Valido: 20/12 a 31/12
```

Barbeiro manda pros clientes:

```
Promocao de Natal!
Use o cupom NATAL2026 e ganhe
15% OFF em qualquer servico!

Valido ate 31/12.
Agende: [link]
```

### Schema do banco

```sql
-- Tabela de cupons
CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed', 'free_service')),
  discount_value DECIMAL(10,2) NOT NULL,
  service_id UUID REFERENCES services(id), -- NULL = todos os servicos
  max_uses INTEGER DEFAULT 100,
  current_uses INTEGER DEFAULT 0,
  min_booking_value DECIMAL(10,2) DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Historico de usos
CREATE TABLE coupon_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID REFERENCES coupons(id),
  client_id UUID REFERENCES clients(id),
  booking_id UUID REFERENCES bookings(id),
  discount_amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### RPCs

```sql
-- Validar cupom
CREATE OR REPLACE FUNCTION validate_coupon(
  p_code TEXT,
  p_booking_value DECIMAL
)
RETURNS TABLE (
  valid BOOLEAN,
  coupon_id UUID,
  discount_type TEXT,
  discount_value DECIMAL,
  discount_amount DECIMAL,
  message TEXT
) AS $$
DECLARE
  v_coupon coupons%ROWTYPE;
  v_discount DECIMAL;
BEGIN
  -- Buscar cupom
  SELECT * INTO v_coupon
  FROM coupons
  WHERE code = UPPER(p_code)
  AND is_active = true
  AND (expires_at IS NULL OR expires_at > now())
  AND current_uses < max_uses;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::DECIMAL, NULL::DECIMAL, 'Cupom invalido ou expirado'::TEXT;
    RETURN;
  END IF;

  -- Verificar valor minimo
  IF p_booking_value < v_coupon.min_booking_value THEN
    RETURN QUERY SELECT false, v_coupon.id, NULL::TEXT, NULL::DECIMAL, NULL::DECIMAL,
      format('Valor minimo: R$ %s', v_coupon.min_booking_value)::TEXT;
    RETURN;
  END IF;

  -- Calcular desconto
  CASE v_coupon.discount_type
    WHEN 'percentage' THEN
      v_discount := p_booking_value * (v_coupon.discount_value / 100);
    WHEN 'fixed' THEN
      v_discount := LEAST(v_coupon.discount_value, p_booking_value);
    WHEN 'free_service' THEN
      v_discount := (SELECT price FROM services WHERE id = v_coupon.service_id);
  END CASE;

  RETURN QUERY SELECT
    true,
    v_coupon.id,
    v_coupon.discount_type,
    v_coupon.discount_value,
    v_discount,
    format('Desconto de R$ %s aplicado!', v_discount)::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Aplicar cupom no agendamento
CREATE OR REPLACE FUNCTION apply_coupon(
  p_coupon_id UUID,
  p_client_id UUID,
  p_booking_id UUID,
  p_discount_amount DECIMAL
)
RETURNS VOID AS $$
BEGIN
  -- Incrementar uso do cupom
  UPDATE coupons SET current_uses = current_uses + 1 WHERE id = p_coupon_id;

  -- Registrar uso
  INSERT INTO coupon_uses (coupon_id, client_id, booking_id, discount_amount)
  VALUES (p_coupon_id, p_client_id, p_booking_id, p_discount_amount);
END;
$$ LANGUAGE plpgsql;
```

### Componentes

| Arquivo | Funcao |
|---------|--------|
| `src/hooks/useCoupons.ts` | Hook principal |
| `src/components/Admin/settings/SettingsCupons.tsx` | Gerenciamento de cupons |
| `src/components/Booking/CouponInput.tsx` | Input de cupom no agendamento |
| `src/components/Admin/shared/CouponBadge.tsx` | Badge de cupom aplicado |

### Tests

- Verificar se cupom valido e aceito
- Verificar se cupom expirado e rejeitado
- Verificar se cupom com limite atingido e rejeitado
- Verificar se desconto e calculado corretamente
- Verificar se uso e registrado no historico

---

## 5. Export CSV/PDF

### O que e

Barbeiro baixa relatorios em CSV (Excel) ou PDF (impressao).

### Onde aparece

**Tela de relatorios:**

```
Relatorios
─────────────────────────────────────
[Exportar CSV]  [Exportar PDF]
```

### Tipos de relatorio

**1. Faturamento:**

```
Relatorio de Faturamento
─────────────────────────────────────
Periodo: [Julho/2026]
[CSV]  [PDF]
```

Conteudo CSV:

```
Data,Servico,Cliente,Valor,Barbeiro
01/07,Corte,Joao Silva,45,Carlos
01/07,Barba,Pedro Santos,40,Carlos
02/07,Corte + Barba,Lucas Oliveira,85,Pedro
```

**2. Clientes:**

```
Relatorio de Clientes
─────────────────────────────────────
Filtro: [Todos] [Ativos] [Inativos]
[CSV]  [PDF]
```

Conteudo CSV:

```
Nome,Telefone,Visitas,Total Gasto,Ultima Visita,Status
Joao Silva,(31)99999-1234,12,480,15/07/2026,Ativo
Pedro Santos,(31)98888-5678,3,120,01/06/2026,Inativo
```

**3. Comissao (multi-barbeiro):**

```
Relatorio de Comissao - Julho/2026
─────────────────────────────────────
Barbeiro: [Carlos]
[CSV]  [PDF]
```

Conteudo CSV:

```
Data,Cliente,Servico,Valor,Comissao
01/07,Joao Silva,Corte,45,18
02/07,Pedro Santos,Barba,40,16
```

**4. Avaliacoes:**

```
Relatorio de Avaliacoes
─────────────────────────────────────
Periodo: [Julho/2026]
[CSV]  [PDF]
```

Conteudo CSV:

```
Data,Cliente,Nota,Comentario
01/07,Joao Silva,5,Otimo atendimento
02/07,Pedro Santos,4,Bom mas demorou
```

### PDF formatado

```
┌─────────────────────────────────┐
│     BLACK DIAMOND               │
│     Relatorio de Faturamento    │
│     Julho/2026                  │
├─────────────────────────────────┤
│ Data    Servico     Valor       │
│ 01/07   Corte       R$45,00     │
│ 01/07   Barba       R$40,00     │
│ 02/07   Corte+Barba R$85,00     │
├─────────────────────────────────┤
│ Total: R$170,00                 │
│ Media: R$56,67/dia             │
└─────────────────────────────────┘
```

### Schema do banco

Nao precisa de tabelas novas. E so query nos dados existentes.

### Componentes

| Arquivo | Funcao |
|---------|--------|
| `src/hooks/useExport.ts` | Hook de exportacao |
| `src/components/Admin/shared/ExportButton.tsx` | Botao de exportar |
| `src/lib/export/csv.ts` | Gerador de CSV |
| `src/lib/export/pdf.ts` | Gerador de PDF |

### Tests

- Verificar se CSV e gerado corretamente
- Verificar se PDF e gerado corretamente
- Verificar se filtros funcionam
- Verificar se periodo e respeitado

---

## 6. Marcacao Nao Compareceu

### O que e

Barbeiro marca quando cliente falta. Sistema controla e bloqueia se abusar.

### No dashboard do dia

```
Agenda - 15/07/2026
─────────────────────────────────────
09:00 - Joao Silva - Corte
        [Feito] [Faltou]

10:00 - Pedro Santos - Barba
        [Feito] [Faltou]
```

Barbeiro clica em "Faltou" e acabou.

### No perfil do cliente

```
Joao Silva - (31) 99999-1234
─────────────────────────────────────
Visitas: 12
Faltas: 2
Ultima visita: 15/07/2026
─────────────────────────────────────
Historico:
15/07 - Corte - ✅
08/07 - Corte - ❌ FALTA
01/07 - Corte - ✅
25/06 - Corte - ❌ FALTA
```

### Regras de bloqueio

**Configuracao:**

```
Controle de Faltas
─────────────────────────────────────
Bloquear apos: [3] faltas
Periodo de analise: [90] dias
Aviso ao cliente: [Sim]
─────────────────────────────────────
```

**Cliente com muitas faltas tenta agendar:**

```
Agendamento Bloqueado
─────────────────────────────────────
Voce possui 3 faltas nos ultimos
90 dias.

Para agendar novamente, entre
em contato com a barbearia.

[WhatsApp da Barbearia]
```

### Notificacao pro barbeiro

```
Cliente faltou
─────────────────────────────────────
Joao Silva nao compareceu
hoje as 09:00.

Faltas deste cliente: 3
─────────────────────────────────────
[Ver perfil]
```

### Schema do banco

```sql
-- Adicionar coluna de falta
ALTER TABLE bookings ADD COLUMN no_show BOOLEAN DEFAULT FALSE;

-- Query pra contar faltas
CREATE OR REPLACE FUNCTION count_client_no_shows(
  p_client_id UUID,
  p_days INTEGER DEFAULT 90
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM bookings
  WHERE client_id = p_client_id
  AND no_show = TRUE
  AND booking_date > NOW() - (p_days || ' days')::INTERVAL;

  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Verificar se cliente esta bloqueado
CREATE OR REPLACE FUNCTION is_client_blocked(p_client_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_max_faltas INTEGER := 3;
  v_faltas INTEGER;
BEGIN
  v_faltas := count_client_no_shows(p_client_id);
  RETURN v_faltas >= v_max_faltas;
END;
$$ LANGUAGE plpgsql;
```

### Componentes

| Arquivo | Funcao |
|---------|--------|
| `src/hooks/useNoShow.ts` | Hook de marcar falta |
| `src/components/Admin/shared/NoShowButton.tsx` | Botao de marcar falta |
| `src/components/Admin/shared/ClientPanel.tsx` | Exibe faltas do cliente |
| `src/components/Booking/BookingPage.tsx` | Bloqueio de agendamento |

### Tests

- Verificar se falta e registrada
- Verificar se contador de faltas funciona
- Verificar se bloqueio apos 3 faltas funciona
- Verificar se historico mostra faltas

---

## 7. Taxa de Ocupacao

### O que e

Metrica de quantos % dos horarios disponiveis foram ocupados.

### No dashboard

```
Performance - Julho/2026
─────────────────────────────────────
Taxa de ocupacao: 72% ████████░░

Horarios disponiveis: 180
Horarios ocupados: 130
Horarios vagos: 50
```

### Grafico semanal

```
Ocupacao por dia
─────────────────────────────────────
Seg ████████████░░ 85%
Ter ██████████░░░░ 70%
Qua █████████████░ 90%
Qui ████████░░░░░░ 55%
Sex ██████████████ 95%
Sab ██████████████ 100%
─────────────────────────────────────
Media: 82%
```

### Insights automaticos

```
Insights
─────────────────────────────────────
* Quinta e seu dia mais vago (55%)
* Sabado sempre lota (100%)
* Esta semana 35 horarios vagos
* Ultimo mes: 72% (bom!)
```

### Como calcula

```
Formula:
Ocupados / Total x 100 = Taxa

Exemplo:
130 atendimentos / 180 horarios = 72%
```

### Por periodo

```
Taxa de Ocupacao
─────────────────────────────────────
[Hoje] [Semana] [Mes] [Ano]

Mes: Julho/2026
72% ████████████████████░░░░░░░░░░
```

### Schema do banco

Nao precisa de tabelas novas. E so query:

```sql
-- Query de ocupacao
CREATE OR REPLACE FUNCTION get_occupation_rate(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  total_slots BIGINT,
  occupied_slots BIGINT,
  free_slots BIGINT,
  occupation_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_slots,
    COUNT(CASE WHEN b.id IS NOT NULL AND b.status != 'cancelled' THEN 1 END) as occupied_slots,
    COUNT(CASE WHEN b.id IS NULL THEN 1 END) as free_slots,
    ROUND(
      COUNT(CASE WHEN b.id IS NOT NULL AND b.status != 'cancelled' THEN 1 END)::DECIMAL /
      GREATEST(COUNT(*), 1) * 100,
      1
    ) as occupation_rate
  FROM generate_series(p_start_date, p_end_date, '1 day'::INTERVAL) AS d
  CROSS JOIN generate_series(9, 18, 1) AS h
  LEFT JOIN bookings b ON b.booking_date = d.date
    AND b.booking_time = (h || ':00')::TIME
    AND b.status != 'cancelled'
  WHERE EXTRACT(DOW FROM d.date) NOT IN (0); -- Excluir domingo
END;
$$ LANGUAGE plpgsql;
```

### Componentes

| Arquivo | Funcao |
|---------|--------|
| `src/hooks/useOccupation.ts` | Hook de ocupacao |
| `src/components/Admin/shared/OccupationChart.tsx` | Grafico de barras |
| `src/pages/AdminDashboard.tsx` | Metrica no dashboard |

### Tests

- Verificar se taxa e calculada corretamente
- Verificar se excludes domingos
- Verificar se exclude cancelados
- Verificar se grafico renderiza

---

## 8. Grafico de Faturamento

### O que e

Visual bonito do faturamento diario/semanal/mensal.

### Dashboard

```
Faturamento - Julho/2026
─────────────────────────────────────
R$ 8.450,00 ████████████████████ +15% vs Junho

Diaria media: R$384,09
Melhor dia: Sab (R$650)
Pior dia: Qui (R$180)
```

### Grafico de barras

```
Faturamento Semanal
─────────────────────────────────────
     │
R$800│          ██
R$600│    ██    ██    ██
R$400│    ██    ██    ██    ██
R$200│    ██    ██    ██    ██
R$0  └────Seg───Ter───Qua───Qui────
           Sem 1  Sem 2  Sem 3  Sem 4
```

### Comparativo mensal

```
Comparativo
─────────────────────────────────────
       Junho    Julho    Variação
Total: R$7.200  R$8.450  +17% ↑
Media: R$342    R$384    +12% ↑
Pico:  R$580    R$650    +12% ↑
```

### Por servico

```
Faturamento por Servico
─────────────────────────────────────
Corte:       R$4.500 (53%) ████████████
Barba:       R$2.100 (25%) █████
Corte+Barba: R$1.850 (22%) ████
```

### Desktop vs Mobile

| Dispositivo | Experiencia |
|-------------|-------------|
| Desktop | Grafico grande, tabela detalhada, comparativo mes a mes |
| Mobile | Grafico simplificado, resumo do dia/semana |

**Desktop:**

```
Faturamento - Julho/2026
─────────────────────────────────────────
      │
R$800 │          ██
R$600 │    ██    ██    ██
R$400 │    ██    ██    ██    ██
R$200 │    ██    ██    ██    ██
R$0   └────Seg───Ter───Qua───Qui────

Total: R$8.450  |  Media: R$384/dia
Comparativo: +15% vs Junho ↑
```

**Mobile:**

```
Faturamento - Julho/2026
─────────────────────
Total: R$8.450
Media: R$384/dia
+15% vs Junho ↑

[Grafico compacto]
```

### Schema do banco

```sql
-- Query de faturamento diario
CREATE OR REPLACE FUNCTION get_daily_revenue(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  revenue_date DATE,
  total_revenue DECIMAL,
  booking_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.booking_date,
    SUM(b.total_price),
    COUNT(*)
  FROM bookings b
  WHERE b.status = 'completed'
  AND b.booking_date BETWEEN p_start_date AND p_end_date
  GROUP BY b.booking_date
  ORDER BY b.booking_date;
END;
$$ LANGUAGE plpgsql;

-- Query de faturamento por servico
CREATE OR REPLACE FUNCTION get_revenue_by_service(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  service_name TEXT,
  total_revenue DECIMAL,
  booking_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.name,
    SUM(b.total_price),
    COUNT(*)
  FROM bookings b
  JOIN services s ON s.id = ANY(b.service_ids)
  WHERE b.status = 'completed'
  AND b.booking_date BETWEEN p_start_date AND p_end_date
  GROUP BY s.name
  ORDER BY SUM(b.total_price) DESC;
END;
$$ LANGUAGE plpgsql;

-- Query de comparativo mensal
CREATE OR REPLACE FUNCTION get_monthly_comparison()
RETURNS TABLE (
  month_name TEXT,
  total_revenue DECIMAL,
  avg_daily DECIMAL,
  max_daily DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    TO_CHAR(b.booking_date, 'Month') as month_name,
    SUM(b.total_price),
    ROUND(SUM(b.total_price) / COUNT(DISTINCT b.booking_date), 2),
    MAX(daily.total)
  FROM bookings b
  JOIN (
    SELECT booking_date, SUM(total_price) as total
    FROM bookings
    WHERE status = 'completed'
    GROUP BY booking_date
  ) daily ON daily.booking_date = b.booking_date
  WHERE b.status = 'completed'
  AND b.booking_date >= NOW() - INTERVAL '6 months'
  GROUP BY TO_CHAR(b.booking_date, 'Month'), DATE_TRUNC('month', b.booking_date)
  ORDER BY DATE_TRUNC('month', b.booking_date);
END;
$$ LANGUAGE plpgsql;
```

### Componentes

| Arquivo | Funcao |
|---------|--------|
| `src/hooks/useRevenue.ts` | Hook de faturamento |
| `src/components/Admin/shared/RevenueChart.tsx` | Grafico de barras |
| `src/components/Admin/shared/RevenueSummary.tsx` | Resumo numerico |
| `src/components/Admin/shared/RevenueComparison.tsx` | Comparativo mensal |
| `src/pages/AdminProfile.tsx` | Pagina de relatorios |

### Tests

- Verificar se faturamento diario e calculado corretamente
- Verificar se so conta bookings completed
- Verificar se comparativo mensal funciona
- Verificar se grafico renderiza
- Verificar se mobile mostra versao simplificada

---

## Resumo Final

| # | Funcionalidade | Status | Prioridade |
|---|---------------|--------|-----------|
| 1 | Programa de Fidelidade | A implementar | Alta |
| 2 | Multi-Barbeiro | A implementar | Alta |
| 3 | Cupons e Promocoes | A implementar | Media |
| 4 | Export CSV/PDF | A implementar | Media |
| 5 | Marcacao Nao Compareceu | A implementar | Alta |
| 6 | Taxa de Ocupacao | A implementar | Media |
| 7 | Grafico de Faturamento | A implementar | Alta |

### Impacto no preco

| Funcionalidade | Preco atual | Preco depois |
|---------------|-------------|--------------|
| Setup | R$300-500 | R$500-800 |
| Mensal | R$50-100 | R$100-200 |
| Multi-barbeiro | - | +R$50-100/barbeiro |

### Comparativo com App Barber

| Recurso | App Barber | Black Diamond |
|---------|------------|---------------|
| Preco | R$80-220/mes | R$100-200/mes |
| Fidelidade | ✅ | ✅ |
| Multi-barbeiro | ✅ | ✅ |
| Cupons | ✅ | ✅ |
| Export | ✅ | ✅ |
| Nao compareceu | ✅ | ✅ |
| Ocupacao | ✅ | ✅ |
| Faturamento | ✅ | ✅ |
| WhatsApp | ❌ | ✅ |
| PWA | ❌ | ✅ |
| Deploy separado | ❌ | ✅ |

**Vantagem do Black Diamond:** WhatsApp integrado, PWA instalavel, deploy separado por barbearia, custo zero de infraestrutura.

---

*Documento atualizado em Julho 2026. Versao planejada: 4.0.0*
