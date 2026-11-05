# 🗄️ Quelle base de données pour E-TOURÉ LOGISTICS ERP ?

## Recommandation courte

> **PostgreSQL 16** — c'est mon choix pour ce projet.
> **MySQL 8** est le plan B parfaitement valable si votre équipe est déjà MySQL/Laravel.

Les deux schémas complets sont déjà dans ce dossier, prêts à exécuter :

| Fichier | Base | Contenu |
|---|---|---|
| `db/schema.postgres.sql` | PostgreSQL 16 | 22 tables, 4 vues, 25 index, extensions `pg_trgm` / `unaccent` |
| `db/schema.mysql.sql` | MySQL 8 | 22 tables, 4 vues, index FULLTEXT FR, moteur InnoDB utf8mb4 |

---

## Pourquoi PostgreSQL pour une app logistique ?

### 1. La géolocalisation est au cœur du produit → **PostGIS**
Votre module carte suit des véhicules et calcule des trajets. PostgreSQL a **PostGIS**, l'extension géospatiale de référence mondiale :

```sql
-- véhicules à moins de 20 km d'un point de livraison
SELECT v.plate, ST_Distance(v.last_pos, ST_MakePoint(2.3522, 48.8566)::geography) / 1000 AS km
FROM vehicles v
WHERE ST_DWithin(v.last_pos, ST_MakePoint(2.3522, 48.8566)::geography, 20000)
ORDER BY km;
```
MySQL a des fonctions spatiales (`ST_Distance_Sphere`) mais reste loin derrière : pas de `ST_DWithin`, index GiST moins performants, pas de géocodage inverse / itinéraires natifs.

### 2. SaaS multi-entreprises → **isolation forte**
Vous voulez vendre la plateforme à plusieurs transporteurs. PostgreSQL gère l'isolation au niveau base avec **Row Level Security** :

```sql
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON deliveries
  USING (tenant_id = current_setting('app.tenant_id')::bigint);
```
Résultat : même si un bug applicatif oublie un `WHERE tenant_id = …`, **aucune fuite de données entre clients**. C'est un argument commercial (RGPD, appels d'offres) et une sécurité réelle. MySQL n'a pas d'équivalent natif.

### 3. Champs métier flexibles → **JSONB**
Chaque entreprise a ses spécificités (options de tarif, paramètres de notification, champs personnalisés). JSONB est indexable (GIN) et requêtable :

