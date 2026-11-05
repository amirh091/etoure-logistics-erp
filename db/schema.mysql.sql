-- ============================================================
--  E-TOURÉ LOGISTICS ERP — Schéma MySQL 8 (InnoDB, utf8mb4)
--  Base multi-entreprises (SaaS) · prête pour un backend Node/Laravel
--  Fichier : db/schema.mysql.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS etoure_erp
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE etoure_erp;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
--  1. TENANTS (une ligne par entreprise cliente du SaaS)
-- ============================================================
CREATE TABLE tenants (
  id            BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
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
  plan          ENUM('starter','business','enterprise') NOT NULL DEFAULT 'business',
  is_active     TINYINT(1)   NOT NULL DEFAULT 1,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_tenants_vat (vat_number)
) ENGINE=InnoDB;

-- ============================================================
--  2. UTILISATEURS / RÔLES / PERMISSIONS
-- ============================================================
CREATE TABLE roles (
  id          TINYINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  code        VARCHAR(40) NOT NULL UNIQUE,     -- admin, manager, dispatcher, accountant, client
  label       VARCHAR(80) NOT NULL
) ENGINE=InnoDB;

INSERT INTO roles (code, label) VALUES
  ('admin','Administrateur'), ('manager','Manager'),
  ('dispatcher','Exploitant'), ('accountant','Comptable'), ('client','Client');

CREATE TABLE permissions (
  id      SMALLINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  code    VARCHAR(60) NOT NULL UNIQUE          -- deliveries.create, finance.read…
) ENGINE=InnoDB;

CREATE TABLE role_permissions (
  role_id       TINYINT UNSIGNED  NOT NULL,
  permission_id SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id)       REFERENCES roles(id)       ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE users (
  id             BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  tenant_id      BIGINT UNSIGNED NOT NULL,
  role_id        TINYINT UNSIGNED NOT NULL,
  client_id      BIGINT UNSIGNED NULL,         -- si rôle "client" : rattachement au portail
  name           VARCHAR(160) NOT NULL,
  email          VARCHAR(190) NOT NULL,
  password_hash  VARCHAR(255) NOT NULL,        -- bcrypt / argon2 (jamais le mot de passe en clair)
  phone          VARCHAR(40)  NULL,
  avatar_color   CHAR(7)      NULL,
  two_factor_secret VARCHAR(64) NULL,
  is_active      TINYINT(1)   NOT NULL DEFAULT 1,
  last_login_at  DATETIME     NULL,
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (tenant_id, email),
  KEY idx_users_tenant (tenant_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id)   REFERENCES roles(id)
) ENGINE=InnoDB;

