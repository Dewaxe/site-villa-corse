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

**Décodage à vérifier.** Un test conserve les en-têtes et la première partition VP8, puis retire les données de pixels. Le filtre structurel accepte ce WebP et Edge refuse de le décoder. Écarter le paquet jSquash WebP examiné, dont la [mise à niveau de libwebp](https://github.com/jamsinclair/jSquash/pull/114) reste ouverte. Tester un décodeur maintenu, par exemple [image-webp compilé en Wasm](https://github.com/image-rs/image-webp), avec les images valides aux bornes et les fichiers corrompus avant toute écriture en stockage. La mesure du CPU d'upload attend ce contrôle.

**Décodage local.** `image-webp` 0.2.4 compilé en Wasm décode deux fichiers VP8 jusqu’à 1 600 × 1 600 et refuse leurs versions tronquées dans Wrangler. OSV ne signale aucun avis pour les trois versions verrouillées. En preview, le p95 atteint 25,371 ms à 320 × 320 et les médianes par seconde dépassent 100 ms à 1 600 × 1 600. Cette implémentation dépasse le budget de 10 ms. Comparer une validation hors requête et une autre piste de décodage avant l’upload distant. [Banc WebP](../prototypes/m0-pages/benchmarks/webp-decoder/README.md).

**Sauvegarde locale testée.** Un export hors ligne a réuni deux révisions D1, le pointeur publié et deux binaires KV avec SHA-256. L'import dans un état local neuf restitue les mêmes réponses HTML et WebP, sans réintroduire les clés d'accès, défis ou sessions. Un média absent ou modifié est refusé avant création de la cible. Voir les [commandes de restauration](../prototypes/m0-pages/benchmarks/session/README.md). La copie privée en environnement hébergé et le retour de déploiement restent à vérifier.

#### Validation des images après la mesure CPU

| Option | Effet pour les administrateurs | Condition ou compromis |
| --- | --- | --- |
| Pages → Worker privé → binding Cloudflare Images | Conserve le dépôt de photo dans l’admin pour les deux comptes. La Function transmet les octets privés, puis conserve uniquement la sortie réencodée. | Images Free documente 5 000 transformations uniques par mois sans dépassement facturé. Le binding Images est documenté pour Workers, et Pages peut appeler ce Worker via un Service Binding. Vérifier l’accès sans carte sur le compte, le CPU restant et le traitement des fichiers tronqués. [Tarifs](https://developers.cloudflare.com/images/pricing/) · [Binding Images](https://developers.cloudflare.com/images/optimization/binding/) · [Bindings Pages](https://developers.cloudflare.com/pages/functions/bindings/). |
| Validation hors requête dans un outil local | Les deux comptes gardent le droit de publier. Le geste de publication exige un outil local ou une intervention supplémentaire pour chaque image. | Le validateur décode et réencode. L’approbation doit être liée à l’empreinte du dérivé et à sa révision. Le serveur vérifie cette preuve avant de publier. Le terminal doit disposer de l’outil et d’un accès d’administration autorisé. |
| Validation hors requête par GitHub Actions | Peut conserver une publication depuis l’admin, avec état « en attente » et délai d’exécution. | Les runners standard sont gratuits pour un dépôt public. Il faut un déclenchement authentifié, une zone de transit privée, des identités techniques et une reprise idempotente. Les originaux ne doivent jamais apparaître dans les commits, journaux ou artefacts publics. [Facturation Actions](https://docs.github.com/en/actions/concepts/billing-and-usage). |
| Autre décodeur Wasm dans Pages | Même parcours d’administration, avec moins de services. | Un décodeur maintenu doit réussir les cas limites dans le budget. La petite image a déjà atteint 25,371 ms au p95 avec le candidat Rust actuel. Réduire seulement la taille est un compromis visuel dont le gain CPU reste à mesurer. |

**Ordre proposé.** Qualifier d’abord le binding Images Free via un Worker de service privé, car il préserve le parcours des deux administrateurs et délègue le traitement des pixels. Utiliser une transformation et un réencodage complets pour vérifier les octets produits. Une lecture de dimensions via `.info()` ne constitue pas cette preuve. Garder l’outil local comme solution de repli, puis envisager GitHub Actions uniquement si la validation locale est trop contraignante. Cette proposition conserve le DNS IONOS et reste ouverte jusqu’à l’essai.

**Premier essai du binding.** Wrangler local produit un WebP lisible à 320 × 320. Le flux tronqué et les pannes simulées sont refusés. Le dérivé local de la grande image dépasse le poids autorisé. Le plan du compte, le comportement réel et le CPU hébergé restent à qualifier. [Banc et limites](../prototypes/m0-pages/benchmarks/images-binding/README.md).

**Arbitrage sur le compte de test.** Le tableau de bord demande une carte pour activer Cloudflare Images. L’option est écartée pour M0. William souhaite conserver le même nombre de manipulations pour les deux administrateurs. Prototyper en priorité le traitement automatique via GitHub Actions standard sur le dépôt public, en gardant les octets hors du dépôt et des artefacts. L’outil local manuel reste une variante qui modifierait le parcours admin.

**Publication différée locale.** Le banc SQLite/Wasm lie un résultat à la révision et à l’empreinte du fichier. Un flux tronqué, une panne ou une empreinte différente laissent la publication intacte. Le changement de version est atomique et le résultat rejoué est sans effet supplémentaire. Le transfert authentifié, le réencodage et GitHub Actions restent à vérifier. [Banc](../prototypes/m0-pages/benchmarks/image-publication/README.md).

**Transfert GitHub réel.** Un runner standard a récupéré et décodé une image fictive en mémoire, puis confirmé le résultat deux fois à Pages. D1 confirme le témoin et aucun artefact n’a été créé. Le secret GitHub temporaire a été supprimé. Le déclenchement par l’admin, le transit par révision et le réencodage restent ouverts. [Preuve](../prototypes/m0-pages/benchmarks/image-publication/README.md#transfert-privé-vérifié-sur-github-actions).

**Parcours automatique local.** Une demande HTTP admin déclenche le transfert privé et le réencodage Sharp 0.35.5. La transaction lie le source et le dérivé avant publication. Le flux tronqué et les mauvaises empreintes sont refusés. La délégation GitHub et le parcours D1/KV réel restent à raccorder. [Banc](../prototypes/m0-pages/benchmarks/image-publication/README.md#demande-et-réencodage-automatiques-en-local).

**Demandes persistantes.** Le handler article peut enregistrer une demande D1 unique et appeler un déclencheur injecté. Le dérivé reçoit une clé KV immuable et une nouvelle révision. Les résultats périmés ou rejoués ne modifient pas une publication plus récente. La sauvegarde suit la clé effective du média. Le Worker d’admin reste à raccorder au déclencheur GitHub. [Test des handlers](../prototypes/m0-pages/benchmarks/image-publication/README.md#demandes-persistantes-avec-le-schéma-d1).

**Raccordement au workflow.** Le Worker admin peut déclencher GitHub avec un identifiant opaque, et les routes de transfert et de retour exigent un secret distinct. Le navigateur suit la demande après un seul clic. Les tests locaux des handlers passent et GitHub accepte le déclenchement de contrôle sur la branche M0. La délégation limitée et le clic en preview restent à vérifier. [Protocole](../prototypes/m0-pages/benchmarks/image-publication/README.md#déclenchement-et-retour-de-résultat).

### ADR-004 — Authentification/notifications **OUVERT**

Choisir stratégie session/passwords/anti-brute-force compatible runtime et méthode d'alerte au propriétaire sans risque de paiement, avec tests d'attaque et reprise.

**Essai local du 10/11/2026.** Le [banc reproductible](../prototypes/m0-pages/benchmarks/kdf/README.md) mesure 345,2 ms de latence médiane pour PBKDF2-SHA256 à 600 000 itérations et 189,7 ms pour scrypt N=32768, r=8, p=3. Le témoin sans dérivation mesure 4,4 ms. Ces latences HTTP locales ne mesurent pas le CPU comptabilisé sur Workers Free. Elles suffisent à différer le login par mot de passe tant qu'une piste robuste n'a pas démontré une marge suffisante. Cloudflare ne prend pas en charge Argon2 dans `node:crypto`. Une implémentation WASM reste à évaluer si le mot de passe doit être conservé. [OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html), [Workers crypto](https://developers.cloudflare.com/workers/runtime-apis/nodejs/crypto/), [limite CPU](https://developers.cloudflare.com/workers/platform/limits/#cpu-time).

**Suite proposée.** Comparer une clé d'accès WebAuthn, dont le serveur vérifie une signature. Vérifier l'enrôlement privé de deux comptes, le défi à usage unique, l'origine, le RP ID, les sessions révocables et la récupération en cas de perte. Garder l'ADR ouvert jusqu'à validation de l'expérience et du budget CPU. Cloudflare Zero Trust Free est écarté à ce stade, car son parcours d'inscription documenté exige des informations de paiement. Le choix du canal de notification reste ouvert. [WebAuthn](https://www.w3.org/TR/webauthn-2/), [inscription Cloudflare Zero Trust](https://developers.cloudflare.com/cloudflare-one/setup/).

**Essai WebAuthn local.** Deux identités fictives passent la vérification ES256 avec le même rôle. Les tests refusent une mauvaise origine, un mauvais RP ID, un mauvais défi, une réponse sans vérification utilisateur et une signature faite avec la clé de l'autre identité. Deux soumissions simultanées du même défi donnent un succès et un refus dans le même isolate. La médiane HTTP de la vérification seule est de 5,6 ms sur dix requêtes, contre 189,7 ms pour scrypt dans l'essai précédent. La latence locale reste distincte du CPU en preview. Voir le [banc WebAuthn](../prototypes/m0-pages/benchmarks/webauthn/README.md).

**Suite à vérifier.** Tester l'enrôlement et la connexion en navigateur avec deux comptes préautorisés. Stocker les défis à usage unique et les sessions révocables dans D1 avec une consommation atomique des défis. Essayer une deuxième clé d'accès par compte sur un appareil indépendant et la révocation de la clé perdue, puis définir un réenrôlement contrôlé si les deux clés sont perdues. Ces parcours et le budget CPU doivent être démontrés avant l'adoption.

**Parcours Edge et D1 local.** Deux comptes fictifs ont chacun enrôlé une clé et ouvert une session dans Edge avec un authentificateur virtuel. D1 consomme le défi atomiquement. Sur deux vérifications concurrentes de la même assertion, une seule réussit. Le cookie de session est protégé, son empreinte est stockée en base, et les anciens cookies sont refusés après reconnexion et déconnexion. Un logout provenant d'une autre origine est refusé. Voir le [démonstrateur](../prototypes/m0-pages/benchmarks/session/README.md). Les clés de secours et le réenrôlement, l'expiration en conditions réelles, les appareils physiques, les limites de requêtes et le CPU en preview restent à vérifier.

**Récupération locale avec une clé de secours.** Dans Edge, un authentificateur interne virtuel et une clé USB virtuelle ont été enrôlés sur le même compte. Après retrait du premier et effacement du cookie navigateur, la deuxième clé a permis la connexion. La révocation a invalidé une assertion préparée avec la clé perdue et sa session encore active. La session créée avec la clé de secours reste valide. D1 refuse de supprimer la dernière clé. La migration a aussi été vérifiée en SQLite avec une clé et une session déjà présentes. L'enrôlement de secours et la révocation s'appuient sur la session de démonstration. Avant une preview, il faut qualifier la réauthentification récente, le débit et le parcours sur appareils physiques. En cas de perte des deux clés, la piste à instruire est un réenrôlement supervisé après vérification de l'identité, avec invalidation des sessions existantes.

**Durcissement local.** Limites de corps vérifiées avant traitement, compteur de tentatives D1 atomique et connexion WebAuthn de moins de deux minutes pour l'ajout ou la révocation d'une clé. Edge confirme qu'une session ancienne reste lisible mais doit se reconnecter pour modifier ses clés. Le compteur sépare désormais opération et compte. Le test en rafale confirme le 429 sur le compte B et le refus d'invitation 401 sur le compte A. Une preview avec écriture doit filtrer les requêtes avant le traitement de connexion pour éviter qu'un tiers puisse saturer le compteur d'un compte connu. Le CPU de connexion peut être mesuré indépendamment de l'upload. [Tests et détails](../prototypes/m0-pages/benchmarks/session/README.md#durcissement-du-parcours-décriture-local).

**Essai Pages HTTPS du 10/11/2026.** Une clé Edge virtuelle et huit vérifications réussies avec D1 dédié, rejeu refusé et déconnexion confirmée. Sur le créneau de vérification isolé, CPU estimé par Pages à 4,863 ms en médiane et 9,351 ms au p95/p99. Le jeu de données ne nomme pas le script et l’échantillon est petit. Un créneau mixte d’enrôlement et de demandes de défi atteint 11,282 ms au p99. Mesurer chaque étape séparément avant de conclure sur la marge des 10 ms. [Protocole et preuve](../prototypes/m0-pages/auth-preview/README.md#preuve-https-du-10-novembre-2026).

**Mesure séparée.** La vérification d’enrôlement atteint 10,274 ms sur un appel et la vérification de connexion 10,927 ms au p95 sur huit appels réussis. La marge CPU et les appareils physiques restent à vérifier. [Résultats](../prototypes/m0-pages/auth-preview/README.md#mesure-séparée-des-phases).

**Sonde sans D1.** Sur 24 signatures synthétiques acceptées, Pages estime 2,066 ms en médiane et 5,986 ms au p95. Le parcours complet reste à caractériser. [Protocole et limites](../prototypes/m0-pages/auth-preview/README.md#sonde-de-vérification-sans-d1).

**Réduction des appels D1.** La vérification consomme le défi et récupère la clé du compte en une instruction. Le traitement conserve la limite de tentatives et le contrôle du compteur lors de la création de session. Le nombre d’allers-retours D1 d’une vérification réussie passe de quatre à trois. En preview, le p95 passe de 10,927 ms à 6,157 ms entre deux lots de huit appels. La marge en exploitation et les appareils physiques restent à qualifier. [Relevé](../prototypes/m0-pages/auth-preview/README.md#reprise-après-regroupement-d1).

### ADR-005 — Cartographie aérienne **OUVERT**

Étudier IGN WMTS/couverture Cargèse, attribution, fallback plan, bibliothèques de tracé et performance. Prototype tôt, implémentation finale M4.

**Essai M0 du 10/11/2026.** Le service WMTS public annonce la couche `ORTHOIMAGERY.ORTHOPHOTOS`, le style `normal`, le JPEG et la matrice `PM_0_19`. Sur Cargèse, deux tuiles centrales répondent et le [démonstrateur](../prototypes/m0-pages/benchmarks/ign/README.md) affiche les vues à deux zooms dans Edge, avec crédit IGN et liens vers la licence et les dates de prise de vue. Une panne simulée conserve le schéma, le tracé fictif et sa description. Aucun itinéraire réel, appareil mobile physique ni bibliothèque de carte n'est validé par cet essai. [WMTS Géoplateforme](https://cartes.gouv.fr/aide/fr/guides-utilisateur/utiliser-les-services-de-la-geoplateforme/diffusion/wmts/), [jeu de données BD ORTHO](https://www.data.gouv.fr/datasets/bd-ortho-r).

### ADR-006 — Mesure visiteurs uniques sans profilage **OUVERT**

Méthode de décompte et limites, périmètre temporel, information RGPD, absence de cookie de mesure non exempté, résistance aux bots et preuve de clic Amivac.

## Format d'un nouvel ADR

`ID / Date / Statut / Problème / Contraintes / Options évaluées / Preuves et sources officielles / Décision / Conséquences / Alternatives rejetées et pourquoi / Risques résiduels / Liens GitHub + Notion / Date de révision.`

**Ne pas** marquer un ADR « accepté » sans validation de William lorsqu'il entraîne une nouvelle dépense, une migration DNS, une réduction importante de la qualité ou un changement de périmètre.
