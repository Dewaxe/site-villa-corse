# Architecture — hypothèses, comparaison et décision différée

**Statut : ARCHITECTURE CANDIDATE, NON VALIDÉE.** Ne pas considérer les services ni le framework comme choisis définitivement avant le prototype M0. Les prix et limites ci-dessous ont été vérifiés sur la documentation officielle au 05/11/2026 ; les revérifier lors de la mise en service.

## Contraintes non négociables

1. **0 € sans activation de facturation automatique** ; si quota dépassé, accepter un refus contrôlé et une alerte, pas un paiement.
2. Sous-domaine encore non choisi de `dempure.com` ; DNS actuellement géré chez IONOS, garder opérationnels `william.dempure.com` et `drop.dempure.com`.
3. Dépôt public, deux administrateurs, contenus éditables et versionnés, uploads de plus de cent images Web, avis modérés, page d'articles utile à la recherche, statistiques, sauvegarde.
4. Disponibilité indépendante du Raspberry et du courant/réseau domestique.
5. Bonne expérience desktop + mobile, SEO réel et sécurité raisonnable pour une petite application.

## Architecture favorite à vérifier

| Couche | Candidate | Motivation et condition |
| --- | --- | --- |
| Site public | Cloudflare Pages Free | Fichiers statiques rapides, GitHub deploy, domaine externe par CNAME ; 25 MiB par asset, 20 000 fichiers sur Free |
| Fonctions serveur | Cloudflare Pages Functions / runtime Workers Free | API same-origin sur le sous-domaine : login, avis, administration, métriques, endpoints dynamiques |
| Données structurées | Cloudflare D1 Free | SQLite managé : contenus, avis, comptes, révisions, publications, FAQ, stats ; limites gratuites de lecture/écriture/stockage |
| Images Web | Workers KV Free | 1 Go total, 100 000 lectures, 1 000 écritures/jour, limite 25 MiB/objet ; **fichiers immuables/versionnés**, purge contrôlée |
| Anti-spam | Cloudflare Turnstile Free | Vérification serveur des tokens, combinée avec limitation de débit |
| Carte | Orthophotos/WMTS IGN Géoplateforme + plan de repli | Piste gratuite à tester, attribution/licence, couverture et performance en Corse |
| Référentiel et CI | GitHub public + GitHub Actions | Code et documentation versionnés, contrôles automatiques ; pas de secrets ni données locataires dans Git |
| Pilotage | Notion (4 bases existantes) | Avancement, décisions, apprentissages, jalons ; mise à jour depuis Codex, automatismes vérifiés |

**Données critiques :** D1 sur Free cesse de traiter des requêtes si les quotas sont atteints ; Workers KV refuse également les opérations excédentaires. Prévoir erreurs compréhensibles, compteur de volume, seuils internes et plan de maintenance, plutôt que paiement.

**Attention :** ne pas utiliser R2 sous son offre « 10 Go gratuits » comme solution définitive à budget strict : l'activation demande un abonnement et des dépassements peuvent être facturés. Aucune carte ni activation R2 sans nouvel accord explicite.

## Décision de framework à mener en M0

**A — Site construit statiquement + fonctions API sur Cloudflare Pages.** Deux pistes à prototyper :

- Astro en génération **statique**, éventuellement des composants interactifs ciblés pour galerie/admin/cartes, plus Pages Functions ; vérifier comment rendre indexables les nouveaux articles créés via l'admin.
- Vite avec composants choisis selon besoins (React ou alternative) et HTML pré-rendu/SSR ciblé via Pages Functions ; évaluer duplication de rendu, maintenabilité et SEO.

**B — Astro avec rendu dynamique sur Cloudflare Workers.** Les versions récentes de `@astrojs/cloudflare` ne supportent plus le déploiement SSR sur Pages ; Workers custom domains demandent une zone Cloudflare active, potentiellement migration DNS. Ne **pas** imposer cette migration sans l'accord distinct de William : les autres sous-domaines sont en service.

