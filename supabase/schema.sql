-- ============================================================
--  E-TOURÉ LOGISTICS ERP — Schéma Supabase (PostgreSQL 16)
--  À exécuter dans : Supabase Dashboard → SQL Editor
--  Ordre : 1) schema.sql  2) policies.sql  3) storage.sql
-- ============================================================
--  Supabase fournit déjà : auth.users, storage, realtime, extensions.
--  Ce fichier crée le schéma métier + active Realtime sur les tables utiles.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS postgis;      -- géolocalisation (à activer dans Database → Extensions)

CREATE TABLE tenants (
  id            BIGSERIAL PRIMARY KEY,
  name          VARCHAR(160) NOT NULL,
  legal_name    VARCHAR(190) NOT NULL,
  vat_number    VARCHAR(40)  NULL,
  siret         VARCHAR(30)  NULL,
  email         VARCHAR(160) NULL,
  phone         VARCHAR(40)  NULL,
  address       VARCHAR(255) NULL,
  city          VARCHAR(120) NULL,
  postal_code   VARCHAR(20)  NULL,
  country       CHAR(2)      NOT NULL DEFAULT 'FR',
  iban          VARCHAR(50)  NULL,
  bank_name     VARCHAR(120) NULL,
  currency      CHAR(3)      NOT NULL DEFAULT 'EUR',
  vat_rate      DECIMAL(5,2) NOT NULL DEFAULT 20.00,
  plan VARCHAR(40) CHECK (plan IN ('starter', 'business', 'enterprise')) NOT NULL DEFAULT 'business',
  is_active     BOOLEAN   NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_tenants_vat UNIQUE (vat_number)
);

CREATE TABLE roles (
  id          SMALLSERIAL PRIMARY KEY,
  code        VARCHAR(40) NOT NULL UNIQUE,     -- admin, manager, dispatcher, accountant, client,
  label       VARCHAR(80) NOT NULL
);

CREATE TABLE permissions (
  id      SMALLSERIAL PRIMARY KEY,
  code    VARCHAR(60) NOT NULL UNIQUE          -- deliveries.create, finance.read…
);

