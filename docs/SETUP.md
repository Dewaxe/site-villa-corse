# Démarrer proprement dans Codex (Windows)

## 1. Préparer le dépôt

1. Placer le projet dans un dossier de développement durable, par exemple `C:\Users\willi\Dev\Site-Villa-Corse`. Pour un projet existant, convenir du déplacement avec William.
2. Ouvrir la racine du projet dans Codex Windows. Lire `AGENTS.md` et [STATUS](STATUS.md).
3. Initialiser Git sur `main` si nécessaire. Garder le dépôt local jusqu'à l'accord de William pour créer un dépôt GitHub public vide. Ne pas inclure de données privées, secrets ou images sous droits incertains.
4. Avant le premier commit, vérifier les fichiers, configurer `.gitignore` pour les secrets (`.env*` hors `.env.example`), caches, dépendances, builds, bases locales, backups, images originales et exports privés. Décider séparément d'une licence **pour le code** ; le dépôt public n'autorise pas automatiquement la réutilisation des photos et des textes.
5. Faire le commit documentaire initial, relier `origin` à GitHub et pousser après revue. Respecter les conventions de branches décidées dans M0.

## 2. Connecteurs et suivi

- Vérifier dans Codex que GitHub et Notion sont accessibles au bon compte. William a déjà validé l'accès en lecture aux quatre bases Notion.
- Demander à Codex de **tester sans mutation** la recherche d'une tâche et des quatre bases, puis d'effectuer une mise à jour contrôlée sur une tâche de test approuvée.
- Le simple plugin Notion actif ne garantit pas un automatisme. Lire `NOTION.md` : on commence par une synchronisation déclenchée par le rituel de Codex ; une synchronisation GitHub Actions autonome est une évolution à valider séparément.
- Les autorisations et tokens demeurent dans les outils/connecteurs ou les secrets du CI, jamais dans Git.

## 3. Première requête Codex suggérée

« Lis AGENTS.md et tous les documents utiles. Nous sommes à M0. Propose une comparaison étayée des architectures réellement déployables à 0 € sans carte ni facturation automatique, en conservant le DNS actuel de dempure.com. Prépare un plan de prototype minimal avec critères d'acceptation et ADR. Ne construis pas encore le site complet, ne déploie rien en production et mets à jour Notion automatiquement seulement si les autorisations sont présentes. Explique-moi chaque arbitrage. »

Après validation de William : réaliser le prototype, mesurer, consigner les résultats, choisir la stack et créer les premiers tickets.

## 4. Secrets et comptes à créer **seulement après la décision M0**

- Compte Cloudflare Free (vérifier qu'aucun moyen de paiement/abonnement payant n'est requis pour les services choisis).
- Projet Cloudflare Pages, configuration D1/KV/Turnstile si le prototype les valide.
- Accès au DNS IONOS **uniquement au moment de connecter le sous-domaine**, sans modifier les enregistrements des sites préexistants.
- Deux comptes administrateurs ; installation et récupération sécurisées (pas d'identifiants en dur).
- Contacts/coordonnées réelles et mentions légales fournis en privé par le propriétaire, non enregistrés dans les documents publics avant sa validation.

## 5. Fichiers et contenus à fournir ultérieurement

- Photo principale choisie et 13 photos initiales avec autorisation d'usage, puis autres lots ; pas nécessaire pour M0 technique (utiliser des visuels de démonstration sans droits douteux).
- Adresse exacte, points du trajet plage/supermarché et variantes réellement praticables ; aucune coordonnée ne doit être inventée.
- Textes personnels, précisions sur arrivée/départ, conditions animaux, linge, accès piscine, équipements, accessibilité, etc.
- Nom de la villa et sous-domaine à décider avant publication.
- Coordonnées de contact et identité de l'éditeur fournies dans un circuit privé.

## 6. Vérification des premières livraisons

Une URL de prévisualisation fonctionnelle, des tests CI verts, aucun frais activé, vérification depuis un téléphone et un ordinateur, puis accord de William avant la mise en production. Conserver un plan de retour arrière.
