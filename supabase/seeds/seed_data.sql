-- Seed data for mensalista_plans and coupons
-- Run this in Supabase SQL Editor when needed
--
-- NOTA v3.31+: Substituido UUIDs hardcoded por buscas por nome de servico,
-- ja que os UUIDs sao gerados automaticamente pelo banco e variam por deploy.

-- ─── Mensalista Plans ───
-- Usa subquery para buscar IDs dos servicos pelo nome (portavel entre deploys)
INSERT INTO mensalista_plans (id, name, price, included_service_ids, allowed_days, duration_days, is_active, is_default, sort_order)
SELECT
    gen_random_uuid(),
    v.name,
    v.price::DECIMAL(10,2),
    ARRAY_AGG(s.id) FILTER (WHERE s.id IS NOT NULL),
    v.allowed_days,
    v.duration_days,
    true,
    v.is_default,
    v.sort_order
FROM (VALUES
    ('Plano Básico',   80,  ARRAY['Corte de Cabelo']::TEXT[],              ARRAY[1,2,3,4,5,6]::INT[], 30, true,  0),
    ('Plano Completo', 120, ARRAY['Corte de Cabelo', 'Barba']::TEXT[],     ARRAY[1,2,3,4,5,6]::INT[], 30, false, 1),
    ('Plano Premium',  150, ARRAY['Corte de Cabelo', 'Barba', 'Sobrancelha']::TEXT[], ARRAY[1,2,3,4,5,6]::INT[], 30, false, 2)
) AS v(name, price, service_names, allowed_days, duration_days, is_default, sort_order)
LEFT JOIN LATERAL UNNEST(v.service_names) AS sn ON TRUE
LEFT JOIN services s ON s.name = sn
GROUP BY v.name, v.price, v.allowed_days, v.duration_days, v.is_default, v.sort_order
HAVING COUNT(s.id) > 0
ON CONFLICT DO NOTHING;

-- ─── Coupons ───
INSERT INTO coupons (id, code, description, discount_type, discount_value, valid_from, valid_until, max_uses, current_uses, is_active, applicable_service_ids)
SELECT
    gen_random_uuid(),
    v.code,
    v.description,
    v.discount_type,
    v.discount_value,
    v.valid_from::DATE,
    v.valid_until::DATE,
    v.max_uses,
    0,
    true,
    CASE WHEN v.service_name IS NOT NULL
        THEN ARRAY(SELECT id FROM services WHERE name = v.service_name)
        ELSE ARRAY[]::UUID[]
    END
FROM (VALUES
    ('BEMVINDO10', 'Primeira vez na Black Diamond? 10% de desconto!', 'percentage', 10, '2026-07-01', '2026-12-31', 50, NULL),
    ('CORTEGRATIS', 'Corte de Cabelo Grátis na 5ª visita!', 'free', 0, '2026-07-01', '2026-12-31', 20, 'Corte de Cabelo'),
    ('INDICA10', 'Indique um amigo e ganhe R$10 de desconto!', 'fixed', 10, '2026-07-01', NULL, 100, NULL)
) AS v(code, description, discount_type, discount_value, valid_from, valid_until, max_uses, service_name)
ON CONFLICT (code) DO NOTHING;
