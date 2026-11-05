# 🟢 E-TOURÉ LOGISTICS ERP sur Supabase — guide de mise en place

> **Réponse courte : Supabase.** C'est la seule des trois options qui colle à un ERP logistique européen multi-entreprises (Postgres + PostGIS + RLS + 4 régions UE à 25 $/mois).

---

## 1. Pourquoi Supabase plutôt que Firebase ou Convex

### Le problème central : l'isolation entre entreprises
Vous voulez vendre la plateforme à **plusieurs transporteurs**. Chaque entreprise doit être certaine de ne jamais voir les données d'une autre. C'est un sujet juridique (RGPD, secret des affaires), pas seulement technique.

- **Supabase** : Postgres + **Row Level Security**. La règle est dans la base, pas dans le code. Même un bug applicatif ne peut pas faire fuiter les données d'un autre transporteur.
- **Firebase / Firestore** : la sécurité repose sur des *security rules* maison, réécrites pour chaque collection et chaque sous-collection. Puissant, mais une erreur = fuite. Et aucun moyen d'écrire une règle SQL vérifiable/auditable.
- **Convex** : pas de RLS native, vous filtrez en TypeScript dans chaque fonction. Même risque que Firebase, avec un écosystème plus jeune.

### Les 6 critères qui départagent

