-- ============================================================
--  E-TOURÉ LOGISTICS ERP — Sécurité Supabase (Row Level Security)
--  Principe : chaque requête est automatiquement filtrée sur le tenant
--  de l'utilisateur connecté (lu dans le JWT), + rôle pour les droits fins.
--  À exécuter APRÈS supabase/schema.sql
-- ============================================================

-- 1. Fonctions d'aide lisibles depuis les policies
CREATE OR REPLACE FUNCTION auth.tenant_id() RETURNS BIGINT AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::bigint,
    0
  );
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION auth.user_role() RETURNS TEXT AS $$
  SELECT COALESCE(current_setting('request.jwt.claims', true)::jsonb ->> 'user_role', 'client');
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION auth.client_id() RETURNS BIGINT AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::jsonb ->> 'client_id')::bigint,
    0
  );
$$ LANGUAGE sql STABLE;

-- 2. Activation de RLS sur toutes les tables métier

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;

-- 3. Policies par table
--    Lecture  : tout utilisateur du même tenant
--    Écriture : tout sauf le rôle "client" (qui est en lecture seule sur ses données)


CREATE POLICY sel_clients ON clients FOR SELECT TO authenticated
  USING (
    tenant_id = auth.tenant_id()
    AND (auth.user_role() <> 'client' OR id = auth.client_id())
  );
CREATE POLICY wr_clients ON clients FOR ALL TO authenticated
  USING (tenant_id = auth.tenant_id() AND auth.user_role() IN ('admin','manager','dispatcher','accountant'))
  WITH CHECK (tenant_id = auth.tenant_id());

CREATE POLICY tenant_isolation_drivers ON drivers FOR ALL TO authenticated
  USING (tenant_id = auth.tenant_id())
  WITH CHECK (tenant_id = auth.tenant_id());

CREATE POLICY tenant_isolation_vehicles ON vehicles FOR ALL TO authenticated
  USING (tenant_id = auth.tenant_id())
  WITH CHECK (tenant_id = auth.tenant_id());

CREATE POLICY sel_deliveries ON deliveries FOR SELECT TO authenticated
  USING (
    tenant_id = auth.tenant_id()
    AND (auth.user_role() <> 'client' OR client_id = auth.client_id())
  );
CREATE POLICY wr_deliveries ON deliveries FOR ALL TO authenticated
  USING (tenant_id = auth.tenant_id() AND auth.user_role() IN ('admin','manager','dispatcher'))
  WITH CHECK (tenant_id = auth.tenant_id());

CREATE POLICY sel_invoices ON invoices FOR SELECT TO authenticated
  USING (
    tenant_id = auth.tenant_id()
    AND (auth.user_role() <> 'client' OR client_id = auth.client_id())
  );
CREATE POLICY wr_invoices ON invoices FOR ALL TO authenticated
  USING (tenant_id = auth.tenant_id() AND auth.user_role() IN ('admin','manager','accountant'))
  WITH CHECK (tenant_id = auth.tenant_id());

CREATE POLICY sel_quotes ON quotes FOR SELECT TO authenticated
  USING (
    tenant_id = auth.tenant_id()
    AND (auth.user_role() <> 'client' OR client_id = auth.client_id())
  );
CREATE POLICY wr_quotes ON quotes FOR ALL TO authenticated
  USING (tenant_id = auth.tenant_id() AND auth.user_role() IN ('admin','manager','accountant'))
  WITH CHECK (tenant_id = auth.tenant_id());

CREATE POLICY sel_expenses ON expenses FOR SELECT TO authenticated
  USING (tenant_id = auth.tenant_id());
CREATE POLICY wr_expenses ON expenses FOR ALL TO authenticated
  USING (tenant_id = auth.tenant_id() AND auth.user_role() IN ('admin','manager','accountant'))
  WITH CHECK (tenant_id = auth.tenant_id());

CREATE POLICY sel_payments ON payments FOR SELECT TO authenticated
  USING (tenant_id = auth.tenant_id());
CREATE POLICY wr_payments ON payments FOR ALL TO authenticated
  USING (tenant_id = auth.tenant_id() AND auth.user_role() IN ('admin','manager','accountant'))
  WITH CHECK (tenant_id = auth.tenant_id());