-- ============================================================
--  3. CLIENTS
-- ============================================================
CREATE TABLE clients (
  id             BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  tenant_id      BIGINT UNSIGNED NOT NULL,
  reference      VARCHAR(30)  NOT NULL,        -- CLI-1001
  name           VARCHAR(190) NOT NULL,
  contact_name   VARCHAR(160) NULL,
  email          VARCHAR(190) NULL,
  phone          VARCHAR(40)  NULL,
  address        VARCHAR(255) NULL,
  city           VARCHAR(120) NULL,
  postal_code    VARCHAR(20)  NULL,
  country        CHAR(2)      NOT NULL DEFAULT 'FR',
  sector         VARCHAR(120) NULL,
  type           ENUM('Entreprise','PME','Grand compte','Particulier') DEFAULT 'Entreprise',
  siret          VARCHAR(30)  NULL,
  vat_number     VARCHAR(40)  NULL,
  payment_terms  VARCHAR(30)  NOT NULL DEFAULT '30 jours',
  rating         DECIMAL(2,1) NOT NULL DEFAULT 4.5,
  is_active      TINYINT(1)   NOT NULL DEFAULT 1,
  notes          TEXT         NULL,
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_clients_ref (tenant_id, reference),
  KEY idx_clients_city (tenant_id, city),
  KEY idx_clients_name (tenant_id, name),
  FULLTEXT KEY ft_clients (name, contact_name, email, sector),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
--  4. CHAUFFEURS
-- ============================================================
CREATE TABLE drivers (
  id                 BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  tenant_id          BIGINT UNSIGNED NOT NULL,
  reference          VARCHAR(30)  NOT NULL,    -- DRV-201
  name               VARCHAR(160) NOT NULL,
  email              VARCHAR(190) NULL,
  phone              VARCHAR(40)  NULL,
  emergency_contact  VARCHAR(40)  NULL,
  city               VARCHAR(120) NULL,
  license_number     VARCHAR(40)  NULL,
  license_type       VARCHAR(20)  NULL,        -- B, C, CE, C+CE
  license_expiry     DATE         NULL,
  medical_expiry     DATE         NULL,
  hire_date          DATE         NULL,
  status             ENUM('Disponible','En mission','Repos','Congé') NOT NULL DEFAULT 'Disponible',
  rating             DECIMAL(2,1) NOT NULL DEFAULT 4.5,
  deliveries_done    INT UNSIGNED NOT NULL DEFAULT 0,
  on_time_rate       DECIMAL(5,2) NOT NULL DEFAULT 95.00,
  km_total           INT UNSIGNED NOT NULL DEFAULT 0,
  notes              TEXT         NULL,
  created_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_drivers_ref (tenant_id, reference),
  KEY idx_drivers_status (tenant_id, status),
  KEY idx_drivers_license_exp (tenant_id, license_expiry),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE driver_documents (
  id          BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  driver_id   BIGINT UNSIGNED NOT NULL,
  type        ENUM('permis','visite_medicale','carte_pro','contrat','autre') NOT NULL,
  file_url    VARCHAR(500) NOT NULL,
  issued_at   DATE NULL,
  expires_at  DATE NULL,
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_doc_expiry (expires_at),
  FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
--  5. VÉHICULES
-- ============================================================
CREATE TABLE vehicles (
  id                      BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  tenant_id               BIGINT UNSIGNED NOT NULL,
  driver_id               BIGINT UNSIGNED NULL,
  reference               VARCHAR(30)  NOT NULL,  -- VEH-301
  plate                   VARCHAR(20)  NOT NULL,
  model                   VARCHAR(120) NOT NULL,
  brand                   VARCHAR(80)  NULL,
  type                    ENUM('Camion','Fourgonnette','Moto') NOT NULL,
  year                    SMALLINT UNSIGNED NULL,
  capacity_kg             INT UNSIGNED NOT NULL DEFAULT 0,
  fuel                    ENUM('Diesel','Essence','Électrique','Hybride','GNV') DEFAULT 'Diesel',
  mileage_km              INT UNSIGNED NOT NULL DEFAULT 0,
  fuel_consumption        DECIMAL(5,2) NULL,
  co2_g_km                INT UNSIGNED NULL,
  status                  ENUM('Disponible','En mission','Maintenance','Hors service') NOT NULL DEFAULT 'Disponible',
  insurance_provider      VARCHAR(120) NULL,
  insurance_expiry        DATE NULL,
  technical_visit_expiry  DATE NULL,
  next_maintenance_km     INT UNSIGNED NULL,
  maintenance_cost_total  DECIMAL(10,2) NOT NULL DEFAULT 0,
  gps_active              TINYINT(1) NOT NULL DEFAULT 1,
  created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_vehicles_plate (tenant_id, plate),
  KEY idx_vehicles_status (tenant_id, status),
  KEY idx_vehicles_insurance (tenant_id, insurance_expiry),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE maintenance_records (
  id            BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  vehicle_id    BIGINT UNSIGNED NOT NULL,
  type          ENUM('preventive','corrective','controle_technique','pneus','autre') NOT NULL,
  date          DATE NOT NULL,
  mileage_km    INT UNSIGNED NULL,
  cost          DECIMAL(10,2) NOT NULL DEFAULT 0,
  supplier      VARCHAR(160) NULL,
  notes         TEXT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_maint_vehicle (vehicle_id, date),
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
--  6. LIVRAISONS
-- ============================================================
CREATE TABLE deliveries (
  id                    BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  tenant_id             BIGINT UNSIGNED NOT NULL,
  reference             VARCHAR(30)  NOT NULL,     -- LIV-20261001
  tracking_code         VARCHAR(20)  NULL,
  client_id             BIGINT UNSIGNED NOT NULL,
  driver_id             BIGINT UNSIGNED NULL,
  vehicle_id            BIGINT UNSIGNED NULL,
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
  vehicle_type          ENUM('Camion','Fourgonnette','Moto') NULL,
  status                ENUM('En attente','Confirmée','En cours','Livrée','Annulée') NOT NULL DEFAULT 'En attente',
  priority              ENUM('Normale','Haute','Urgente') NOT NULL DEFAULT 'Normale',
  progress              TINYINT UNSIGNED NOT NULL DEFAULT 0,
  price_ht              DECIMAL(10,2) NOT NULL DEFAULT 0,
  cost_ht               DECIMAL(10,2) NOT NULL DEFAULT 0,
  fragile               TINYINT(1) NOT NULL DEFAULT 0,
  temperature_controlled TINYINT(1) NOT NULL DEFAULT 0,
  scheduled_at          DATETIME NULL,
  delivered_at          DATETIME NULL,
  signature_name        VARCHAR(160) NULL,
  signature_url         VARCHAR(500) NULL,
  notes                 TEXT NULL,
  created_by            BIGINT UNSIGNED NULL,
  created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_deliv_ref (tenant_id, reference),
  UNIQUE KEY uq_deliv_tracking (tenant_id, tracking_code),
  KEY idx_deliv_status (tenant_id, status),
  KEY idx_deliv_client (client_id, created_at),
  KEY idx_deliv_driver (driver_id, status),
  KEY idx_deliv_date (tenant_id, created_at),
  FOREIGN KEY (tenant_id)  REFERENCES tenants(id)   ON DELETE CASCADE,
  FOREIGN KEY (client_id)  REFERENCES clients(id)   ON DELETE RESTRICT,
  FOREIGN KEY (driver_id)  REFERENCES drivers(id)   ON DELETE SET NULL,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)  ON DELETE SET NULL
) ENGINE=InnoDB;

-- Historique des statuts (traçabilité / timeline du portail client)
CREATE TABLE delivery_events (
  id           BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  delivery_id  BIGINT UNSIGNED NOT NULL,
  status       VARCHAR(30) NOT NULL,
  comment      VARCHAR(255) NULL,
  lat          DECIMAL(9,6) NULL,
  lng          DECIMAL(9,6) NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_devents (delivery_id, created_at),
  FOREIGN KEY (delivery_id) REFERENCES deliveries(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Positions GPS (table à fort volume → purger/archiver périodiquement, ou InfluxDB)
CREATE TABLE vehicle_positions (
  id          BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  vehicle_id  BIGINT UNSIGNED NOT NULL,
  delivery_id BIGINT UNSIGNED NULL,
  lat         DECIMAL(9,6) NOT NULL,
  lng         DECIMAL(9,6) NOT NULL,
  speed_kmh   SMALLINT UNSIGNED NULL,
  heading     SMALLINT UNSIGNED NULL,
  recorded_at DATETIME NOT NULL,
  KEY idx_pos_vehicle_time (vehicle_id, recorded_at),
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
  FOREIGN KEY (delivery_id) REFERENCES deliveries(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
--  7. FINANCE : factures, devis, dépenses
-- ============================================================
CREATE TABLE invoices (
  id              BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  tenant_id       BIGINT UNSIGNED NOT NULL,
  number          VARCHAR(40) NOT NULL,           -- FAC-2026-1001
  client_id       BIGINT UNSIGNED NOT NULL,
  delivery_id     BIGINT UNSIGNED NULL,
  status          ENUM('Brouillon','Envoyée','En attente','Payée','En retard','Annulée','Refusée') NOT NULL DEFAULT 'En attente',
  issued_at       DATE NOT NULL,
  due_at          DATE NOT NULL,
  payment_method  VARCHAR(60) NULL,
  subtotal_ht     DECIMAL(10,2) NOT NULL DEFAULT 0,
  vat_rate        DECIMAL(5,2) NOT NULL DEFAULT 20.00,
  vat_amount      DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_ttc       DECIMAL(10,2) NOT NULL DEFAULT 0,
  paid_at         DATETIME NULL,
  notes           TEXT NULL,
  pdf_url         VARCHAR(500) NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_invoice_number (tenant_id, number),
  KEY idx_inv_status (tenant_id, status, due_at),
  KEY idx_inv_client (client_id),
  FOREIGN KEY (tenant_id)   REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (client_id)   REFERENCES clients(id),
  FOREIGN KEY (delivery_id) REFERENCES deliveries(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE invoice_items (
  id          BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  invoice_id  BIGINT UNSIGNED NOT NULL,
  label       VARCHAR(255) NOT NULL,
  quantity    DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price  DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_ht    DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  position    TINYINT UNSIGNED NOT NULL DEFAULT 0,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE quotes (
  id              BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  tenant_id       BIGINT UNSIGNED NOT NULL,
  number          VARCHAR(40) NOT NULL,          -- DEV-2026-1001
  client_id       BIGINT UNSIGNED NOT NULL,
  status          ENUM('Brouillon','Envoyé','Accepté','Refusé','Expiré') NOT NULL DEFAULT 'Brouillon',
  issued_at       DATE NOT NULL,
  valid_until     DATE NULL,
  subtotal_ht     DECIMAL(10,2) NOT NULL DEFAULT 0,
  vat_rate        DECIMAL(5,2) NOT NULL DEFAULT 20.00,
  vat_amount      DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_ttc       DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes           TEXT NULL,
  converted_invoice_id BIGINT UNSIGNED NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_quote_number (tenant_id, number),
  KEY idx_quote_status (tenant_id, status),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (client_id) REFERENCES clients(id),
  FOREIGN KEY (converted_invoice_id) REFERENCES invoices(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE quote_items (
  id          BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  quote_id    BIGINT UNSIGNED NOT NULL,
  label       VARCHAR(255) NOT NULL,
  quantity    DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price  DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_ht    DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  position    TINYINT UNSIGNED NOT NULL DEFAULT 0,
  FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE expenses (
  id            BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  tenant_id     BIGINT UNSIGNED NOT NULL,
  reference     VARCHAR(30) NOT NULL,
  category      ENUM('Carburant','Maintenance','Salaires','Assurance','Péages','Leasing',
                     'Fournitures','Sous-traitance','Loyer','Marketing','Autre') NOT NULL,
  label         VARCHAR(190) NULL,
  supplier      VARCHAR(160) NULL,
  vehicle_id    BIGINT UNSIGNED NULL,
  delivery_id   BIGINT UNSIGNED NULL,
  amount        DECIMAL(10,2) NOT NULL,
  expense_date  DATE NOT NULL,
  payment_method ENUM('Carte entreprise','Virement','Prélèvement','Espèces') DEFAULT 'Virement',
  status        ENUM('En attente','Payée','Annulée') NOT NULL DEFAULT 'Payée',
  is_recurring  TINYINT(1) NOT NULL DEFAULT 0,
  invoice_ref   VARCHAR(60) NULL,
  receipt_url   VARCHAR(500) NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_exp_date (tenant_id, expense_date),
  KEY idx_exp_cat  (tenant_id, category),
  FOREIGN KEY (tenant_id)  REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL,
  FOREIGN KEY (delivery_id) REFERENCES deliveries(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE payments (
  id             BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  tenant_id      BIGINT UNSIGNED NOT NULL,
  invoice_id     BIGINT UNSIGNED NOT NULL,
  amount         DECIMAL(10,2) NOT NULL,
  paid_at        DATETIME NOT NULL,
  method         VARCHAR(60) NULL,
  reference      VARCHAR(80) NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_pay_invoice (invoice_id),
  FOREIGN KEY (tenant_id)  REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
--  8. NOTIFICATIONS / AUDIT / FICHIERS
-- ============================================================
CREATE TABLE notifications (
  id           BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  tenant_id    BIGINT UNSIGNED NOT NULL,
  user_id      BIGINT UNSIGNED NULL,
  client_id    BIGINT UNSIGNED NULL,
  channel      ENUM('email','sms','whatsapp','push','app') NOT NULL,
  type         ENUM('delivery','finance','driver','alert','system') NOT NULL,
  title        VARCHAR(190) NOT NULL,
  body         TEXT NULL,
  target_url   VARCHAR(255) NULL,
  is_read      TINYINT(1) NOT NULL DEFAULT 0,
  sent_at      DATETIME NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_notif_user (user_id, is_read, created_at),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE activity_logs (
  id          BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  tenant_id   BIGINT UNSIGNED NOT NULL,
  user_id     BIGINT UNSIGNED NULL,
  action      VARCHAR(120) NOT NULL,
  entity      VARCHAR(60)  NULL,
  entity_id   VARCHAR(60)  NULL,
  type        ENUM('create','update','delete','export','auth','system') NOT NULL,
  ip_address  VARCHAR(45)  NULL,
  user_agent  VARCHAR(255) NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_log_tenant_date (tenant_id, created_at),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE attachments (
  id          BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  tenant_id   BIGINT UNSIGNED NOT NULL,
  entity      VARCHAR(60) NOT NULL,
  entity_id   BIGINT UNSIGNED NOT NULL,
  file_name   VARCHAR(255) NOT NULL,
  file_url    VARCHAR(500) NOT NULL,
  mime_type   VARCHAR(120) NULL,
  size_bytes  INT UNSIGNED NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_att_entity (entity, entity_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
--  9. VUES PRÊTES POUR LE TABLEAU DE BORD
-- ============================================================
CREATE OR REPLACE VIEW v_dashboard_monthly AS
SELECT
  d.tenant_id,
  DATE_FORMAT(d.created_at, '%Y-%m') AS month_key,
  COUNT(*)                            AS deliveries_count,
  SUM(CASE WHEN d.status = 'Livrée' THEN 1 ELSE 0 END) AS delivered_count,
  SUM(CASE WHEN d.status = 'Annulée' THEN 0 ELSE d.price_ht END) AS revenue_ht,
  SUM(CASE WHEN d.status = 'Annulée' THEN 0 ELSE d.cost_ht  END) AS cost_ht,
  SUM(CASE WHEN d.status = 'Annulée' THEN 0 ELSE d.price_ht - d.cost_ht END) AS margin_ht
FROM deliveries d
GROUP BY d.tenant_id, DATE_FORMAT(d.created_at, '%Y-%m');

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
  SUM(CASE WHEN x.status = 'Livrée' THEN 1 ELSE 0 END) AS deliveries_completed,
  COALESCE(SUM(CASE WHEN x.status = 'Annulée' THEN 0 ELSE x.price_ht END), 0) AS revenue_ht,
  d.rating,
  d.on_time_rate
FROM drivers d
LEFT JOIN deliveries x ON x.driver_id = d.id
GROUP BY d.id, d.tenant_id, d.name, d.rating, d.on_time_rate;

CREATE OR REPLACE VIEW v_compliance_alerts AS
  SELECT tenant_id, 'vehicle' AS entity, id AS entity_id, plate AS label,
         'Assurance' AS doc_type, insurance_expiry AS expires_on,
         DATEDIFF(insurance_expiry, CURDATE()) AS days_left
  FROM vehicles WHERE insurance_expiry IS NOT NULL
  UNION ALL
  SELECT tenant_id, 'vehicle', id, plate, 'Visite technique', technical_visit_expiry,
         DATEDIFF(technical_visit_expiry, CURDATE())
  FROM vehicles WHERE technical_visit_expiry IS NOT NULL
  UNION ALL
  SELECT tenant_id, 'driver', id, name, 'Permis', license_expiry,
         DATEDIFF(license_expiry, CURDATE())
  FROM drivers WHERE license_expiry IS NOT NULL
  UNION ALL
  SELECT tenant_id, 'driver', id, name, 'Visite médicale', medical_expiry,
         DATEDIFF(medical_expiry, CURDATE())
  FROM drivers WHERE medical_expiry IS NOT NULL;

-- ============================================================
--  10. INDEX DE RECHERCHE AVANCÉE (recherche plein texte clients)
--     MySQL 8 FULLTEXT InnoDB supporte le français nativement.
-- ============================================================
-- Exemple de requête utilisée par l'écran "Clients" :
--   SELECT * FROM clients
--   WHERE tenant_id = :tenant AND MATCH(name, contact_name, email, sector)
--         AGAINST (:q IN BOOLEAN MODE);
