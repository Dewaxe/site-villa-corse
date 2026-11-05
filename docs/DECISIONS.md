# Registre de décisions (ADR)

**Règle :** les points acceptés par William sont des besoins ou contraintes. Les choix de framework, stockage effectif et stratégies de déploiement sont encore **à valider par prototype**. Tout ADR technique comprend contexte, options, contraintes, décision, conséquences, preuves, date et réexamen éventuel.

## Décisions confirmées lors du cadrage (05/11/2026)

| ID | Décision | État |
| --- | --- | --- |
| D-001 | Site vitrine français ; la réservation se fait uniquement sur Amivac, nouvel onglet, sans réservation/calendrier/prix locaux | Validée |
| D-002 | Un accueil immersif en longue page ; pages d'articles détaillés et pages légales/admin si nécessaires | Validée |
| D-003 | Même niveau d'exigence desktop et smartphone ; ne pas imposer « mobile first » | Validée |
| D-004 | Une seule grande photo d'accueil particulièrement réussie ; menu classique discret | Validée |
| D-005 | Galerie filtrable par toutes les catégories convenues, photo plein écran, légendes, focale ajustable en admin | Validée |
| D-006 | Style chaleureux/authentique, professionnel et visuel, animations contenues ; références Villa Rosa et La Crique Magique | Validée |
| D-007 | Villa 30 m², 2–4 personnes, chambre lit double + salon canapé convertible, piscine **commune** 16 × 8 m uniquement | Validée |
| D-008 | Avis publics avec note, prénom, séjour mois-année, texte, sans e-mail ni compte ni interactions ; modération | Validée |
| D-009 | Éditeur admin autorisé à conserver extrait fidèle/correction mineure et importer avis historiques réels, avec transparence et origine | Validée avec garde-fous |
| D-010 | Admin William + propriétaire, comptes individuels et mêmes droits ; brouillon, preview, révisions, restauration, alertes | Validée |
| D-011 | Recommandations personnelles avec photos, fiches, distance, liens d'itinéraire, **articles détaillés** et éditeur riche | Validée |
| D-012 | FAQ sur **le séjour** et les alentours, éditable par admin | Validée |
| D-013 | Itinéraires animés, satellite/plan, pied/voiture et variantes, temps estimé animé, photos de points, carte agrandissable | Validée |
| D-014 | Crédits cartographiques et plan de secours acceptés | Validée |
| D-015 | Images originales conservées par le propriétaire hors site ; dérivés Web sur le site | Validée |
| D-016 | Budget absolu **0 € sans risque financier ni abonnement à dépassements**, quelques dizaines de visites/mois | Validée |
| D-017 | GitHub public, domaine `dempure.com` via sous-domaine encore non choisi, hébergement hors domicile | Validée |
| D-018 | Livraisons progressives sans date imposée ; 3D plus tard ; priorisation professionnelle selon besoins/risques | Validée |
| D-019 | Statistiques visites/visiteurs uniques **estimés** et clics vers Amivac ; approche vie privée | Validée |
| D-020 | Téléphone révélé au clic, appel mobile, e-mail par `mailto:`, pas de formulaire de contact | Validée |
| D-021 | Notion (4 bases déjà créées) et GitHub synchronisés automatiquement via Codex quand connecté, avec journal de compétences réel | Objectif accepté ; mécanisme technique à vérifier |
| D-022 | Éditeur du site = particulier louant occasionnellement son logement | Déclarée ; obligations exactes à contrôler |

## ADR techniques à produire en M0

### ADR-001 — Hébergement et stack full-stack

**Date :** 05/11/2026. **Statut :** proposé pour expérimentation M0, adoption à valider.

**Contexte.** Il faut des articles administrables dont le HTML est lisible par les robots, des photos Web versionnées et deux comptes d'administration à droits égaux. Le service doit fonctionner hors domicile, à 0 € sans carte ni dépassement facturable, avec IONOS comme DNS autoritatif.