```sql
SELECT * FROM tenants WHERE settings->'tarifs'->>'express' = 'true';
```
Le JSON de MySQL est utilisable mais nettement moins puissant (pas d'index GIN multi-clés).

### 4. Volumétrie GPS → **partitionnement natif**
`vehicle_positions` grandit vite (1 position / 30 s / véhicule ≈ 1 M lignes/an pour 10 véhicules). PostgreSQL gère le **partitionnement déclaratif par mois** et, si besoin plus tard, **TimescaleDB** (hypertables) sur la même base.

### 5. Le reste
- Recherche plein texte **insensible aux accents** (essentiel en français : « Société » = « societe ») via `unaccent` + `pg_trgm` → rechercher « etoure » trouve « E-TOURÉ ».
- Types stricts (montants `NUMERIC(10,2)`, contraintes `CHECK`), transactions ACID solides, `RETURNING`, CTE.
- Sauvegarde **PITR** (restauration à la seconde) très mature.

---

## Quand choisir MySQL plutôt ?

Choisissez **MySQL 8** si :
- votre promesse initiale « Backend Laravel + MySQL » doit être tenue (Laravel est très à l'aise avec les deux, mais c'est le défaut historique) ;
- vous hébergez sur du **mutualisé cPanel/OVH** pas cher : MySQL y est fourni, PostgreSQL rarement ;
- votre futur prestataire / votre équipe est **exclusivement MySQL** (compétence > fonctionnalité) ;
- vous utilisez des outils SaaS qui n'exposent que MySQL.

Ce que vous perdez concrètement : PostGIS, RLS multi-tenant, index GIN, partitionnement aussi simple. **Rien de bloquant** pour la v1 — vous pourrez migrer plus tard (outil `pgloader`, migration quasi automatique).

---

## À éviter pour ce projet

| Base | Pourquoi non |
|---|---|
| **MongoDB** | Données financières, factures, marges : vous avez besoin de contraintes et de transactions strictes. Le relationnel est ici naturel. |
| **SQLite** | Très bien pour **la démo locale** (d'ailleurs l'app actuelle persiste dans `localStorage`), mais pas pour du multi-utilisateurs concurrent en production. |
| **Firebase / Firestore** | Verrouillage fournisseur, requêtes analytiques faibles, coûts qui explosent avec les écritures GPS. |

---

## Architecture recommandée (dimensionnée pour la réalité)

```
React (Vercel)  →  API Node/NestJS  →  PostgreSQL 16 (managé)
                        │                 ├── PostGIS (trajets, distances)
                        │                 └── pg_cron (relances, alertes)
                        ├── Redis    (cache, sessions, files d'attente)
                        └── S3 / MinIO (PDF, documents chauffeurs, photos)
```

- **Fichiers jamais en base** : PDF et documents vont sur S3/MinIO, la base ne garde qu'une URL.
- **Redis** : indispensable pour les jobs (génération PDF, envoi SMS/WhatsApp) et le cache des KPI du dashboard.

### Où l'héberger (UE / RGPD)
| Option | Quand |
|---|---|
| **Neon** / **Supabase** (Postgres managé + backups + read replicas) | startup, go-fast, gratuit → ~25 €/mois |
| **Scaleway / OVH Managed PostgreSQL** | souveraineté française, facturation UE |
| **AWS RDS / Azure Database** | contrats grands comptes |

### Dimensionnement indicatif
| Charge | Instance | Volume |
|---|---|---|
| 1 entreprise, ~20 livraisons/mois | 1 vCPU / 2 Go | < 200 Mo |
| 20 entreprises | 2 vCPU / 4 Go + backups quotidiens | 2–5 Go |
| 100+ entreprises | 4 vCPU / 16 Go, read replica, partitionnement GPS | 20 Go+ |

### Sauvegarde (à ne pas négliger)
- Snapshot quotidien + **WAL archiving** (PITR) → rétention 30 jours
- Test de restauration **trimestriel** (une sauvegarde jamais testée n'existe pas)
- Export logique hebdomadaire chiffré, stocké hors du même datacenter

---

## Ce qui est déjà prêt dans les schémas

- **22 tables** couvrant les 10 modules : `tenants`, `users`/`roles`/`permissions`, `clients`, `drivers` (+ `driver_documents`), `vehicles` (+ `maintenance_records`), `deliveries` (+ `delivery_events`, `vehicle_positions`), `invoices`/`invoice_items`, `quotes`/`quote_items`, `expenses`, `payments`, `notifications`, `activity_logs`, `attachments`.
- **4 vues** de dashboard prêtes : mensuel (CA/dépenses/marge), dépenses par catégorie, performance chauffeurs, alertes de conformité (assurance, visite technique, permis).
- **Index ciblés** sur les colonnes réellement filtrées (`status`, `tenant_id`, dates d'expiration) et recherche texte sur les clients.
- **Multi-tenant dès le départ** (`tenant_id` partout) : pas de refonte douloureuse le jour où vous vendez à un 2ᵉ transporteur.
- Clés étrangères avec `ON DELETE CASCADE / SET NULL` réfléchies (supprimer un chauffeur ne supprime pas ses livraisons).

### Tester les schémas en 2 minutes
```bash
# PostgreSQL (Docker)
docker run --rm -e POSTGRES_PASSWORD=demo -p 5432:5432 -d --name pg postgres:16
docker exec -i pg psql -U postgres -c "CREATE DATABASE etoure_erp"
docker exec -i pg psql -U postgres -d etoure_erp < db/schema.postgres.sql

# MySQL (Docker)
docker run --rm -e MYSQL_ROOT_PASSWORD=demo -p 3306:3306 -d --name my mysql:8
docker exec -i my mysql -uroot -pdemo < db/schema.mysql.sql
```

---

## Et le jour de la migration ?

Si vous démarrez en MySQL et voulez passer à PostgreSQL plus tard : **`pgloader`** convertit schéma + données en une commande, avec un temps d'arrêt de quelques minutes. Ce n'est pas un mariage à vie — mais autant choisir le bon dès le départ, puisque vous partez de zéro.

---

## Ma recommandation finale en une phrase

> **PostgreSQL 16** (hébergé chez Neon ou Scaleway) pour la géolocalisation PostGIS et l'isolation multi-entreprises — et si l'équipe impose MySQL, le schéma `db/schema.mysql.sql` est déjà écrit et équivalent à 95 %.
