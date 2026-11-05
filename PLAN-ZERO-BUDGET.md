# 💸 Plan Zéro Budget — lancer E-TOURÉ ERP avec 0 FCFA

> **La vérité d'abord : vous n'avez besoin d'aucun euro pour commencer.**
> Le logiciel est écrit, il fonctionne, il est installable. Ce qui manque n'est pas de l'argent : c'est **un premier client qui dise « combien ? »**.
> Tant que ce client n'existe pas, dépenser serait une erreur. Voici le chemin.

---

## 1. Ce qui est déjà payé : 0 FCFA

| Élément | Statut | Coût |
|---|---|---|
| Application React complète (10 modules) | ✅ écrite, testée | 0 |
| Démo fonctionnelle avec données réalistes | ✅ 16 clients, 10 chauffeurs, 85 livraisons | 0 |
| Calculs IA (estimation prix, prévision dépenses) | ✅ fonctionne dans le navigateur | 0 |
| Génération des factures / devis PDF | ✅ dans le navigateur | 0 |
| Export Excel / CSV | ✅ dans le navigateur | 0 |
| Mode sombre, PWA installable, responsive | ✅ | 0 |
| Schémas de base de données (Postgres + MySQL + Supabase) | ✅ prêts à exécuter | 0 |

Autrement dit : **votre produit de démonstration existe déjà et ne coûte rien à faire tourner.**

---

## 2. La stack gratuite pour la mise en ligne (vérifiée 2026)

| Besoin | Service gratuit | Quotas réels | Piège à connaître |
|---|---|---|---|
| Hébergement du site | **Cloudflare Pages** | requêtes et bande passante illimitées, 500 builds/mois | ✅ usage commercial **autorisé** |
| (alternative) | Netlify Free | 300 crédits/mois | surveiller la consommation |
| ⚠️ Vercel Hobby | 100 Go, 1 M requêtes | **interdit pour un usage commercial** → à éviter pour un SaaS vendu | |
| Base de données + Auth + Fichiers | **Supabase Free** | 500 Mo base, 1 Go fichiers, 5 Go transfert, 50 000 utilisateurs | ⚠️ **le projet se met en pause après 7 jours d'inactivité** |
| Emails transactionnels | **Brevo Free** | 300 emails/jour, contacts illimités | logo Brevo ajouté aux emails |
| (alternative) | Resend Free | 3 000 emails/mois (100/jour) | plafond journalier |
| Code source | **GitHub Free** | dépôts privés illimités | — |
| Carte / géolocalisation | **OpenStreetMap + Leaflet** | gratuit, sans clé API | ne pas utiliser Mapbox (payant au-delà du seuil) |
| Nom de domaine | sous-domaine gratuit | `etoure-erp.pages.dev` | le `.com` coûte ~8 000 FCFA/an (à prendre plus tard) |

**Total : 0 FCFA/mois.** Largement suffisant pour 1 à 3 entreprises clientes.

### Le piège Supabase et sa parade
Le projet gratuit s'endort après 7 jours sans activité. Parade gratuite : un « ping » automatique toutes les 3 jours via **GitHub Actions** (gratuit) qui fait une simple requête à la base.

```yaml
# .github/workflows/keepalive.yml
name: Keep Supabase Awake
on:
  schedule: [{ cron: '0 6 */3 * *' }]   # tous les 3 jours
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -s "${{ secrets.SUPABASE_URL }}/rest/v1/tenants?select=id&limit=1" \
            -H "apikey: ${{ secrets.SUPABASE_ANON_KEY }}"
```

---

## 3. L'ordre des choses (ne pas l'inverser)

```
1. Montrer la démo (0 F)      →  2. Un transporteur dit « intéressé »  →  3. Il paie un abonnement
                                                                                    ↓
                                        4. Cet argent paie Supabase Pro (15 000 F) et le domaine
```

Tant que l'étape 3 n'est pas franchie, **ne branchez pas Supabase en production**. Votre démo `localStorage` suffit : elle marche même **sans internet**, ce qui est un argument en réunion quand le wifi est mauvais.

> ⚠️ Ne passez pas vos 3 prochaines semaines à coder un backend. Un backend n'a jamais convaincu un client ; une démo qui tourne sur son téléphone, oui.

---

## 4. Comment vendre à Abidjan (votre marché réel)

Vos clients ne sont pas en Europe : ils sont à Marcory, Treichville, Yopougon, Adjamé. Ciblez :

| Segment | Pourquoi ça marche | Où les trouver |
|---|---|---|
| **Entreprises de déménagement** | devis, véhicules, chauffeurs, factures = exactement vos modules | pages Facebook/Instagram actives, annuaires, bouche-à-oreille |
| **Transporteurs / affrètement** | suivi de livraisons, rentabilité par camion | zones industrielles, Koumassi, Vridi |
| **Coursiers e-commerce** | gros volume, petites courses, besoin de suivi client | jeunes boutiques Instagram, vendeurs en ligne |
| **Distributeurs (boissons, agro)** | flotte + tournées + coûts carburant | grossistes d'Adjamé |

