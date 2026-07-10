-- =========================================================================
-- Migration: WhatsApp Templates RLS
-- =========================================================================
-- Habilita acesso autenticado para gerenciar templates de WhatsApp
-- =========================================================================

-- Politica: admins podem ler, criar, atualizar e deletar templates
DROP POLICY IF EXISTS "WhatsApp templates admin" ON whatsapp_templates;
CREATE POLICY "WhatsApp templates admin"
ON whatsapp_templates
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());
