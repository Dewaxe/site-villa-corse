# Contrat qualité mesurable

**Principe :** chaque critère doit préciser **comment** il est vérifié, sur **quel environnement**, et qui accepte le résultat. Les chiffres sont des cibles initiales à confirmer après mesures, pas des performances déjà atteintes.

## Definition of Ready (avant développement)

- Besoin compréhensible, critères d'acceptation et cas d'erreur listés.
- Dépendances, coût gratuit, impact sécurité/RGPD et responsive évalués.
- Contenus nécessaires disponibles ou placeholders explicités.
- Tests envisagés et point d'apprentissage identifié.

## Definition of Done (avant fermeture d'une issue)

- Fonction conforme aux critères, revue par William si indiquée.
- Typage, lint, format, tests automatiques, build et vérifications manuelles pertinents passés.
- Aucun secret dans Git, pas de vulnérabilité élevée/critique connue non traitée dans le chemin exposé.
- UX desktop/mobile et clavier testée pour les modifications d'interface.
- Documentations/règles/ADR mis à jour, lien PR/commit, apprentissages enregistrés dans Notion.
- Pas de régression ou de bug bloquant connu ; état de déploiement honnêtement indiqué.

## Mesures et objectifs

| Axe | Cible initiale | Vérification |
| --- | --- | --- |
| Core Web Vitals | LCP ≤ **2,5 s**, INP ≤ **200 ms**, CLS ≤ **0,1** au 75e percentile, séparément mobile/desktop | Vraies mesures quand le trafic le permet ; audits synthétiques avant |
| Lighthouse Performance | **≥ 90/100 visé** sur pages représentatives en environnements définis, mobile et desktop | Lighthouse CI, version et réseau enregistrés ; les fluctuations demandent enquête |
| Accessibility | **WCAG 2.2 niveau AA visé**, pas de blocage majeur, navigation clavier intégrale | Axe + tests manuels lecteur d'écran et zoom |
| SEO | Pages publiques indexables, `title` unique, description, canonical, sitemap, alt utiles, aucune erreur critique | Inspection HTML brut, Lighthouse SEO, tests de robots |
| Sécurité | **0** faille critique/haute non traitée dans les dépendances exposées ; tests authz/rate-limit/CSRF/XSS | Audit dépendances + tests d'intrusion ciblés |
| Code | Type-check, lint, format et build sans erreur ; couverture ciblée des règles métiers | CI par PR |
| Images | Hero optimisée, variantes adaptées, images non visibles chargées à la demande ; **100 photos ne chargent pas toutes à l'ouverture** | DevTools Network desktop/mobile, test 100 images |
| Responsive | Aucune fonction publique ou admin essentielle inaccessible sur mobile ; pas de débordement horizontal | Playwright tailles smartphone/tablette/desktop |
| Formulaires | Messages d'erreur compréhensibles, validation serveur et client, anti-spam ; pas de double soumission non voulue | Tests unitaires/e2e et essais manuels |
| Exploitation | Chaque publication récupérable ; procédure de restauration testée ; 0 € confirmé | Exercice de restauration et vérification quotas |
| Confidentialité | Pas de traceurs non nécessaires sans base/consentement adapté ; infos légales accessibles | Audit réseau cookies/SDK/scripts |

Les seuils CWV proviennent de https://web.dev/articles/vitals/ ; la norme WCAG de https://www.w3.org/TR/WCAG22/ . Dans un site à quelques dizaines de visites mensuelles, un percentile réel sur 28 jours pourra être statistiquement peu fiable : ne pas inventer de chiffres, utiliser des essais synthétiques documentés.

## Matrice minimale de test manuel

- **Desktop :** Chrome, Firefox, Edge actuels à largeur 1280–1920 px.
- **Smartphone :** Safari iOS (appareil réel dès que possible), Chrome Android (appareil réel ou émulation + complément réel), largeur 320–430 px.
- **Tablette :** largeur intermédiaire autour de 768–1024 px.
- **Accessibilité :** navigation clavier complète, focus visible, zoom à 200 %, lecteur d'écran sur au moins un environnement, couleurs/contrastes, `prefers-reduced-motion`.
- **Réseau :** 3G/4G simulé et hors ligne/dégradation API selon fonctionnalité.
- **Grand contenu :** galerie de 100 images, longs articles, FAQ abondante, texte d'avis long, liens invalides/erreurs réseau.

## Pyramide de tests

- **Unitaires :** calcul d'itinéraire animé/temps, formats de date, tri photos, validation formulaires, transforms de contenu, règles de modération, estimation statistiques.
- **Intégration :** API + D1/KV local simulé ou dev, migrations, sessions/permissions, publication, aperçu, erreurs quota, rollback.
- **E2E Playwright :** parcours visiteur, lien Amivac, filtres/zoom, article, FAQ, avis soumis puis invisibles, admin publication, media, mobile et clavier.
- **Sécurité :** utilisateur non authentifié interdit sur chaque endpoint, CSRF, brute-force, limites fichiers, XSS dans éditeur/avis, URL externe invalides.
- **Visual regression :** captures ciblées desktop + smartphone ; corrections de design validées par William.

## CI minimale

À chaque PR : installation reproductible et verrouillée, format-check, lint, type-check, unitaires/intégration, build, tests e2e pertinents et sécurité dépendances. Toutes les commandes sont définies dans `package.json` après le choix de stack ; ne pas simuler des scripts inexistants.

Branches protégées / PR review selon les capacités gratuites et permissions du dépôt ; éviter déploiement en production avant validations. Échecs de CI bloquants pour fusion sauf décision écrite exceptionnelle justifiée.

## Validation pédagogique

Chaque PR note : problème, approche, raisons, 1–3 concepts appris, alternatives, cas limites, commandes exécutées et comportement observé. William peut demander une démonstration avant validation. Les apprentissages dans Notion citent des lignes/commits/tâches réels, pas des intitulés génériques.
