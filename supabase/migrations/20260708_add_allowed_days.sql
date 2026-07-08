-- Adiciona coluna allowed_days na tabela mensalista_plans
-- Dias da semana em que o plano é válido (0=Dom, 1=Seg, 2=Ter, ..., 6=Sáb)
-- Padrão: Seg-Sex (1,2,3,4,5)

ALTER TABLE mensalista_plans
ADD COLUMN IF NOT EXISTS allowed_days INTEGER[] DEFAULT '{1,2,3,4,5}';
