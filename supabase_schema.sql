-- =========================================================================
-- BLACK DIAMOND - UNIFIED DATABASE SCHEMA (SUPABASE / POSTGRESQL)
-- =========================================================================

-- 1. EXTENSIONS
-- Garante que o Supabase consiga gerar IDs únicos no formato UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABELA DE SERVIÇOS
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    duration INTEGER NOT NULL, -- em minutos
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABELA DE CLIENTES
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    email TEXT,
    notes TEXT, -- Observações de preferências (ex: estilo de corte, restrições)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABELA DE AGENDAMENTOS
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    service_ids UUID[] NOT NULL,
    booking_date DATE NOT NULL,
    booking_time TIME NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    total_duration INTEGER NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, confirmed, cancelled, completed
    is_blocked BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);



-- 5. TABELA DE CONFIGURAÇÕES (Horário de funcionamento, intervalo, etc.)
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Configurações padrão do horário de funcionamento
INSERT INTO settings (key, value) VALUES
    ('opening_time', '08:00'),
    ('closing_time', '20:00'),
    ('lunch_start', '12:00'),
    ('lunch_end', '13:00'),
    ('working_days', '1,2,3,4,5,6')
ON CONFLICT (key) DO NOTHING;

-- 6. TRAVA DE SEGURANÇA: IMPEDIR DUPLO AGENDAMENTO (CONFLITO DE HORÁRIO)
-- Garante que não existam dois agendamentos ativos na mesma data e hora.
DROP INDEX IF EXISTS idx_no_double_booking;
CREATE UNIQUE INDEX idx_no_double_booking 
ON bookings (booking_date, booking_time) 
WHERE (status != 'cancelled');

-- 7. VIEW DE FATURAMENTO DIÁRIO (Segurança Ativa)
-- Calcula o faturamento diário respeitando as regras de RLS do Supabase
CREATE OR REPLACE VIEW faturamento_diario 
WITH (security_invoker = true) AS
SELECT 
  booking_date,
  SUM(total_price) as total_arrecadado,
  COUNT(id) as total_cortes
FROM bookings
WHERE status = 'completed' OR status = 'confirmed'
GROUP BY booking_date
ORDER BY booking_date DESC;

-- 8. CARGA INICIAL DE SERVIÇOS (Sem duplicar registros se rodar o script novamente)
INSERT INTO services (name, price, duration, description)
SELECT name, price, duration, description FROM (VALUES
  ('Corte de Cabelo', 35.00, 40, 'Corte moderno e personalizado.'),
  ('Barba', 27.00, 20, 'Aparação e modelagem de barba.'),
  ('Barba com Toalha Quente', 30.00, 30, 'Experiência relaxante com toalha quente.'),
  ('Sobrancelha', 15.00, 10, 'Limpeza e design de sobrancelha.'),
  ('Pezinho', 15.00, 10, 'Acabamento perfeito.')
) AS temp_data(name, price, duration, description)
WHERE NOT EXISTS (
  SELECT 1 FROM services WHERE services.name = temp_data.name
);

-- 8. SEGURANÇA: ROW LEVEL SECURITY (RLS)
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- 9. POLÍTICAS DE ACESSO (RLS POLICIES)
-- =========================================================================

-- Serviços: Leitura pública para todos, gerenciamento para Admin autenticado
DROP POLICY IF EXISTS "Serviços leitura pública" ON services;
CREATE POLICY "Serviços leitura pública" ON services FOR SELECT USING (true);

DROP POLICY IF EXISTS "Serviços gerenciamento admin" ON services;
CREATE POLICY "Serviços gerenciamento admin" ON services FOR ALL TO authenticated USING ((auth.jwt() ->> 'email') = 'tato@gmail.com') WITH CHECK ((auth.jwt() ->> 'email') = 'tato@gmail.com');

-- Clientes: Apenas Admin autenticado (tato@gmail.com) pode ler, atualizar ou excluir clientes.
DROP POLICY IF EXISTS "Clientes inserção livre" ON clients;
DROP POLICY IF EXISTS "Clientes leitura pública" ON clients;
DROP POLICY IF EXISTS "Clientes atualização admin" ON clients;
DROP POLICY IF EXISTS "Clientes deleção admin" ON clients;
DROP POLICY IF EXISTS "Clientes leitura admin" ON clients;
DROP POLICY IF EXISTS "Clientes gerenciamento admin" ON clients;

CREATE POLICY "Clientes gerenciamento admin" ON clients FOR ALL TO authenticated USING ((auth.jwt() ->> 'email') = 'tato@gmail.com') WITH CHECK ((auth.jwt() ->> 'email') = 'tato@gmail.com');

