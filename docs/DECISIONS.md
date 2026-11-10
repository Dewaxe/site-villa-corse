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

**Essai local.** Une session admin publie le brouillon. L'URL publique répond 404 avant publication, puis un lecteur HTTP reçoit titre, description, URL canonique et corps échappé sans JavaScript. D1 rejette une mise à jour concurrente du pointeur de publication. La restauration retrouve le HTML et le SHA-256 de l'image de V1. Voir le [démonstrateur local](../prototypes/m0-pages/benchmarks/session/README.md).

### ADR-003 — Photos/versions/stocks KV **OUVERT**

Tester variantes Web, compression et limites, cache à cohérence éventuelle, purge des anciennes versions, export restaurable et consommation de l'offre gratuite.

**Essai local.** Le navigateur réencode en WebP. Le serveur borne le multipart à 260 ko et l'image à 250 ko et 1 600 px par côté, vérifie le conteneur VP8 simple et refuse les métadonnées. Les images sont décodées dans Edge. KV conserve une clé immuable par révision. Les pannes injectées bloquent l'upload ou la publication. Une image publiée momentanément introuvable utilise un visuel de secours sans cache. La validation complète du bitstream, la propagation en preview et la procédure de sauvegarde hébergée restent ouvertes.

**Sauvegarde locale testée.** Un export hors ligne a réuni deux révisions D1, le pointeur publié et deux binaires KV avec SHA-256. L'import dans un état local neuf restitue les mêmes réponses HTML et WebP, sans réintroduire les clés d'accès, défis ou sessions. Un média absent ou modifié est refusé avant création de la cible. Voir les [commandes de restauration](../prototypes/m0-pages/benchmarks/session/README.md). La copie privée en environnement hébergé et le retour de déploiement restent à vérifier.

### ADR-004 — Authentification/notifications **OUVERT**

Choisir stratégie session/passwords/anti-brute-force compatible runtime et méthode d'alerte au propriétaire sans risque de paiement, avec tests d'attaque et reprise.

**Essai local du 10/11/2026.** Le [banc reproductible](../prototypes/m0-pages/benchmarks/kdf/README.md) mesure 345,2 ms de latence médiane pour PBKDF2-SHA256 à 600 000 itérations et 189,7 ms pour scrypt N=32768, r=8, p=3. Le témoin sans dérivation mesure 4,4 ms. Ces latences HTTP locales ne mesurent pas le CPU comptabilisé sur Workers Free. Elles suffisent à différer le login par mot de passe tant qu'une piste robuste n'a pas démontré une marge suffisante. Cloudflare ne prend pas en charge Argon2 dans `node:crypto`. Une implémentation WASM reste à évaluer si le mot de passe doit être conservé. [OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html), [Workers crypto](https://developers.cloudflare.com/workers/runtime-apis/nodejs/crypto/), [limite CPU](https://developers.cloudflare.com/workers/platform/limits/#cpu-time).

**Suite proposée.** Comparer une clé d'accès WebAuthn, dont le serveur vérifie une signature. Vérifier l'enrôlement privé de deux comptes, le défi à usage unique, l'origine, le RP ID, les sessions révocables et la récupération en cas de perte. Garder l'ADR ouvert jusqu'à validation de l'expérience et du budget CPU. Cloudflare Zero Trust Free est écarté à ce stade, car son parcours d'inscription documenté exige des informations de paiement. Le choix du canal de notification reste ouvert. [WebAuthn](https://www.w3.org/TR/webauthn-2/), [inscription Cloudflare Zero Trust](https://developers.cloudflare.com/cloudflare-one/setup/).

**Essai WebAuthn local.** Deux identités fictives passent la vérification ES256 avec le même rôle. Les tests refusent une mauvaise origine, un mauvais RP ID, un mauvais défi, une réponse sans vérification utilisateur et une signature faite avec la clé de l'autre identité. Deux soumissions simultanées du même défi donnent un succès et un refus dans le même isolate. La médiane HTTP de la vérification seule est de 5,6 ms sur dix requêtes, contre 189,7 ms pour scrypt dans l'essai précédent. La latence locale reste distincte du CPU en preview. Voir le [banc WebAuthn](../prototypes/m0-pages/benchmarks/webauthn/README.md).

**Suite à vérifier.** Tester l'enrôlement et la connexion en navigateur avec deux comptes préautorisés. Stocker les défis à usage unique et les sessions révocables dans D1 avec une consommation atomique des défis. Essayer une deuxième clé d'accès par compte sur un appareil indépendant et la révocation de la clé perdue, puis définir un réenrôlement contrôlé si les deux clés sont perdues. Ces parcours et le budget CPU doivent être démontrés avant l'adoption.

**Parcours Edge et D1 local.** Deux comptes fictifs ont chacun enrôlé une clé et ouvert une session dans Edge avec un authentificateur virtuel. D1 consomme le défi atomiquement. Sur deux vérifications concurrentes de la même assertion, une seule réussit. Le cookie de session est protégé, son empreinte est stockée en base, et les anciens cookies sont refusés après reconnexion et déconnexion. Un logout provenant d'une autre origine est refusé. Voir le [démonstrateur](../prototypes/m0-pages/benchmarks/session/README.md). Les clés de secours et le réenrôlement, l'expiration en conditions réelles, les appareils physiques, les limites de requêtes et le CPU en preview restent à vérifier.

**Récupération locale avec une clé de secours.** Dans Edge, un authentificateur interne virtuel et une clé USB virtuelle ont été enrôlés sur le même compte. Après retrait du premier et effacement du cookie navigateur, la deuxième clé a permis la connexion. La révocation a invalidé une assertion préparée avec la clé perdue et sa session encore active. La session créée avec la clé de secours reste valide. D1 refuse de supprimer la dernière clé. La migration a aussi été vérifiée en SQLite avec une clé et une session déjà présentes. L'enrôlement de secours et la révocation s'appuient sur la session de démonstration. Avant une preview, il faut qualifier la réauthentification récente, le débit et le parcours sur appareils physiques. En cas de perte des deux clés, la piste à instruire est un réenrôlement supervisé après vérification de l'identité, avec invalidation des sessions existantes.

### ADR-005 — Cartographie aérienne **OUVERT**

Étudier IGN WMTS/couverture Cargèse, attribution, fallback plan, bibliothèques de tracé et performance. Prototype tôt, implémentation finale M4.

### ADR-006 — Mesure visiteurs uniques sans profilage **OUVERT**

Méthode de décompte et limites, périmètre temporel, information RGPD, absence de cookie de mesure non exempté, résistance aux bots et preuve de clic Amivac.

## Format d'un nouvel ADR

`ID / Date / Statut / Problème / Contraintes / Options évaluées / Preuves et sources officielles / Décision / Conséquences / Alternatives rejetées et pourquoi / Risques résiduels / Liens GitHub + Notion / Date de révision.`

**Ne pas** marquer un ADR « accepté » sans validation de William lorsqu'il entraîne une nouvelle dépense, une migration DNS, une réduction importante de la qualité ou un changement de périmètre.
