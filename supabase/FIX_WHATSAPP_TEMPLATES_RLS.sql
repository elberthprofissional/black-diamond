-- RLS para whatsapp_templates
-- Cole no Supabase Dashboard > SQL Editor > Run

DROP POLICY IF EXISTS "WhatsApp templates admin" ON whatsapp_templates;

CREATE POLICY "WhatsApp templates admin"
ON whatsapp_templates
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());
