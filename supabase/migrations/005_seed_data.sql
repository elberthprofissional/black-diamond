-- =========================================================================
-- BLACK DIAMOND - DADOS INICIAIS CONSOLIDADO
-- =========================================================================
-- Servicos, planos, configuracoes, depoimentos, cupons, milestones e billing.
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

-- Planos de billing (SaaS)
INSERT INTO subscription_plans (name, slug, description, price_monthly, price_setup, interval_months, is_active)
VALUES
    ('Mensal', 'mensal-sdominio', 'Acesso mensal sem dominio personalizado', 49.90, 0, 1, true),
    ('Anual', 'anual-sdominio', 'Acesso anual sem dominio - economize 20%', 55.00, 0, 12, true),
    ('Mensal + Dominio', 'mensal-cdominio', '1o mes: R$149,90 (setup). Depois: R$49,90/mes', 49.90, 149.90, 1, true),
    ('Anual + Dominio', 'anual-cdominio', 'Acesso anual com dominio incluso', 70.00, 0, 12, true)
ON CONFLICT (slug) DO NOTHING;