-- Agendamentos: Apenas Admin autenticado (tato@gmail.com) tem acesso total.
-- Os clientes agendam usando a RPC segura `criar_agendamento` e consultam horários ocupados usando `get_occupied_slots`.
DROP POLICY IF EXISTS "Agendamentos inserção livre" ON bookings;
DROP POLICY IF EXISTS "Agendamentos leitura pública" ON bookings;
DROP POLICY IF EXISTS "Agendamentos atualização admin" ON bookings;
DROP POLICY IF EXISTS "Agendamentos deleção admin" ON bookings;
DROP POLICY IF EXISTS "Agendamentos leitura admin" ON bookings;
DROP POLICY IF EXISTS "Agendamentos gerenciamento admin" ON bookings;

CREATE POLICY "Agendamentos gerenciamento admin" ON bookings FOR ALL TO authenticated USING ((auth.jwt() ->> 'email') = 'tato@gmail.com') WITH CHECK ((auth.jwt() ->> 'email') = 'tato@gmail.com');

-- Configurações: Leitura pública para todos (horário de funcionamento), escrita apenas admin
DROP POLICY IF EXISTS "Configurações leitura pública" ON settings;
CREATE POLICY "Configurações leitura pública" ON settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Configurações gerenciamento admin" ON settings;
CREATE POLICY "Configurações gerenciamento admin" ON settings FOR ALL TO authenticated USING ((auth.jwt() ->> 'email') = 'tato@gmail.com') WITH CHECK ((auth.jwt() ->> 'email') = 'tato@gmail.com');



-- =========================================================================
-- 10. FUNÇÕES SEGURAS (RPC - SECURITY DEFINER)
-- Bypassam RLS para executar operações restritas de forma segura
-- =========================================================================

-- Função para criar agendamento de forma transacional e segura
CREATE OR REPLACE FUNCTION criar_agendamento(
    p_cliente_nome text,
    p_cliente_telefone text,
    p_servicos uuid[],
    p_data date,
    p_hora time,
    p_preco_total decimal,
    p_duracao_total integer
)
RETURNS jsonb AS $$
DECLARE
    v_client_id uuid;
    v_booking_id uuid;
    v_result jsonb;
    v_daily_bookings integer;
BEGIN
    -- RATE LIMIT: Máximo 3 agendamentos por telefone por dia
    SELECT COUNT(*) INTO v_daily_bookings
    FROM bookings b
    JOIN clients c ON c.id = b.client_id
    WHERE c.phone = p_cliente_telefone
    AND b.booking_date = p_data
    AND b.status != 'cancelled';
    
    IF v_daily_bookings >= 3 THEN
        RAISE EXCEPTION 'Você já atingiu o limite de agendamentos para este dia. Máximo 3 por dia.';
    END IF;

    -- 1. Buscar ou cadastrar o cliente (Ignora RLS por ser SECURITY DEFINER)
    SELECT id INTO v_client_id FROM clients WHERE phone = p_cliente_telefone LIMIT 1;
    
    IF v_client_id IS NULL THEN
        INSERT INTO clients (name, phone)
        VALUES (p_cliente_nome, p_cliente_telefone)
        RETURNING id INTO v_client_id;
    END IF;
    
    -- 2. Inserir o agendamento
    INSERT INTO bookings (
        client_id,
        service_ids,
        booking_date,
        booking_time,
        total_price,
        total_duration,
        status
    )
    VALUES (
        v_client_id,
        p_servicos,
        p_data,
        p_hora,
        p_preco_total,
        p_duracao_total,
        'confirmed'
    )
    RETURNING id INTO v_booking_id;
    
    -- 3. Retornar o agendamento criado
    SELECT jsonb_build_object(
        'id', b.id,
        'client_id', b.client_id,
        'service_ids', b.service_ids,
        'booking_date', b.booking_date,
        'booking_time', b.booking_time,
        'total_price', b.total_price,
        'total_duration', b.total_duration,
        'status', b.status,
        'created_at', b.created_at
    ) INTO v_result
    FROM bookings b
    WHERE b.id = v_booking_id;
    
    RETURN v_result;
EXCEPTION
    WHEN unique_violation THEN
        RAISE EXCEPTION 'Este horário acabou de ser preenchido. Por favor, escolha outro.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para listar apenas horários ocupados de uma data, sem vazar dados de clientes
CREATE OR REPLACE FUNCTION get_occupied_slots(p_date date)
RETURNS TABLE(booking_time time, status text) AS $$
BEGIN
    RETURN QUERY
    SELECT b.booking_time, b.status
    FROM bookings b
    WHERE b.booking_date = p_date AND b.status != 'cancelled';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter configurações do horário de funcionamento
CREATE OR REPLACE FUNCTION get_business_hours()
RETURNS jsonb AS $$
DECLARE
    v_result jsonb;
