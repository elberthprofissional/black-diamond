-- =========================================================================
-- BLACK DIAMOND - DADOS INICIAIS + CRON JOBS
-- =========================================================================
-- Servicos, planos, configuracoes, depoimentos, cupons, milestones e cron.
-- =========================================================================

-- =========================================================================
-- SEED DATA
-- =========================================================================

-- Servicos
INSERT INTO services (name, price, duration, description)
SELECT name, price, duration, description FROM (VALUES
    ('Corte de Cabelo', 35.00, 40, 'Corte moderno e personalizado.'),
    ('Barba', 27.00, 20, 'Aparacao e modelagem de barba.'),
    ('Barba com Toalha Quente', 30.00, 30, 'Experiencia relaxante com toalha quente.'),
    ('Sobrancelha', 15.00, 10, 'Limpeza e design de sobrancelha.'),
    ('Pezinho', 15.00, 10, 'Acabamento perfeito.')
) AS temp_data(name, price, duration, description)
WHERE NOT EXISTS (SELECT 1 FROM services WHERE services.name = temp_data.name);

-- Planos mensalistas
DO $$
BEGIN
    IF (SELECT COUNT(*) FROM mensalista_plans) = 0 THEN
        INSERT INTO mensalista_plans (name, price, included_service_ids, is_active, is_default, sort_order)
        SELECT v.name, v.price::DECIMAL(10,2),
            COALESCE(ARRAY(SELECT id FROM services WHERE services.name = v.service_name), '{}'),
            true, true, v.sort_order
        FROM (VALUES
            ('Plano Black', 150.00, 'Corte de Cabelo', 1),
            ('Plano Gold', 120.00, 'Corte de Cabelo', 2)
        ) AS v(name, price, service_name, sort_order);
    END IF;
END $$;

-- Configuracoes padrao
INSERT INTO settings (key, value) VALUES
    ('opening_time', '08:00'),
    ('closing_time', '19:00'),
    ('saturday_opening', '08:00'),
    ('saturday_closing', '18:00'),
    ('working_days', '1,2,3,4,5,6'),
    ('barber_name', 'Admin'),
    ('barber_phone', ''),
    ('mensalista_enabled', 'true'),
    ('max_no_shows', '3'),
    ('multi_barber_enabled', 'false'),
    ('lunch_start', '12:00'),
    ('lunch_end', '13:00')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Depoimentos
INSERT INTO testimonials (name, rating, text, sort_order) VALUES
    ('YP TATTOO', 5, 'Barbearia super confortavel, ambiente agradavel, profissional qualificado e atencioso.', 1),
    ('HELBERT HENRIQUE', 5, 'Venezuelano mais fera de BH!! Tem o macete.', 2),
    ('MAIA STUDIO', 5, 'Unico profissional que conseguiu cortar o cabelo do meu filho com paciencia e excelencia.', 3),
    ('GIOVANNA CARDOSO', 5, 'Profissional agradavel, super atencioso, trabalho impecavel e corte perfeito. Super recomendo!', 4),
    ('GUILHERME HENRIQUE', 5, 'Otim profissional, lugar aconchegante e trabalho impecavel!', 5),
    ('MATHEUS', 5, 'Tato e bom demais, cara sabe como cuidar de um cabelo.', 6)
ON CONFLICT DO NOTHING;

-- Cupom de exemplo
INSERT INTO coupons (id, code, description, discount_type, discount_value, valid_from, valid_until, max_uses, is_active, applicable_service_ids)
VALUES
    ('b0000001-0000-0000-0000-000000000001', 'BEMVINDO', 'Desconto de R$10 na primeira visita!', 'fixed', 10.00, CURRENT_DATE, CURRENT_DATE + INTERVAL '90 days', 50, true, ARRAY[
        (SELECT id FROM services WHERE name = 'Corte de Cabelo'),
        (SELECT id FROM services WHERE name = 'Barba com Toalha Quente')
    ])
ON CONFLICT (id) DO NOTHING;

-- Milestones de fidelidade
INSERT INTO loyalty_milestones (id, visits_required, reward_service_id, is_active)
VALUES
    ('c0000001-0000-0000-0000-000000000001', 5, (SELECT id FROM services WHERE name = 'Sobrancelha'), true),
    ('c0000002-0000-0000-0000-000000000002', 10, (SELECT id FROM services WHERE name = 'Pezinho'), true)
ON CONFLICT (id) DO NOTHING;

-- =========================================================================
-- CRON JOBS
-- =========================================================================

-- Remover jobs existentes antes de recriar
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-block-lunch') THEN PERFORM cron.unschedule('auto-block-lunch'); END IF;
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'completar-agendamentos') THEN PERFORM cron.unschedule('completar-agendamentos'); END IF;
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'verificar-mensalistas') THEN PERFORM cron.unschedule('verificar-mensalistas'); END IF;
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'monthly-cleanup') THEN PERFORM cron.unschedule('monthly-cleanup'); END IF;
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly-report') THEN PERFORM cron.unschedule('weekly-report'); END IF;
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-all') THEN PERFORM cron.unschedule('cleanup-all'); END IF;
END $$;

-- 1. Completar agendamentos expirados (a cada 15 min)
SELECT cron.schedule('completar-agendamentos', '*/15 * * * *', $$ SELECT completar_agendamentos_expirados() $$);

-- 2. Cleanup diario: tokens + notificacoes + rate limits (6h da manha)
SELECT cron.schedule('cleanup-all', '0 6 * * *', $$
    DELETE FROM booking_tokens WHERE expires_at < NOW();
    DELETE FROM notifications WHERE created_at < NOW() - INTERVAL '30 days';
    DELETE FROM rate_limits WHERE window_start < NOW() - INTERVAL '1 hour';
$$);

-- 3. Bloquear horarios de almoco (3h da manha)
SELECT cron.schedule('auto-block-lunch', '0 3 * * *', $$ SELECT auto_block_lunch_break() $$);

-- 4. Verificar mensalistas proximos do vencimento (11h da manha)
SELECT cron.schedule('verificar-mensalistas', '0 11 * * *', $$ SELECT verificar_mensalistas() $$);

-- 5. Limpeza mensal de dados antigos (dia 1, 5h da manha)
SELECT cron.schedule('monthly-cleanup', '0 5 1 * *', $$ SELECT cleanup_old_data() $$);

-- 6. Relatorio semanal (domingo, 23h)
SELECT cron.schedule('weekly-report', '0 23 * * 0', $$ SELECT send_weekly_report() $$);