**Décision proposée.** Prototyper Cloudflare Pages Free pour les fichiers statiques, Pages Functions pour les routes de l'article et de l'admin, D1 Free pour les révisions et sessions, et KV Free pour les dérivés Web immuables. Limiter l'invocation des Functions aux routes nécessaires. Le PoC commence en HTML simple et mesure le rendu serveur avant de retenir un framework. Astro statique reste une option pour les pages construites au build. L'adaptateur Astro Cloudflare actuel vise Workers et a retiré la prise en charge de Pages. [Documentation Astro](https://docs.astro.build/en/guides/integrations-guide/cloudflare/).

**Motifs et compromis.** Pages accepte un CNAME externe pour un sous-domaine. Le rendu ciblé rend une publication testable sans déclencher un nouveau build et garde le HTML, l'admin et les cookies sur la même origine. D1 permet de basculer la révision publiée avec un contrôle de concurrence. KV impose de gérer le délai de visibilité et la restauration des binaires indépendamment de SQL. La compression côté navigateur protège le budget CPU, et la validation serveur est une condition d'ouverture de l'upload. L'authentification sûre sous 10 ms de CPU est également une condition de passage. [Domaine Pages](https://developers.cloudflare.com/pages/configuration/custom-domains/), [CPU Workers](https://developers.cloudflare.com/workers/platform/limits/#cpu-time), [cohérence KV](https://developers.cloudflare.com/kv/concepts/how-kv-works/).

**Alternatives.** Netlify Free + Functions + Database + Blobs fournit un repli full-stack avec CNAME externe. Son plafond mensuel dur réduit le risque financier mais augmente le risque de suspension de l'ensemble du site. La publication statique sur Pages est un repli pour les articles si le rendu à la requête ne tient pas la charge. Elle ajoute un pipeline, un délai de build et une procédure de reprise. Workers directement sur le sous-domaine ne satisfait pas conjointement le budget et la conservation du DNS. R2 est écarté en raison de sa souscription avec dépassements facturables. [Comparaison chiffrée, sources et plan M0](M0.md).

**Preuves et réexamen.** Les conditions des offres et la procédure de DNS externe sont documentées. Revoir l'ADR après démonstration sur un environnement isolé, avec preuves de gratuité sur le compte, mesures CPU, tests de publication et d'accès, et restauration vérifiée. Le raccordement DNS effectif relève d'un jalon ultérieur. Lien de PR à renseigner après raccordement GitHub. La décision Notion existante est repérée, avec synchronisation en attente de confirmation de l'écriture.

### ADR-002 — Publication d'articles / indexation **OUVERT**

HTML dynamique serveur via Pages Functions **ou** pré-rendu déclenché à la publication. Comparer coût, cache, cohérence et séparation entre brouillon/publication. Vérifier via `curl` et test de robot.

### ADR-003 — Photos/versions/stocks KV **OUVERT**

Tester variantes Web, compression et limites, cache à cohérence éventuelle, purge des anciennes versions, export restaurable et consommation de l'offre gratuite.

### ADR-004 — Authentification/notifications **OUVERT**

Choisir stratégie session/passwords/anti-brute-force compatible runtime et méthode d'alerte au propriétaire sans risque de paiement, avec tests d'attaque et reprise.

### ADR-005 — Cartographie aérienne **OUVERT**

Étudier IGN WMTS/couverture Cargèse, attribution, fallback plan, bibliothèques de tracé et performance. Prototype tôt, implémentation finale M4.

### ADR-006 — Mesure visiteurs uniques sans profilage **OUVERT**

Méthode de décompte et limites, périmètre temporel, information RGPD, absence de cookie de mesure non exempté, résistance aux bots et preuve de clic Amivac.

## Format d'un nouvel ADR

`ID / Date / Statut / Problème / Contraintes / Options évaluées / Preuves et sources officielles / Décision / Conséquences / Alternatives rejetées et pourquoi / Risques résiduels / Liens GitHub + Notion / Date de révision.`

**Ne pas** marquer un ADR « accepté » sans validation de William lorsqu'il entraîne une nouvelle dépense, une migration DNS, une réduction importante de la qualité ou un changement de périmètre.