BEGIN
    SELECT jsonb_object_agg(key, value) INTO v_result
    FROM settings;
    
    RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter apenas os slots disponíveis (dentro do horário de funcionamento, fora do almoço, não ocupados)
CREATE OR REPLACE FUNCTION get_available_slots(p_date date)
RETURNS TABLE(slot_time text) AS $$
DECLARE
    v_opening time;
    v_closing time;
    v_lunch_start time;
    v_lunch_end time;
    v_current time;
BEGIN
    -- Buscar configurações
    v_opening := (SELECT value::time FROM settings WHERE key = 'opening_time');
    v_closing := (SELECT value::time FROM settings WHERE key = 'closing_time');
    v_lunch_start := (SELECT value::time FROM settings WHERE key = 'lunch_start');
    v_lunch_end := (SELECT value::time FROM settings WHERE key = 'lunch_end');
    
    -- Se não tiver configurações, usar padrão
    IF v_opening IS NULL THEN v_opening := '08:00'::time; END IF;
    IF v_closing IS NULL THEN v_closing := '20:00'::time; END IF;
    IF v_lunch_start IS NULL THEN v_lunch_start := '12:00'::time; END IF;
    IF v_lunch_end IS NULL THEN v_lunch_end := '13:00'::time; END IF;
    
    -- Gerar slots a cada hora dentro do horário de funcionamento
    v_current := v_opening;
    WHILE v_current < v_closing LOOP
        -- Pular horário de almoço
        IF v_current < v_lunch_start OR v_current >= v_lunch_end THEN
            -- Verificar se o slot não está ocupado
            IF NOT EXISTS (
                SELECT 1 FROM bookings b
                WHERE b.booking_date = p_date
                AND b.booking_time = v_current
                AND b.status != 'cancelled'
            ) THEN
                slot_time := v_current::text;
                RETURN NEXT;
            END IF;
        END IF;
        v_current := v_current + interval '1 hour';
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para alternar bloqueio de um horário (usa is_blocked ao invés de fake bookings)
CREATE OR REPLACE FUNCTION toggle_slot_block(
    p_date date,
    p_time time
)
RETURNS jsonb AS $$
DECLARE
    v_client_id uuid;
    v_existing_id uuid;
    v_result jsonb;
BEGIN
    -- Buscar booking existente nesse horário
    SELECT b.id INTO v_existing_id
    FROM bookings b
    WHERE b.booking_date = p_date AND b.booking_time = p_time AND b.status != 'cancelled'
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
        -- Booking existe: alternar is_blocked
        UPDATE bookings SET is_blocked = NOT is_blocked WHERE id = v_existing_id RETURNING id INTO v_existing_id;
        SELECT jsonb_build_object('id', v_existing_id, 'blocked', (SELECT is_blocked FROM bookings WHERE id = v_existing_id)) INTO v_result;
        RETURN v_result;
    ELSE
        -- Não existe: criar client BLOQUEADO se necessário e criar booking bloqueado
        SELECT id INTO v_client_id FROM clients WHERE phone = '00000000000' LIMIT 1;
        IF v_client_id IS NULL THEN
            INSERT INTO clients (name, phone) VALUES ('BLOQUEADO', '00000000000') RETURNING id INTO v_client_id;
        END IF;

        INSERT INTO bookings (client_id, service_ids, booking_date, booking_time, total_price, total_duration, status, is_blocked)
        VALUES (v_client_id, '{}', p_date, p_time, 0, 0, 'confirmed', true)
        RETURNING id INTO v_existing_id;

        RETURN jsonb_build_object('id', v_existing_id, 'blocked', true);
    END IF;
EXCEPTION
    WHEN unique_violation THEN
        RAISE EXCEPTION 'Este horário está em conflito. Tente novamente.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para desbloquear todos os horários de um dia
CREATE OR REPLACE FUNCTION unblock_day(p_date date)
RETURNS void AS $$
BEGIN
    UPDATE bookings
    SET is_blocked = FALSE, status = 'cancelled'
    WHERE booking_date = p_date AND is_blocked = TRUE AND status != 'cancelled';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- 11. AUTENTICAÇÃO (CRIE O USUÁRIO ADMIN PELO PAINEL DO SUPABASE)
-- =========================================================================
-- IMPORTANTE: Não crie o usuário admin via SQL. Use o painel do Supabase:
-- 1. Acesse: https://supabase.com/dashboard → Authentication → Users
-- 2. Clique em "Add user" → "Create new user"
-- 3. Insira o email e senha do admin
-- 4. O email inserido deve ser o mesmo configurado nas RLS policies acima
--
-- Isso é mais seguro do que criar via SQL e expor senhas no código.