### Grille tarifaire réaliste (FCFA)
| Offre | Prix | Ce que ça couvre |
|---|---|---|
| Installation + formation (one-shot) | 75 000 – 150 000 F | votre premier cash, immédiat |
| Abonnement Standard | 25 000 – 40 000 F/mois | 1 à 5 utilisateurs |
| Abonnement Pro | 60 000 – 100 000 F/mois | flotte illimitée + portail client |
| Par livraison | 100 – 250 F/course | intéressant pour les coursiers |

**Un seul abonnement à 30 000 F/mois couvre Supabase Pro (≈15 000 F) + le domaine + il vous reste de la marge.** Vous n'avez donc jamais besoin de sortir d'argent de votre poche.

### Encaisser sans Stripe
Stripe n'est pas disponible en Côte d'Ivoire. Utilisez :
- **Wave / Orange Money / MTN MoMo** (mobile money, immédiat, zéro frais de mise en place)
- **CinetPay** ou **Paystack / Flutterwave** plus tard, pour encaisser par carte automatiquement
- Virement bancaire pour les entreprises structurées

---

## 5. Votre plan sur 7 jours (coût : 0)

| Jour | Action | Résultat attendu |
|---|---|---|
| 1 | Déployez la démo sur Cloudflare Pages (gratuit) → un lien à envoyer par WhatsApp | Vous avez une URL professionnelle |
| 2 | Personnalisez : nom, logo, couleurs, et **remplacez les données démo par celles d'un vrai prospect** | La démo devient « son » entreprise |
| 3 | Liste de 30 transporteurs/déménageurs à Abidjan (nom + numéro) | Un carnet de prospection |
| 4-5 | Envoyez la démo personnalisée à 10 prospects avec un message court | 2-4 réponses |
| 6 | Rendez-vous : montrez sur **votre téléphone** (mode sombre + PWA installée) | Effet « wow » |
| 7 | Proposez l'installation à 75 000 F + abonnement 30 000 F/mois | Premier contrat |

Message WhatsApp type :
> Bonjour M. X, j'ai développé un logiciel de gestion pour les entreprises de transport. Je vous ai préparé une démo **avec le nom de votre société** : [lien]. Vous y verrez vos livraisons, vos chauffeurs, vos véhicules et vos factures PDF. 5 minutes de démonstration suffisent — quand êtes-vous disponible ?

---

## 6. Quand dépenser (déclencheurs précis)

| Dépense | Prix | Vous payez **seulement quand**… |
|---|---|---|
| Nom de domaine `.com` | ~8 000 F/an | vous avez un premier client (crédibilité) |
| Supabase Pro | 25 $/mois ≈ 15 000 F | vos données sont de vraies données clients (plus de pause, backups) |
| SMS (Twilio/Termii) | ~25 F/SMS | un client paie explicitement les SMS de suivi |
| WhatsApp Business API | variable | un client grand compte l'exige |
| Google Play / App Store | 25 $ / 99 $ | jamais au début : la PWA s'installe sans store |
| Mapbox | payant au-delà du seuil | jamais : OpenStreetMap suffit |

**Règle d'or : aucune dépense avant le premier encaissement. Chaque euro dépensé doit être justifié par un client qui paie.**

---

## 7. Ce qu'il ne faut PAS faire

| ❌ Erreur | Pourquoi |
|---|---|
| Payer un hébergement avant d'avoir un client | vous financez un produit que personne n'a demandé |
| Coder le backend maintenant | 3 semaines de travail pour zéro client ; la démo suffit à vendre |
| Enregistrer une société / marque tout de suite | faites-le après la première rentrée d'argent |
| Créer une app mobile native | la PWA installable fait le même effet, gratuitement |
| Baisser vos prix à 5 000 F | vous attirez les clients les plus exigeants et les moins solvables |
| Vendre « un logiciel » | vendez « vos livraisons suivies et vos factures prêtes » — le bénéfice, pas la technologie |

---

## 8. Où trouver les compétences si vous bloquez

- **Vous-même** : le code est écrit, vous avez la documentation.
- **Communauté** : groupes Facebook/Discord de développeurs ivoiriens, forums React.
- **Échange** : un développeur débutant contre un peu d'équity ou un service gratuit — souvent plus pertinent que de payer.
- **Moi, ici même** : dites-moi l'étape qui bloque, je vous donne le code exact.

---

## En résumé

| Question | Réponse |
|---|---|
| J'ai 0 F, est-ce que je peux continuer ? | **Oui.** La démo est prête et gratuite à héberger (Cloudflare Pages). |
| Dois-je payer Supabase maintenant ? | **Non.** Seulement après le 1er client payant (15 000 F/mois, couvert par un abonnement à 30 000 F). |
| Quelle est la prochaine action concrète ? | Mettre la démo en ligne sur Cloudflare Pages et envoyer le lien à 10 transporteurs d'Abidjan. |
| Et si personne ne veut payer ? | Vous aurez perdu 0 F et vous aurez appris ce qui manque — bien mieux que 6 mois de code sans feed-back. |

**Le chemin : démo en ligne (0 F) → 10 prospects → 1 client à 75 000 F → Supabase Pro payé par ce client.**
