-- =========================================================================
-- BLACK DIAMOND - REMINDER LOGS
-- =========================================================================
-- Persiste o histórico de lembretes enviados no banco de dados,
-- substituindo o armazenamento anterior em localStorage.
-- Permite consistência entre dispositivos e sincronização em tempo real.
-- =========================================================================

-- Tabela de logs de lembretes enviados
CREATE TABLE IF NOT EXISTS reminder_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    template_id TEXT,
    template_name TEXT,
    message_preview TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_reminder_logs_client_id ON reminder_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_sent_at ON reminder_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_user_id ON reminder_logs(user_id);

-- Habilita RLS
ALTER TABLE reminder_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: admin pode tudo
DROP POLICY IF EXISTS "Admin full access to reminder_logs" ON reminder_logs;
CREATE POLICY "Admin full access to reminder_logs"
    ON reminder_logs FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- Função para registrar lembrete enviado
CREATE OR REPLACE FUNCTION log_reminder_sent(
    p_client_id UUID,
    p_template_id TEXT DEFAULT NULL,
    p_template_name TEXT DEFAULT NULL,
    p_message_preview TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_id UUID;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    INSERT INTO reminder_logs (client_id, template_id, template_name, message_preview, user_id)
    VALUES (p_client_id, p_template_id, p_template_name, p_message_preview, v_user_id)
    RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se um lembrete recente foi enviado (últimos 7 dias)
CREATE OR REPLACE FUNCTION has_recent_reminder(p_client_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM reminder_logs
        WHERE client_id = p_client_id
        AND sent_at > NOW() - INTERVAL '7 days'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para buscar últimos lembretes (admin)
CREATE OR REPLACE FUNCTION get_client_reminders(p_client_id UUID)
RETURNS TABLE(
    id UUID,
    sent_at TIMESTAMPTZ,
    template_name TEXT,
    message_preview TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT rl.id, rl.sent_at, rl.template_name, rl.message_preview
    FROM reminder_logs rl
    WHERE rl.client_id = p_client_id
    ORDER BY rl.sent_at DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
