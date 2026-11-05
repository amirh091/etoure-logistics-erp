# 🚀 E-TOURÉ LOGISTICS ERP — Guide de lancement & déploiement

Deux façons d'utiliser l'application : **en local** (pour développer) ou **en ligne** (pour la montrer / la vendre).

---

## 1. Utilisation immédiate (déjà prête)

| Quoi | Où |
|---|---|
| **Aperçu live** | Le serveur de dev tourne déjà → panneau « Aperçu / Preview » de l'interface (port **5173**) |
| **Identifiants** | `admin@etoure-logistics.eu` / `demo1234` — ou bouton **« Accès démo instantané »** |
| **Code source** | dossier `etoure-logistics-erp/` |
| **Build de production** | dossier `etoure-logistics-erp/dist/` (déjà compilé, 2 Mo) |

> Si l'aperçu est fermé, redémarrez-le : `cd etoure-logistics-erp && npm run dev -- --host 0.0.0.0`

---

## 2. En local sur votre ordinateur

### Prérequis
- **Node.js 18+** (20 recommandé) → https://nodejs.org
- npm (fourni avec Node)

### Installation
```bash
# 1. récupérer le dossier etoure-logistics-erp (téléchargement depuis l'espace de travail)
cd etoure-logistics-erp

# 2. installer les dépendances
npm install

# 3. lancer en développement
npm run dev
#    → http://localhost:5173
```

### Autres commandes
```bash
npm run build      # compile la version production dans /dist
npm run preview    # teste le build localement (http://localhost:4173)
```

⚠️ Ne copiez pas `node_modules/` ni `dist/` : `npm install` les régénère.

---

## 3. Mettre en ligne (le plus simple → Vercel / Netlify)

L'application est 100 % front **statique** : aucun serveur à gérer.

### Option A — Vercel (recommandé, gratuit)
1. Poussez le dossier sur GitHub.
2. https://vercel.com → *Add New Project* → importez le repo.
3. Réglages détectés automatiquement :
   - **Framework** : Vite
   - **Build command** : `npm run build`
   - **Output directory** : `dist`
4. *Deploy* → vous obtenez une URL `https://etoure-erp.vercel.app`.
5. Important : ajoutez un fichier `vercel.json` (fourni ci-dessous) pour que React Router fonctionne au rechargement.

### Option B — Netlify
- *New site from Git* → build `npm run build`, publish `dist`
- Ajoutez le fichier `public/_redirects` : `/*  /index.html  200`

### Option C — Hébergement classique (OVH, Hostinger, cPanel…)
1. `npm run build` sur votre machine.
2. Envoyez **le contenu de `dist/`** dans `public_html/` par FTP.
3. Ajoutez un `.htaccess` (fourni ci-dessous) pour les routes.

### Option D — Docker
```bash
docker build -t etoure-erp .
docker run -p 8080:80 etoure-erp
# → http://localhost:8080
```

---

## 4. Fichiers de configuration à ajouter (routes + PWA)

**`vercel.json`** (racine du projet)
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "headers": [
    { "source": "/sw.js", "headers": [{ "key": "Cache-Control", "value": "no-cache" }] }
  ]
}
```

**`public/_redirects`** (Netlify)
```
/*  /index.html  200
```

**`public/.htaccess`** (Apache / cPanel)
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

**`Dockerfile`** (optionnel)
```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
RUN printf 'server{listen 80;root /usr/share/nginx/html;location /{try_files $uri $uri/ /index.html;}}' > /etc/nginx/conf.d/default.conf
EXPOSE 80
```

---

## 5. Installer l'application sur téléphone / bureau (PWA)

Une fois en ligne **en HTTPS** (Vercel/Netlify le font d'office) :
- **Android / Chrome** : menu ⋮ → « Installer l'application » (ou bandeau « Installer » dans l'app)
- **iPhone / Safari** : Partager → « Sur l'écran d'accueil »
- **Windows / macOS / Chrome** : icône ⊕ dans la barre d'adresse

L'app s'ouvre alors comme une application native, avec cache hors-ligne.

---

## 6. Personnaliser avant mise en ligne

| À modifier | Fichier |
|---|---|
| Nom, adresse, TVA, IBAN de l'entreprise (factures PDF) | `src/data/seed.js` → `COMPANY` |
| Logo / icônes | `public/icons/` (192, 512, maskable) |
| Couleurs (marine, orange) | `src/styles.css` → bloc `:root` |
| Grille tarifaire IA | `src/lib/helpers.js` → `VEHICLE_RATES` et `estimateCost()` |
| Objectifs mensuels | `src/data/seed.js` → `TEAM_TARGETS` |
| Jeu de données de démo | `src/data/seed.js` (ou Administration → *Réinitialiser*) |

---

## 7. Passer d'une démo à un vrai SaaS (backend)

Aujourd'hui les données sont **persistées dans le navigateur** (`localStorage`) : parfait pour démontrer, pas pour du multi-utilisateurs réel.

```
Frontend React (existant)  ⇄  API REST  ⇄  MySQL
                              │
                              ├── Auth JWT + 2FA
                              ├── PDF serveur (optionnel)
                              └── SMS / E-mail / WhatsApp / GPS
```

Points de branchement déjà isolés dans le code :
- `src/store/StoreContext.jsx` → remplacer les `dispatch` par des appels API (React Query / fetch)
- `src/store/AuthContext.jsx` → `makeToken()` reçoit le vrai JWT du serveur
- `src/lib/helpers.js` → formats, IA tarifaire, génération PDF/Excel

Stack conseillée : **Node.js (NestJS/Express)** ou **Laravel** + **MySQL 8** + JWT + Twilio/SendGrid + Mapbox.
Hébergement type : Railway / Render / Scaleway (API) + Vercel (front) + S3 (documents).

---

## 8. Checklist go-live

- [ ] `npm run build` passe sans erreur
- [ ] Fichier de réécriture des routes en place (`vercel.json` / `_redirects` / `.htaccess`)
- [ ] HTTPS actif (obligatoire pour l'installation PWA)
- [ ] Identité société modifiée dans `COMPANY`
- [ ] Icônes remplacées par votre logo
- [ ] Test sur mobile : connexion, création de livraison, export PDF
- [ ] Sauvegarde / backend réel branché avant d'y mettre de vraies données clients

---

Besoin d'une étape concrète ? Dites-moi laquelle : **déploiement Vercel pas à pas**, **backend Node/MySQL réel**, ou **rebranding** (logo/couleurs/nom).