| Critère | Supabase | Firebase | Convex |
|---|---|---|---|
| **Modèle** | PostgreSQL (relationnel) ✅ | Documents NoSQL | Documents NoSQL |
| **Contraintes, transactions, jointures** | ✅ natif | ❌ limité | ⚠️ partiel |
| **Géolocalisation / PostGIS** | ✅ extension activable en 1 clic | ✅ GeoFire (SDK externe) | ❌ à construire |
| **Isolation multi-tenant** | ✅ RLS en base | ⚠️ règles maison | ⚠️ code maison |
| **Régions UE** | ✅ **4** (Irlande, Paris, Francfort, Stockholm) | ✅ europe-west (Belgique) | ⚠️ **1 seule** (Irlande), +30 % de tarif |
| **Verrouillage fournisseur** | ✅ très faible (c'est du Postgres : `pg_dump` et vous partez) | ❌ élevé | ❌ élevé |
| **Temps réel** | ✅ Realtime (WAL) | ✅ excellent | ✅✅ le meilleur |
| **Auth, Storage, Edge Functions** | ✅ inclus | ✅ inclus | ⚠️ partiel |

### Les 3 rédhibitoires pour ce projet
1. **Données financières** (factures, marges, dépenses, TVA) → il faut des contraintes strictes et des transactions. En NoSQL, la cohérence devient votre problème quotidien.
2. **PostGIS** pour les trajets et le calcul de distances : disponible nativement avec Supabase, absent chez Convex.
3. **Convex n'a qu'une région UE** (Irlande) facturée +30 %, et le changement de région est impossible sur un déploiement existant. Pour un SaaS « Europe » vendu à des transporteurs, c'est un frein commercial.

### Et Firebase ?
Firebase reste excellent pour une **app mobile grand public** (chat, notifications, sync hors-ligne). Mais pour un ERP : requêtes analytiques limitées (pas de `JOIN`, pas d'agrégats serveur), export comptable compliqué, et **facturation à la lecture** qui devient imprévisible quand le dashboard tourne en boucle. Sur un ERP avec tableaux de bord permanents, c'est le pire scénario tarifaire.

> **Convex**, en revanche, est un très bon produit : sa réactivité (chaque requête se met à jour toute seule) est supérieure à Supabase. Si vous construisions un **chat collaboratif ou un tableur temps réel**, je le recommanderais. Pour un ERP avec des invariants comptables, non.

---

## 2. Mise en place (15 minutes)

### Étape 1 — Créer le projet
1. https://supabase.com → **New project**
2. **Region : `eu-west-3` (Paris)** ← important pour vos clients français
3. Notez `Project URL` et `anon public key` (Settings → API)

### Étape 2 — Exécuter les scripts SQL (dans l'ordre)
Supabase Dashboard → **SQL Editor** → coller puis *Run* :

| Ordre | Fichier | Rôle |
|---|---|---|
| 1 | `supabase/schema.sql` | 22 tables, 4 vues, index, triggers, Realtime |
| 2 | `supabase/policies.sql` | **33 policies RLS** (isolation tenant + rôles) |
| 3 | `supabase/storage.sql` | buckets `documents`, `invoices`, `proofs` |

Avant l'étape 1, activez l'extension **postgis** : Database → Extensions → `postgis` → Enable.

### Étape 3 — Brancher le frontend React
```bash
cd etoure-logistics-erp
npm install @supabase/supabase-js
```

`.env.local`
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

`src/lib/supabase.js`
```js
import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

### Étape 4 — Injecter `tenant_id` et le rôle dans le JWT
Les policies lisent `tenant_id` et `user_role` dans le token. On les ajoute avec un **Auth Hook** (Supabase → Authentication → Hooks → *Custom Access Token* → fonction Postgres) :

```sql
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE claims jsonb; u RECORD;
BEGIN
  SELECT us.tenant_id, r.code AS role, us.client_id
    INTO u
    FROM public.users us
    JOIN public.roles r ON r.id = us.role_id
   WHERE us.auth_user_id = (event->>'user_id')::uuid;

  claims := event->'claims';
  claims := jsonb_set(claims, '{tenant_id}',  to_jsonb(COALESCE(u.tenant_id, 0)));
  claims := jsonb_set(claims, '{user_role}',  to_jsonb(COALESCE(u.role, 'client')));
  claims := jsonb_set(claims, '{client_id}',  to_jsonb(COALESCE(u.client_id, 0)));
  RETURN jsonb_set(event, '{claims}', claims);
END; $$;
```

### Étape 5 — Remplacer la couche de données du frontend
Le code actuel utilise un `reducer` + `localStorage`. La bascule se fait dans **`src/store/StoreContext.jsx`** :

```js
// AVANT (démo locale)
add: (collection, payload) => dispatch({ type: 'ADD', collection, payload })

// APRÈS (Supabase)
add: async (collection, payload) => {
  const { data, error } = await supabase.from(collection).insert(payload).select().single();
  if (error) throw error;
  dispatch({ type: 'ADD', collection, payload: data });   // le temps réel peut aussi le faire
}
```

Et pour le **temps réel de la carte** (`MapLive.jsx`), plus besoin de la simulation :
```js
supabase.channel('live-fleet')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicle_positions' },
      (payload) => setPositions(prev => mergePosition(prev, payload.new)))
  .subscribe();
```

### Étape 6 — Auth
```js
// Connexion (remplace la simulation JWT de AuthContext.jsx)
const { data, error } = await supabase.auth.signInWithPassword({ email, password });
// Inscription client depuis le portail
await supabase.auth.signUp({ email, password });
```

---

## 3. Ce qui est déjà prêt dans ce dossier

| Fichier | Contenu |
|---|---|
| `supabase/schema.sql` | Schéma métier complet + PostGIS + Realtime sur `deliveries`, `delivery_events`, `vehicle_positions`, `notifications` + triggers (stats chauffeur, timeline, numérotation des factures) |
| `supabase/policies.sql` | 33 policies RLS : isolation par tenant, portail client restreint à **ses** livraisons/factures, écriture selon les 5 rôles, tables enfants via la table parente, + fonction `provision_tenant()` pour onboarder une nouvelle entreprise |
| `supabase/storage.sql` | 3 buckets privés avec isolation par chemin `{tenant_id}/…` et URLs signées |
| `db/schema.postgres.sql` | Le même schéma, prêt pour un **Postgres dédié** (Neon, Scaleway) si vous quittez Supabase |

---

## 4. Coûts réels (2026)

| Plan | Prix | Quand |
|---|---|---|
| Free | 0 $ | prototype, démo client (projet mis en pause après 7 j d'inactivité) |
| **Pro** | **25 $/mois** | production : 8 Go disque, 100 Go fichiers, backups 7 j, 100 000 MAU |
| Team | 599 $/mois | SOC 2 + ISO 27001, SSO, contrôles d'accès projet |
| Compute supérieur | +10 à 100 $ | quand les KPI du dashboard tapent fort |

PITR (restauration à la seconde) est un add-on ≈ 100 $/mois : à prendre dès que vous avez de vrais clients qui paient.

---

## 5. Si vous préférez un Postgres nu (sans la plateforme)

Supabase est très bien, mais rien ne vous oblige à sa plateforme : `db/schema.postgres.sql` tourne tel quel sur **Neon**, **Scaleway Managed PostgreSQL** (souveraineté FR/UE) ou **OVH**. Vous gardez PostGIS + RLS, et vous ajoutez votre propre Auth (Auth.js/NextAuth) et stockage S3.

**C'est même le choix le plus « sortable »** : en cas de désaccord commercial avec Supabase, `pg_dump` puis restauration ailleurs, sans réécrire l'application.

---

## 6. Verdict

| Situation | Choix |
|---|---|
| ERP logistique, clients européens, deadlines courtes | **Supabase** (région Paris) |
| Vous voulez la souveraineté totale et un DBA | Postgres dédié (Neon/Scaleway) + `db/schema.postgres.sql` |
| App mobile grand public / chat temps réel | Firebase |
| Chat collaboratif, tableur temps réel, JS pur | Convex |

**Pour E-TOURÉ LOGISTICS ERP : Supabase, région `eu-west-3` (Paris).**