CREATE TABLE role_permissions (
  role_id       SMALLINT NOT NULL,
  permission_id SMALLINT NOT NULL,
  FOREIGN KEY (role_id)       REFERENCES roles(id)       ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

CREATE TABLE users (
  id             BIGSERIAL PRIMARY KEY,
  auth_user_id   UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE, -- lien Supabase Auth
  tenant_id      BIGINT NOT NULL,
  role_id        SMALLINT NOT NULL,
  client_id      BIGINT NULL,         -- si rôle "client" : rattachement au portail,
  name           VARCHAR(160) NOT NULL,
  email          VARCHAR(190) NOT NULL,
  password_hash  VARCHAR(255) NOT NULL,        -- bcrypt / argon2 (jamais le mot de passe en clair),
  phone          VARCHAR(40)  NULL,
  avatar_color   CHAR(7)      NULL,
  two_factor_secret VARCHAR(64) NULL,
  is_active      BOOLEAN   NOT NULL DEFAULT TRUE,
  last_login_at  TIMESTAMPTZ     NULL,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMP    NOT NULL DEFAULT NOW(),
  FOREIGN KEY (role_id)   REFERENCES roles(id),
  CONSTRAINT uq_users_email UNIQUE (tenant_id, email),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
CREATE INDEX idx_users_tenant ON users (tenant_id);

CREATE TABLE clients (
  id             BIGSERIAL PRIMARY KEY,
  tenant_id      BIGINT NOT NULL,
  reference      VARCHAR(30)  NOT NULL,        -- CLI-1001,
  name           VARCHAR(190) NOT NULL,
  contact_name   VARCHAR(160) NULL,
  email          VARCHAR(190) NULL,
  phone          VARCHAR(40)  NULL,
  address        VARCHAR(255) NULL,
  city           VARCHAR(120) NULL,
  postal_code    VARCHAR(20)  NULL,
  country        CHAR(2)      NOT NULL DEFAULT 'FR',
  sector         VARCHAR(120) NULL,
  type VARCHAR(40) CHECK (type IN ('Entreprise', 'PME', 'Grand compte', 'Particulier')) DEFAULT 'Entreprise',
  siret          VARCHAR(30)  NULL,
  vat_number     VARCHAR(40)  NULL,
  payment_terms  VARCHAR(30)  NOT NULL DEFAULT '30 jours',
  rating         DECIMAL(2,1) NOT NULL DEFAULT 4.5,
  is_active      BOOLEAN   NOT NULL DEFAULT TRUE,
  notes          TEXT         NULL,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMP    NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_clients_ref UNIQUE (tenant_id, reference),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
CREATE INDEX idx_clients_city ON clients (tenant_id, city);
CREATE INDEX idx_clients_name ON clients (tenant_id, name);

CREATE TABLE drivers (
  id                 BIGSERIAL PRIMARY KEY,
  tenant_id          BIGINT NOT NULL,
  reference          VARCHAR(30)  NOT NULL,    -- DRV-201,
  name               VARCHAR(160) NOT NULL,
  email              VARCHAR(190) NULL,
  phone              VARCHAR(40)  NULL,
  emergency_contact  VARCHAR(40)  NULL,
  city               VARCHAR(120) NULL,
  license_number     VARCHAR(40)  NULL,
  license_type       VARCHAR(20)  NULL,        -- B, C, CE, C+CE,
  license_expiry     DATE         NULL,
  medical_expiry     DATE         NULL,
  hire_date          DATE         NULL,
  status VARCHAR(40) CHECK (status IN ('Disponible', 'En mission', 'Repos', 'Congé')) NOT NULL DEFAULT 'Disponible',
  rating             DECIMAL(2,1) NOT NULL DEFAULT 4.5,
  deliveries_done    INTEGER NOT NULL DEFAULT 0,
  on_time_rate       DECIMAL(5,2) NOT NULL DEFAULT 95.00,
  km_total           INTEGER NOT NULL DEFAULT 0,
  notes              TEXT         NULL,
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMP    NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_drivers_ref UNIQUE (tenant_id, reference),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
CREATE INDEX idx_drivers_status ON drivers (tenant_id, status);
CREATE INDEX idx_drivers_license_exp ON drivers (tenant_id, license_expiry);

CREATE TABLE driver_documents (
  id          BIGSERIAL PRIMARY KEY,
  driver_id   BIGINT NOT NULL,
  type VARCHAR(40) CHECK (type IN ('permis', 'visite_medicale', 'carte_pro', 'contrat', 'autre')) NOT NULL,
  file_url    VARCHAR(500) NOT NULL,
  issued_at   DATE NULL,
  expires_at  DATE NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE
);
CREATE INDEX idx_doc_expiry ON driver_documents (expires_at);

CREATE TABLE vehicles (
  id                      BIGSERIAL PRIMARY KEY,
  tenant_id               BIGINT NOT NULL,
  driver_id               BIGINT NULL,
  reference               VARCHAR(30)  NOT NULL,  -- VEH-301,
  plate                   VARCHAR(20)  NOT NULL,
  model                   VARCHAR(120) NOT NULL,
  brand                   VARCHAR(80)  NULL,
  type VARCHAR(40) CHECK (type IN ('Camion', 'Fourgonnette', 'Moto')) NOT NULL,
  year                    SMALLINT NULL,
  capacity_kg             INTEGER NOT NULL DEFAULT 0,
  fuel VARCHAR(40) CHECK (fuel IN ('Diesel', 'Essence', 'Électrique', 'Hybride', 'GNV')) DEFAULT 'Diesel',
  mileage_km              INTEGER NOT NULL DEFAULT 0,
  fuel_consumption        DECIMAL(5,2) NULL,
  co2_g_km                INTEGER NULL,
  status VARCHAR(40) CHECK (status IN ('Disponible', 'En mission', 'Maintenance', 'Hors service')) NOT NULL DEFAULT 'Disponible',
  insurance_provider      VARCHAR(120) NULL,
  insurance_expiry        DATE NULL,
  technical_visit_expiry  DATE NULL,
  next_maintenance_km     INTEGER NULL,
  maintenance_cost_total  DECIMAL(10,2) NOT NULL DEFAULT 0,
  gps_active              BOOLEAN NOT NULL DEFAULT TRUE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_vehicles_plate UNIQUE (tenant_id, plate),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL
);
CREATE INDEX idx_vehicles_status ON vehicles (tenant_id, status);
CREATE INDEX idx_vehicles_insurance ON vehicles (tenant_id, insurance_expiry);

CREATE TABLE maintenance_records (
  id            BIGSERIAL PRIMARY KEY,
  vehicle_id    BIGINT NOT NULL,
  type VARCHAR(40) CHECK (type IN ('preventive', 'corrective', 'controle_technique', 'pneus', 'autre')) NOT NULL,
  date          DATE NOT NULL,
  mileage_km    INTEGER NULL,
  cost          DECIMAL(10,2) NOT NULL DEFAULT 0,
  supplier      VARCHAR(160) NULL,
  notes         TEXT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);
CREATE INDEX idx_maint_vehicle ON maintenance_records (vehicle_id, date);

CREATE TABLE deliveries (
  id                    BIGSERIAL PRIMARY KEY,
  tenant_id             BIGINT NOT NULL,
  reference             VARCHAR(30)  NOT NULL,     -- LIV-20261001,
  tracking_code         VARCHAR(20)  NULL,
  client_id             BIGINT NOT NULL,
  driver_id             BIGINT NULL,
  vehicle_id            BIGINT NULL,
  pickup_city           VARCHAR(120) NOT NULL,
  pickup_address        VARCHAR(255) NULL,
  pickup_lat            DECIMAL(9,6) NULL,
  pickup_lng            DECIMAL(9,6) NULL,
  dropoff_city          VARCHAR(120) NOT NULL,
  dropoff_address       VARCHAR(255) NULL,
  dropoff_lat           DECIMAL(9,6) NULL,
  dropoff_lng           DECIMAL(9,6) NULL,
  distance_km           DECIMAL(8,2) NOT NULL DEFAULT 0,
  weight_kg             DECIMAL(10,2) NOT NULL DEFAULT 0,
  goods_description     VARCHAR(255) NULL,
  vehicle_type VARCHAR(40) CHECK (vehicle_type IN ('Camion', 'Fourgonnette', 'Moto')) NULL,
  status VARCHAR(40) CHECK (status IN ('En attente', 'Confirmée', 'En cours', 'Livrée', 'Annulée')) NOT NULL DEFAULT 'En attente',
  priority VARCHAR(40) CHECK (priority IN ('Normale', 'Haute', 'Urgente')) NOT NULL DEFAULT 'Normale',
  progress              SMALLINT NOT NULL DEFAULT 0,
  price_ht              DECIMAL(10,2) NOT NULL DEFAULT 0,
  cost_ht               DECIMAL(10,2) NOT NULL DEFAULT 0,
  fragile               BOOLEAN NOT NULL DEFAULT FALSE,
  temperature_controlled BOOLEAN NOT NULL DEFAULT FALSE,
  scheduled_at          TIMESTAMPTZ NULL,
  delivered_at          TIMESTAMPTZ NULL,
  signature_name        VARCHAR(160) NULL,
  signature_url         VARCHAR(500) NULL,
  notes                 TEXT NULL,
  created_by            BIGINT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (tenant_id)  REFERENCES tenants(id)   ON DELETE CASCADE,
  FOREIGN KEY (client_id)  REFERENCES clients(id)   ON DELETE RESTRICT,
  FOREIGN KEY (driver_id)  REFERENCES drivers(id)   ON DELETE SET NULL,
  CONSTRAINT uq_deliv_ref UNIQUE (tenant_id, reference),
  CONSTRAINT uq_deliv_tracking UNIQUE (tenant_id, tracking_code),
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)  ON DELETE SET NULL
);
CREATE INDEX idx_deliv_status ON deliveries (tenant_id, status);
CREATE INDEX idx_deliv_client ON deliveries (client_id, created_at);
CREATE INDEX idx_deliv_driver ON deliveries (driver_id, status);
CREATE INDEX idx_deliv_date ON deliveries (tenant_id, created_at);

CREATE TABLE delivery_events (
  id           BIGSERIAL PRIMARY KEY,
  delivery_id  BIGINT NOT NULL,
  status       VARCHAR(30) NOT NULL,
  comment      VARCHAR(255) NULL,
  lat          DECIMAL(9,6) NULL,
  lng          DECIMAL(9,6) NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (delivery_id) REFERENCES deliveries(id) ON DELETE CASCADE
);
CREATE INDEX idx_devents ON delivery_events (delivery_id, created_at);

CREATE TABLE vehicle_positions (
  id          BIGSERIAL PRIMARY KEY,
  vehicle_id  BIGINT NOT NULL,
  delivery_id BIGINT NULL,
  lat         DECIMAL(9,6) NOT NULL,
  lng         DECIMAL(9,6) NOT NULL,
  speed_kmh   SMALLINT NULL,
  heading     SMALLINT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
  FOREIGN KEY (delivery_id) REFERENCES deliveries(id) ON DELETE SET NULL
);
CREATE INDEX idx_pos_vehicle_time ON vehicle_positions (vehicle_id, recorded_at);

CREATE TABLE invoices (
  id              BIGSERIAL PRIMARY KEY,
  tenant_id       BIGINT NOT NULL,
  number          VARCHAR(40) NOT NULL,           -- FAC-2026-1001,
  client_id       BIGINT NOT NULL,
  delivery_id     BIGINT NULL,
  status VARCHAR(40) CHECK (status IN ('Brouillon', 'Envoyée', 'En attente', 'Payée', 'En retard', 'Annulée', 'Refusée')) NOT NULL DEFAULT 'En attente',
  issued_at       DATE NOT NULL,
  due_at          DATE NOT NULL,
  payment_method  VARCHAR(60) NULL,
  subtotal_ht     DECIMAL(10,2) NOT NULL DEFAULT 0,
  vat_rate        DECIMAL(5,2) NOT NULL DEFAULT 20.00,
  vat_amount      DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_ttc       DECIMAL(10,2) NOT NULL DEFAULT 0,
  paid_at         TIMESTAMPTZ NULL,
  notes           TEXT NULL,
  pdf_url         VARCHAR(500) NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (tenant_id)   REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (client_id)   REFERENCES clients(id),
  CONSTRAINT uq_invoice_number UNIQUE (tenant_id, number),
  FOREIGN KEY (delivery_id) REFERENCES deliveries(id) ON DELETE SET NULL
);
CREATE INDEX idx_inv_status ON invoices (tenant_id, status, due_at);
CREATE INDEX idx_inv_client ON invoices (client_id);

CREATE TABLE invoice_items (
  id          BIGSERIAL PRIMARY KEY,
  invoice_id  BIGINT NOT NULL,
  label       VARCHAR(255) NOT NULL,
  quantity    DECIMAL(10,2) NOT NULL DEFAULT TRUE,
  unit_price  DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_ht    DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  position    SMALLINT NOT NULL DEFAULT 0,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

CREATE TABLE quotes (
  id              BIGSERIAL PRIMARY KEY,
  tenant_id       BIGINT NOT NULL,
  number          VARCHAR(40) NOT NULL,          -- DEV-2026-1001,
  client_id       BIGINT NOT NULL,
  status VARCHAR(40) CHECK (status IN ('Brouillon', 'Envoyé', 'Accepté', 'Refusé', 'Expiré')) NOT NULL DEFAULT 'Brouillon',
  issued_at       DATE NOT NULL,
  valid_until     DATE NULL,
  subtotal_ht     DECIMAL(10,2) NOT NULL DEFAULT 0,
  vat_rate        DECIMAL(5,2) NOT NULL DEFAULT 20.00,
  vat_amount      DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_ttc       DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes           TEXT NULL,
  converted_invoice_id BIGINT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_quote_number UNIQUE (tenant_id, number),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (client_id) REFERENCES clients(id),
  FOREIGN KEY (converted_invoice_id) REFERENCES invoices(id) ON DELETE SET NULL
);
CREATE INDEX idx_quote_status ON quotes (tenant_id, status);

CREATE TABLE quote_items (
  id          BIGSERIAL PRIMARY KEY,
  quote_id    BIGINT NOT NULL,
  label       VARCHAR(255) NOT NULL,
  quantity    DECIMAL(10,2) NOT NULL DEFAULT TRUE,
  unit_price  DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_ht    DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  position    SMALLINT NOT NULL DEFAULT 0,
  FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE
);

CREATE TABLE expenses (
  id            BIGSERIAL PRIMARY KEY,
  tenant_id     BIGINT NOT NULL,
  reference     VARCHAR(30) NOT NULL,
  category      VARCHAR(40) NOT NULL CHECK (category IN ('Carburant','Maintenance','Salaires','Assurance','Péages','Leasing','Fournitures','Sous-traitance','Loyer','Marketing','Autre')),
  label         VARCHAR(190) NULL,
  supplier      VARCHAR(160) NULL,
  vehicle_id    BIGINT NULL,
  delivery_id   BIGINT NULL,
  amount        DECIMAL(10,2) NOT NULL,
  expense_date  DATE NOT NULL,
  payment_method VARCHAR(40) CHECK (payment_method IN ('Carte entreprise', 'Virement', 'Prélèvement', 'Espèces')) DEFAULT 'Virement',
  status VARCHAR(40) CHECK (status IN ('En attente', 'Payée', 'Annulée')) NOT NULL DEFAULT 'Payée',
  is_recurring  BOOLEAN NOT NULL DEFAULT FALSE,
  invoice_ref   VARCHAR(60) NULL,
  receipt_url   VARCHAR(500) NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (tenant_id)  REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL,
  FOREIGN KEY (delivery_id) REFERENCES deliveries(id) ON DELETE SET NULL
);
CREATE INDEX idx_exp_date ON expenses (tenant_id, expense_date);
CREATE INDEX idx_exp_cat ON expenses (tenant_id, category);

CREATE TABLE payments (
  id             BIGSERIAL PRIMARY KEY,
  tenant_id      BIGINT NOT NULL,
  invoice_id     BIGINT NOT NULL,
  amount         DECIMAL(10,2) NOT NULL,
  paid_at        TIMESTAMPTZ NOT NULL,
  method         VARCHAR(60) NULL,
  reference      VARCHAR(80) NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (tenant_id)  REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);
CREATE INDEX idx_pay_invoice ON payments (invoice_id);

CREATE TABLE notifications (
  id           BIGSERIAL PRIMARY KEY,
  tenant_id    BIGINT NOT NULL,
  user_id      BIGINT NULL,
  client_id    BIGINT NULL,
  channel VARCHAR(40) CHECK (channel IN ('email', 'sms', 'whatsapp', 'push', 'app')) NOT NULL,
  type VARCHAR(40) CHECK (type IN ('delivery', 'finance', 'driver', 'alert', 'system')) NOT NULL,
  title        VARCHAR(190) NOT NULL,
  body         TEXT NULL,
  target_url   VARCHAR(255) NULL,
  is_read      BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at      TIMESTAMPTZ NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);
CREATE INDEX idx_notif_user ON notifications (user_id, is_read, created_at);

CREATE TABLE activity_logs (
  id          BIGSERIAL PRIMARY KEY,
  tenant_id   BIGINT NOT NULL,
  user_id     BIGINT NULL,
  action      VARCHAR(120) NOT NULL,
  entity      VARCHAR(60)  NULL,
  entity_id   VARCHAR(60)  NULL,
  type VARCHAR(40) CHECK (type IN ('create', 'update', 'delete', 'export', 'auth', 'system')) NOT NULL,
  ip_address  VARCHAR(45)  NULL,
  user_agent  VARCHAR(255) NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE SET NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
CREATE INDEX idx_log_tenant_date ON activity_logs (tenant_id, created_at);

CREATE TABLE attachments (
  id          BIGSERIAL PRIMARY KEY,
  tenant_id   BIGINT NOT NULL,
  entity      VARCHAR(60) NOT NULL,
  entity_id   BIGINT NOT NULL,
  file_name   VARCHAR(255) NOT NULL,
  file_url    VARCHAR(500) NOT NULL,
  mime_type   VARCHAR(120) NULL,
  size_bytes  INTEGER NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
CREATE INDEX idx_att_entity ON attachments (entity, entity_id);

CREATE OR REPLACE VIEW v_dashboard_monthly AS
SELECT
  d.tenant_id,
  to_char(d.created_at, 'YYYY-MM') AS month_key,
  COUNT(*)                            AS deliveries_count,
  COUNT(*) FILTER (WHERE d.status = 'Livrée') AS delivered_count,
  SUM(CASE WHEN d.status = 'Annulée' THEN 0 ELSE d.price_ht END) AS revenue_ht,
  SUM(CASE WHEN d.status = 'Annulée' THEN 0 ELSE d.cost_ht  END) AS cost_ht,
  SUM(CASE WHEN d.status = 'Annulée' THEN 0 ELSE d.price_ht - d.cost_ht END) AS margin_ht
FROM deliveries d
GROUP BY d.tenant_id, to_char(d.created_at, 'YYYY-MM');
CREATE OR REPLACE VIEW v_expenses_by_category AS
SELECT tenant_id, category, SUM(amount) AS total_amount, COUNT(*) AS entries
FROM expenses
GROUP BY tenant_id, category;
CREATE OR REPLACE VIEW v_driver_performance AS
SELECT
  d.id AS driver_id,
  d.tenant_id,
  d.name,
  COUNT(x.id) AS deliveries_assigned,
  COUNT(*) FILTER (WHERE x.status = 'Livrée') AS deliveries_completed,
  COALESCE(SUM(x.price_ht) FILTER (WHERE x.status <> 'Annulée'), 0) AS revenue_ht,
  d.rating,
  d.on_time_rate
FROM drivers d
LEFT JOIN deliveries x ON x.driver_id = d.id
GROUP BY d.id, d.tenant_id, d.name, d.rating, d.on_time_rate;
CREATE OR REPLACE VIEW v_compliance_alerts AS
  SELECT tenant_id, 'vehicle' AS entity, id AS entity_id, plate AS label,
         'Assurance' AS doc_type, insurance_expiry AS expires_on,
         (insurance_expiry - CURRENT_DATE) AS days_left
  FROM vehicles WHERE insurance_expiry IS NOT NULL
  UNION ALL
  SELECT tenant_id, 'vehicle', id, plate, 'Visite technique', technical_visit_expiry,
         (technical_visit_expiry - CURRENT_DATE)
  FROM vehicles WHERE technical_visit_expiry IS NOT NULL
  UNION ALL
  SELECT tenant_id, 'driver', id, name, 'Permis', license_expiry,
         (license_expiry - CURRENT_DATE)
  FROM drivers WHERE license_expiry IS NOT NULL
  UNION ALL
  SELECT tenant_id, 'driver', id, name, 'Visite médicale', medical_expiry,
         (medical_expiry - CURRENT_DATE)
  FROM drivers WHERE medical_expiry IS NOT NULL;

-- ============================================================
--  Recherche avancée clients (trigrammes + accents ignorés)
-- ============================================================
CREATE INDEX idx_clients_search ON clients
  USING gin (lower(unaccent(name || ' ' || COALESCE(contact_name,'') || ' ' || COALESCE(email,'') || ' ' || COALESCE(sector,''))) gin_trgm_ops);

-- Exemple d'utilisation :
--   SELECT * FROM clients
--   WHERE tenant_id = $1
--     AND lower(unaccent(name || ' ' || COALESCE(email,''))) LIKE lower(unaccent('%' || $2 || '%'));

-- ============================================================
--  Isolation multi-entreprises (Row Level Security, optionnel)
-- ============================================================
-- ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY tenant_isolation ON deliveries
--   USING (tenant_id = current_setting('app.tenant_id')::bigint);


-- ============================================================
--  REALTIME — cartes et tableaux de bord temps réel
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE deliveries;
ALTER PUBLICATION supabase_realtime ADD TABLE delivery_events;
ALTER PUBLICATION supabase_realtime ADD TABLE vehicle_positions;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ============================================================
--  TRIGGERS utilitaires
-- ============================================================

-- met à jour le compteur de courses d'un chauffeur à chaque livraison terminée
CREATE OR REPLACE FUNCTION fn_update_driver_stats() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'Livrée' AND (OLD.status IS DISTINCT FROM 'Livrée') THEN
    UPDATE drivers
       SET deliveries_done = deliveries_done + 1,
           km_total        = km_total + COALESCE(NEW.distance_km, 0)
     WHERE id = NEW.driver_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_driver_stats ON deliveries;
CREATE TRIGGER trg_driver_stats AFTER UPDATE ON deliveries
FOR EACH ROW EXECUTE FUNCTION fn_update_driver_stats();

-- journalise automatiquement les changements de statut dans la timeline
CREATE OR REPLACE FUNCTION fn_log_delivery_event() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO delivery_events (delivery_id, status, comment)
    VALUES (NEW.id, NEW.status, 'Changement de statut automatique');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_delivery_event ON deliveries;
CREATE TRIGGER trg_delivery_event AFTER UPDATE ON deliveries
FOR EACH ROW EXECUTE FUNCTION fn_log_delivery_event();

-- numérotation automatique des factures : FAC-2026-0001
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1000;
CREATE OR REPLACE FUNCTION fn_invoice_number() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.number IS NULL OR NEW.number = '' THEN
    NEW.number := 'FAC-' || to_char(NOW(), 'YYYY') || '-' || LPAD(nextval('invoice_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_invoice_number ON invoices;
CREATE TRIGGER trg_invoice_number BEFORE INSERT ON invoices
FOR EACH ROW EXECUTE FUNCTION fn_invoice_number();