**C — CMS externe gratuit.** Comparer véritable coût, risque de veille/suspension, contrôle des données, sécurité, quotas, compatibilité sous-domaine et nécessité de carte. Écarter si la gratuité durable ou les fonctions admin ne sont pas démontrées.

Une matrice de décision doit comparer : conformité au budget, DNS, simplicité de maintenance, SEO de pages éditables, isolation du privé, flux photo, preview, rollback, complexité du front, tests. Un ADR est obligatoire.

## Questions à démontrer en prototype technique (critères de passage)

1. Un environnement de prévisualisation Pages avec API côté serveur et bindings D1 + KV fonctionne gratuitement.
2. Un petit formulaire admin de **démonstration** peut envoyer une image Web, validée serveur, stockée en KV sous une **clé nouvelle** et visible depuis le site après publication sans incohérence de cache.
3. Une fiche d'article créée depuis le navigateur est accessible à une URL publique avec `title`, méta-description, contenu HTML et informations exploitables par un robot sans exécuter JavaScript ; montrer le HTML reçu par `curl`.
4. Une session admin non accessible aux visiteurs empêche l'édition côté serveur (tests d'accès).
5. Une version antérieure de contenu peut être restaurée ; un export privé D1 et le lien médias peuvent être rétablis.
6. Le domaine externe d'IONOS peut servir une URL Pages via CNAME **sans changer les NS** (documenter uniquement, ne pas modifier le DNS en M0).
7. La carte IGN affiche une orthophoto couvrant la zone de Cargèse avec crédit correct, et permet de dessiner un tracé test ; sinon documenter un repli.
8. Aucune opération n'a nécessité l'activation de facturation.

## Principes de conception backend

- API séparée en modules cohérents : `auth`, `content`, `media`, `reviews`, `analytics`, `admin` ; données validées avec schémas serveur.
- Éviter une architecture microservices ou un Docker/cluster non justifié. Les composants ne sont choisis que pour une valeur réelle.
- Public majoritairement statique ou cacheable ; seulement les interactions nécessaires sont dynamiques. Cache explicitement invalidé à la publication.
- Environnements `local`, `preview`, `production` ; données et secrets séparés. Les comptes démo ne doivent pas devenir comptes de production.
- Migrations SQL versionnées, rollback testé. Export JSON/SQL privé versionné hors Git. Mode lecture seule possible en maintenance.

## Modèle conceptuel de données proposé

| Entité | Champs essentiels / règles |
| --- | --- |
| `admin_user` | id, login unique, mot de passe dérivé sécurisé, statut, dates ; deux comptes personnels |
| `session` | identifiant opaque haché, user_id, expiration, révocation ; cookie sécurisé HttpOnly |
| `content_revision` | id, type, entity_id, auteur, date, contenu JSON validé, parent, statut |
| `page_content` | id, slug, titre, corps, revision_publiée, revision_brouillon, version/optimistic lock |
| `photo` | id, clés KV de variantes immuables, catégorie, ordre, légende, alt, focal point, statut, métadonnées de droit |
| `recommendation` | id, slug unique, titre, extrait, corps structuré, photos, distance/mode, status, dates |
| `faq` | id, question, réponse, catégorie, ordre, statut, révision |
| `review` | id, prénom, note 1–5, séjour mois-année, commentaire original, présentation fidèle, statut, origine, date, consentement, actions de modération |
| `route` | id, mode, destination, variantes, tracé GeoJSON, temps estimé sourcé, points photo, date de vérification |
| `audit_event` | acteur, action, objet, horodatage, avant/après selon minimisation et politique de rétention |
| `analytics_day` | date, visites, visiteurs estimés/méthode, clics Amivac ; agrégats sans profils individuels |

Pas de données personnelles de visiteurs dans des logs publics, Notion ou Git. Ne pas stocker l'adresse e-mail des visiteurs (le formulaire d'avis n'en demande pas).

## Gestion des images (KV)