CREATE POLICY sel_notifications ON notifications FOR SELECT TO authenticated
  USING (tenant_id = auth.tenant_id() AND (user_id IS NULL OR user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())));
CREATE POLICY upd_notifications ON notifications FOR UPDATE TO authenticated
  USING (tenant_id = auth.tenant_id());
CREATE POLICY ins_notifications ON notifications FOR INSERT TO authenticated
  WITH CHECK (tenant_id = auth.tenant_id());

CREATE POLICY sel_logs ON activity_logs FOR SELECT TO authenticated
  USING (tenant_id = auth.tenant_id() AND auth.user_role() IN ('admin','manager'));
CREATE POLICY ins_logs ON activity_logs FOR INSERT TO authenticated
  WITH CHECK (tenant_id = auth.tenant_id());

CREATE POLICY tenant_isolation_attachments ON attachments FOR ALL TO authenticated
  USING (tenant_id = auth.tenant_id())
  WITH CHECK (tenant_id = auth.tenant_id());

CREATE POLICY sel_users ON users FOR SELECT TO authenticated
  USING (tenant_id = auth.tenant_id());
CREATE POLICY ins_users ON users FOR INSERT TO authenticated
  WITH CHECK (tenant_id = auth.tenant_id() AND auth.user_role() = 'admin');
CREATE POLICY upd_users ON users FOR UPDATE TO authenticated
  USING (tenant_id = auth.tenant_id() AND auth.user_role() = 'admin');
CREATE POLICY del_users ON users FOR DELETE TO authenticated
  USING (tenant_id = auth.tenant_id() AND auth.user_role() = 'admin');

-- 4. Tables enfants : accès via la table parente


CREATE POLICY access_driver_documents ON driver_documents FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM drivers p WHERE p.id = driver_documents.driver_id AND p.tenant_id = auth.tenant_id()));

CREATE POLICY access_maintenance_records ON maintenance_records FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM vehicles p WHERE p.id = maintenance_records.vehicle_id AND p.tenant_id = auth.tenant_id()));

CREATE POLICY sel_delivery_events ON delivery_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM deliveries d WHERE d.id = delivery_events.delivery_id AND d.tenant_id = auth.tenant_id()));
CREATE POLICY ins_delivery_events ON delivery_events FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM deliveries d WHERE d.id = delivery_events.delivery_id AND d.tenant_id = auth.tenant_id()));

CREATE POLICY access_vehicle_positions ON vehicle_positions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM vehicles p WHERE p.id = vehicle_positions.vehicle_id AND p.tenant_id = auth.tenant_id()));

CREATE POLICY access_invoice_items ON invoice_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM invoices p WHERE p.id = invoice_items.invoice_id AND p.tenant_id = auth.tenant_id()));

CREATE POLICY access_quote_items ON quote_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM quotes p WHERE p.id = quote_items.quote_id AND p.tenant_id = auth.tenant_id()));

-- 5. Données de référence publiques (rôles, permissions)
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY read_roles ON roles FOR SELECT TO authenticated USING (true);
CREATE POLICY read_permissions ON permissions FOR SELECT TO authenticated USING (true);

-- ============================================================
--  6. Fonction de provisionnement d'un nouveau tenant (SaaS)
--     Appelée côté serveur (service_role) à la création d'une entreprise.
-- ============================================================
CREATE OR REPLACE FUNCTION provision_tenant(
  p_name TEXT, p_legal_name TEXT, p_vat TEXT, p_admin_email TEXT, p_admin_auth_id UUID, p_admin_name TEXT
) RETURNS BIGINT AS $$
DECLARE v_tenant BIGINT; v_role SMALLINT;
BEGIN
  INSERT INTO tenants (name, legal_name, vat_number)
  VALUES (p_name, p_legal_name, p_vat) RETURNING id INTO v_tenant;

  SELECT id INTO v_role FROM roles WHERE code = 'admin';

  INSERT INTO users (tenant_id, role_id, auth_user_id, name, email, password_hash)
  VALUES (v_tenant, v_role, p_admin_auth_id, p_admin_name, p_admin_email, 'supabase-auth');

  INSERT INTO activity_logs (tenant_id, action, type, entity)
  VALUES (v_tenant, 'Création du tenant ' || p_name, 'system', 'tenants');

  RETURN v_tenant;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
