-- =========================================================================
-- BLACK DIAMOND - 008 - CONFIGURAÇÃO INICIAL PIX + SUBSCRIPTIONS
-- =========================================================================
-- Configura a chave PIX do proprietário e cria subscriptions para barbeiros.

-- 1. Configura chave PIX do proprietário
INSERT INTO settings (key, value)
VALUES ('owner_pix_key', '70263397610')
ON CONFLICT (key) DO UPDATE SET value = '70263397610';

-- 2. Cria subscription ATIVA para barbeiros não-owners
-- Trial gratuito até o ÚLTIMO DIA DESTE MÊS
-- Assim o barbeiro começa usando e só bloqueia no fim do mês
INSERT INTO subscriptions (barber_id, status, current_period_start, current_period_end)
SELECT 
  b.id, 
  'active',
  CURRENT_DATE,
  (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE
FROM barbers b
WHERE b.is_owner = FALSE
AND NOT EXISTS (
  SELECT 1 FROM subscriptions s WHERE s.barber_id = b.id
);