- Sauvegarder **les originaux ailleurs**, sous la responsabilité du propriétaire ; ne pousser que des variantes Web optimisées et avec limites configurables.
- Enregistrer côté KV des clés **nouvelles et immuables** par version (par exemple `photos/<id>/<version>/<variant>.webp`) ; publier dans D1 la référence après validation de l'écriture.
- KV étant à cohérence éventuelle, une mise à jour de la même clé peut être temporairement incohérente ; ne pas écraser les mêmes clés, prévoir délai/état « traitement » et test de disponibilité avant publication.
- Traiter les images côté navigateur si pertinent pour rester dans les quotas CPU ; vérification MIME/signature/taille et limites côté serveur indispensables. Nettoyer métadonnées EXIF/GPS, vérifier rotation/cadrage, dédupliquer si souhaitable.
- Prévoir quota préventif et éventuelle purge des anciennes variantes **après** export et à l'issue de la fenêtre de restauration, avec confirmation, jamais de purge automatique dangereuse.
- Compter le volume projeté (plusieurs variantes par photo) ; quota 1 Go à surveiller. Ne pas stocker les originaux serveur.

## Publication et indexation

- Pages d'articles et métadonnées doivent être effectivement présentes dans le HTML rendu aux robots ; les simples composants JS avec contenu chargé après l'ouverture ne suffisent pas comme stratégie SEO.
- Approches à comparer : fonction de rendu HTML à la requête depuis D1 **ou** génération de pages statiques lors de la publication (avec déclenchement contrôlé de build).
- Sitemap, robots.txt, canonical, partage Open Graph, balisage sémantique, liens internes ; pas de `noindex` accidentel sur production.
- Brouillons jamais indexables ; preview protégée et explicitement non indexable.
- Veiller à ce que la publication et ses médias soient cohérents si une écriture ou un déploiement échoue.

## Hébergement / DNS

- **Cloudflare Pages custom subdomain** : le sous-domaine, une fois choisi et créé côté Pages, peut pointer via `CNAME` chez IONOS vers `<projet>.pages.dev`. L'apex du domaine n'est pas déplacé. Enregistrer le nom dans Pages **avant** d'ajouter le CNAME et suivre les vérifications TLS.
- Ne pas confondre avec **Workers custom domain**, qui exige actuellement une zone Cloudflare active. Aucune migration de NS par défaut.
- GitHub reste la source de vérité du code. Documenter déploiement preview (PR), production (branche protégée), et retour arrière (déploiement précédent).

## Carte / itinéraires

- Étudier IGN WMTS `ORTHOIMAGERY.ORTHOPHOTOS`, données sous licence ouverte et attribution correcte ; tester techniquement MapLibre/Leaflet et navigateur mobile. Ne jamais réutiliser illégalement des captures Google Maps/Street View.
- Les trajets sont des GeoJSON définis par le propriétaire ; l'animation interpole le tracé. Les temps sont **estimés** et préalablement vérifiés ; pas de routage temps réel implicite.
- Prévoir couche plan, description textuelle accessible, pas de cartes tierces chargées avant besoin, et mention des contributeurs.

## Sources officielles à reconsulter à chaque décision

- Pages custom domains : https://developers.cloudflare.com/pages/configuration/custom-domains/
- Pages Functions bindings : https://developers.cloudflare.com/pages/functions/bindings/
- Pages limits : https://developers.cloudflare.com/pages/platform/limits/
- D1 pricing/limits : https://developers.cloudflare.com/d1/platform/pricing/ et https://developers.cloudflare.com/d1/platform/limits/
- KV pricing/limits : https://developers.cloudflare.com/kv/platform/pricing/ et https://developers.cloudflare.com/kv/platform/limits/
- KV cohérence éventuelle : https://developers.cloudflare.com/kv/concepts/how-kv-works/
- R2 nécessite abonnement : https://developers.cloudflare.com/r2/get-started/
- Astro Cloudflare adapter : https://docs.astro.build/en/guides/integrations-guide/cloudflare/
- Workers custom domain : https://developers.cloudflare.com/workers/configuration/routing/custom-domains/
- IGN WMTS : https://cartes.gouv.fr/aide/fr/guides-utilisateur/utiliser-les-services-de-la-geoplateforme/diffusion/wmts/
- IGN CGU : https://cartes.gouv.fr/cgu/
