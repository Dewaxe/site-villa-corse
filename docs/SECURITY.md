# Sécurité, exploitation et restauration

Le site comporte une partie publique peu risquée **et** un véritable back-office modifiant des contenus publics. La petite fréquentation ne dispense d'aucun contrôle élémentaire.

## Identité et sessions

- Deux comptes nominaux distincts, **mêmes droits** applicatifs ; jamais un mot de passe partagé ni un compte admin unique.
- Login + mot de passe fort ; hachage de mot de passe avec KDF adaptée aux capacités Cloudflare réellement testées (Argon2id si disponible et performant, sinon alternative robuste vérifiée) et sel individuel. Jamais de mots de passe réversibles ni de credentials en Git.
- Cookies de session `Secure`, `HttpOnly`, `SameSite` adéquat, rotation d'ID après authentification, durée de vie limitée, révocation/déconnexion, vérification d'autorisation **sur chaque endpoint**.
- Limitation de débit et temporisation de tentatives de connexion, messages qui n'énumèrent pas les comptes, anti-CSRF sur mutations cookies, en-têtes de sécurité, HTTPS, contrôle CORS.
- Possibilité de réinitialiser les identifiants via procédure sûre, sans afficher ni envoyer de mot de passe en clair. MFA/passkey à évaluer si raisonnable ; ne pas imposer un service à coût sans accord.
- Prévisualisation et contenus brouillon authentifiés et `noindex` ; API médias non publics si la photo n'est pas publiée.

## Entrées, contenu et médias

- Validation et tailles maximales **serveur**, indépendamment du formulaire client.
- Avis : score 1–5, prénom et commentaire limités en longueur, mois/année valides, Turnstile avec Siteverify côté serveur, rate-limit et modération obligatoire.
- Éditeur riche : format de document JSON structuré et autorisé, HTML final échappé/assaini ; pas d'HTML/JS libre, pas d'événement inline, liens `https:`/`mailto:` admis selon contexte, `javascript:` interdit.
- Images : type réel vérifié (et non simple extension), limitation de dimensions/poids, décodage/transcodage sécurisé, suppression EXIF y compris coordonnées GPS, noms de fichiers non fiables, clés de stockage aléatoires, variantes immuables.
- Lien externe Amivac : URL approuvée/canonique, ouverture `target="_blank" rel="noopener noreferrer"`, aucune redirection ouverte commandée par une URL utilisateur.
- Protection des sessions et accès des éditeurs : journal des modifications mais minimisation de données sensibles.

## Autorisations et séparation

- Lecteur public : lire uniquement les données **publiées** et publier une demande d'avis **en attente**.
- Admin connecté : gérer contenus/avis/photos/FAQ/statistiques/sessions selon les mêmes droits pour les deux comptes.
- Prévisualisation : sous lien opaque court éventuellement, jamais accessible via simples IDs publics.
- Cloudflare Preview/Production : secrets, D1, KV et clés Turnstile isolés ; aucun test ne doit modifier les vraies données.

## Versionnement, suppression et récupération

- Historique applicatif pour textes, photos/métadonnées, avis et FAQ ; inclure auteur/date/action, état précédent et numéro de version.
- Suppression logique (« archiver ») avant suppression définitive ; confirmation et audit pour suppression irréversible. Une restauration de contenu doit récupérer aussi ses références médias.
- **Cloudflare D1 Time Travel gratuit : 7 jours de restauration point-in-time**, pas plus ; ne pas confondre avec un archivage éternel.
- Export régulier des données privées (migrations + DB + clés/manifest médias) vers un stockage **séparé et privé** contrôlé par le propriétaire ; le GitHub public ne convient pas pour les avis en attente ou backups. Tester restauration complète en environnement d'essai.
- KV n'a pas de transactions D1 et est à cohérence éventuelle : créer clés immuables, publier le pointeur après upload, éviter purge avant expiration des versions utiles ; surveiller les objets orphelins.
- Historique d'édition et export ne remplacent **pas** une sauvegarde indépendante ; définir une fréquence réaliste et un responsable au jalon M2.

## Notifications et incidents

- À minima : incidents visibles par les deux administrateurs dès connexion, compteur d'avis en attente, journal d'erreurs côté serveur avec minimisation.
- **Alerte au propriétaire** : définir un canal sortant fiable (e-mail gratuit sans carte ni dépassement automatique **à confirmer**) pour échecs graves de sauvegarde, problèmes de sécurité ou seuils. Ne jamais prétendre une alerte envoyée si le canal n'est pas actif.
- Sauvegardes/alertes manquantes ou non testées bloquent la validation de la fonctionnalité correspondante, selon critères de jalon.
- Plan d'incident : suspendre uploads/publication ou mettre le site en lecture seule, préserver preuves minimales, restaurer la dernière version vérifiée, contrôler, informer les parties concernées.

## Contrôle des quotas « zéro euro »

- Tenir un inventaire services, plans **Free**, quota et date de vérification ; surveiller D1 (lectures/écritures/stockage), KV (stockage/écritures/lectures), Workers (requêtes), Pages (builds/fichiers).
- Implémenter des **seuils internes** avant les quotas publics, refuser uploads trop grands ou volume total dangereux, afficher messages utiles et proposer compression.
- Ne jamais activer « pay as you go » ou un stockage à facturation éventuelle. Si une carte est demandée : pause et décision de William.

## Références

- OWASP ASVS : https://asvs.owasp.org/
- Sécurité de sessions : https://cornucopia.owasp.org/taxonomy/asvs-5.0/07-session-management/
- D1 Time Travel : https://developers.cloudflare.com/d1/reference/time-travel/
- KV cohérence : https://developers.cloudflare.com/kv/concepts/how-kv-works/
- Turnstile validation : https://developers.cloudflare.com/turnstile/get-started/
