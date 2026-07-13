-- =========================================================================
-- BLACK DIAMOND - POLÍTICAS RLS (Consolidado)
-- =========================================================================
-- Todas as políticas de Row Level Security.
-- Estado final após todas as migrations.
-- =========================================================================

-- =========================================================================
-- FUNÇÃO is_admin() (necessária para várias políticas)
-- =========================================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =========================================================================
-- POLÍTICAS POR TABELA
-- =========================================================================

-- SERVIÇOS: leitura pública, escrita admin
DROP POLICY IF EXISTS "Serviços leitura pública" ON services;
CREATE POLICY "Serviços leitura pública" ON services FOR SELECT USING (true);

DROP POLICY IF EXISTS "Serviços gerenciamento admin" ON services;
CREATE POLICY "Serviços gerenciamento admin" ON services FOR ALL TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- CLIENTES: apenas admin
DROP POLICY IF EXISTS "Clientes gerenciamento admin" ON clients;
CREATE POLICY "Clientes gerenciamento admin" ON clients FOR ALL TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- AGENDAMENTOS: admin full + leitura pública para consulta
DROP POLICY IF EXISTS "Agendamentos gerenciamento admin" ON bookings;
CREATE POLICY "Agendamentos gerenciamento admin" ON bookings FOR ALL TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Leitura publica agendamentos futuros" ON bookings;
DROP POLICY IF EXISTS "Leitura pública de agendamentos" ON bookings;
CREATE POLICY "Leitura pública de agendamentos" ON bookings FOR SELECT
USING (
    (status IN ('pending', 'confirmed') AND booking_date >= CURRENT_DATE)
    OR status = 'completed'
);

-- CONFIGURAÇÕES: leitura pública, escrita admin
DROP POLICY IF EXISTS "Configurações leitura pública" ON settings;
CREATE POLICY "Configurações leitura pública" ON settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Configurações gerenciamento admin" ON settings;
CREATE POLICY "Configurações gerenciamento admin" ON settings FOR ALL TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- MENSALISTA PLANS: leitura pública, escrita admin
DROP POLICY IF EXISTS "Mensalista plans leitura pública" ON mensalista_plans;
CREATE POLICY "Mensalista plans leitura pública" ON mensalista_plans FOR SELECT USING (true);

DROP POLICY IF EXISTS "Mensalista plans admin" ON mensalista_plans;
CREATE POLICY "Mensalista plans admin" ON mensalista_plans FOR ALL TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- PUSH SUBSCRIPTIONS: apenas admin
DROP POLICY IF EXISTS "Push subscriptions admin" ON push_subscriptions;
CREATE POLICY "Push subscriptions admin" ON push_subscriptions FOR ALL TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- GALLERY: admin gerencia, público leitura
DROP POLICY IF EXISTS "Admin can manage gallery" ON gallery_images;
CREATE POLICY "Admin can manage gallery" ON gallery_images
    FOR ALL
    TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Anyone can read gallery" ON gallery_images;
CREATE POLICY "Anyone can read gallery" ON gallery_images
    FOR SELECT
    TO anon
    USING (true);

-- AUDIT LOGS: apenas admin
DROP POLICY IF EXISTS "Admin can read audit logs" ON audit_logs;
CREATE POLICY "Admin can read audit logs" ON audit_logs
    FOR SELECT
    TO authenticated
    USING (is_admin());

DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;
CREATE POLICY "System can insert audit logs" ON audit_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (is_admin());

-- BOOKING TOKENS: apenas admin
DROP POLICY IF EXISTS "Admin can read booking tokens" ON booking_tokens;
CREATE POLICY "Admin can read booking tokens"
    ON booking_tokens FOR SELECT
    TO authenticated
    USING (is_admin());

-- NOTIFICATIONS: dono vê as próprias
DROP POLICY IF EXISTS "Users see own notifications" ON notifications;
CREATE POLICY "Users see own notifications"
    ON notifications FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can insert notifications" ON notifications;
CREATE POLICY "Admins can insert own notifications"
    ON notifications FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can mark own as read" ON notifications;
CREATE POLICY "Users can mark own as read"
    ON notifications FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
CREATE POLICY "Users can delete own notifications"
    ON notifications FOR DELETE
    USING (auth.uid() = user_id);

-- ADMIN USERS: apenas admin gerencia
DROP POLICY IF EXISTS "Admin users apenas admin" ON admin_users;
CREATE POLICY "Admin users apenas admin" ON admin_users FOR ALL TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- WHATSAPP TEMPLATES: apenas admin gerencia
DROP POLICY IF EXISTS "WhatsApp templates admin" ON whatsapp_templates;
CREATE POLICY "WhatsApp templates admin"
ON whatsapp_templates
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- TESTIMONIALS: público lê ativos, admin faz tudo
DROP POLICY IF EXISTS "Public can read active testimonials" ON testimonials;
CREATE POLICY "Public can read active testimonials"
  ON testimonials FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Authenticated users full access" ON testimonials;
DROP POLICY IF EXISTS "Admin full access to testimonials" ON testimonials;
CREATE POLICY "Admin full access to testimonials"
  ON testimonials FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- COUPONS: apenas admin
DROP POLICY IF EXISTS "Admin can manage coupons" ON coupons;
CREATE POLICY "Admin can manage coupons"
  ON coupons FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- LOYALTY MILESTONES: apenas admin
DROP POLICY IF EXISTS "Admin manage loyalty_milestones" ON loyalty_milestones;
CREATE POLICY "Admin manage loyalty_milestones"
  ON loyalty_milestones FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- CLIENT MILESTONES: admin lê, sistema insere
DROP POLICY IF EXISTS "Admin read client_milestones" ON client_milestones;
CREATE POLICY "Admin read client_milestones"
  ON client_milestones FOR SELECT
  TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "System insert client_milestones" ON client_milestones;
CREATE POLICY "System insert client_milestones"
  ON client_milestones FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- RATE LIMITS: nenhuma política de acesso direto
-- Apenas SECURITY DEFINER functions acessam (bypass RLS)

-- =========================================================================
-- STORAGE POLICIES
-- =========================================================================

-- Gallery bucket
CREATE POLICY "Gallery: public read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'gallery');

CREATE POLICY "Gallery: authenticated insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'gallery');

CREATE POLICY "Gallery: authenticated delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'gallery');

CREATE POLICY "Gallery: authenticated update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'gallery')
WITH CHECK (bucket_id = 'gallery');

-- Avatars bucket
CREATE POLICY "Avatars: public read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

CREATE POLICY "Avatars: authenticated all"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'avatars')
WITH CHECK (bucket_id = 'avatars');
