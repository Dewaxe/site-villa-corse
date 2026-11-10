# Démonstrateur local WebAuthn et D1

Cet essai est séparé de Pages. Il écoute uniquement sur la boucle locale. Deux comptes fictifs, chacun protégé par sa propre invitation, peuvent enrôler une clé principale. Les défis et les sessions expirables sont persistés dans D1 local.

Depuis `prototypes/m0-pages`, installer les dépendances avec `pnpm install --frozen-lockfile`. Dans PowerShell, créer les invitations si le fichier local est absent, puis préparer une base neuve pour chaque exécution du test :

```powershell
$vars = Join-Path (Get-Location) 'benchmarks/session/.dev.vars'
if (-not (Test-Path -LiteralPath $vars)) {
  function New-DemoInvite {
    $bytes = [byte[]]::new(32)
    [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
    [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
  }
  [System.IO.File]::WriteAllText($vars, "INVITE_A=$(New-DemoInvite)`nINVITE_B=$(New-DemoInvite)`n")
}
$env:WRANGLER_SEND_METRICS = 'false'
$state = Join-Path '.wrangler' ('session-' + [guid]::NewGuid().ToString('N'))
pnpm exec wrangler d1 migrations apply DB --local --persist-to $state --config benchmarks/session/wrangler.jsonc
if ($LASTEXITCODE -ne 0) { throw 'Migration D1 locale échouée.' }
pnpm exec wrangler dev --local --persist-to $state --config benchmarks/session/wrangler.jsonc
```

Dans un autre terminal, avec Microsoft Edge installé :

```powershell
node benchmarks/session/browser-check.js
```

Le test utilise deux contextes Edge indépendants et des authentificateurs virtuels Chromium. Il vérifie le refus d’une mauvaise invitation, l’enrôlement, la connexion, le rejeu concurrent, les attributs du cookie, la rotation de session et le refus de l’ancien cookie. Il vérifie aussi la protection d’origine sur la déconnexion et la révocation côté serveur. Les invitations et la base locale restent hors Git.

Le `DELETE … RETURNING` retire le défi en une opération. Deux requêtes peuvent arriver ensemble, mais seule celle qui a retiré la ligne obtient un défi à vérifier. Pour la session, le navigateur reçoit le jeton opaque et D1 ne garde que son empreinte SHA-256. Le jeton vient du générateur aléatoire et a 256 bits d’entropie. Il ne nécessite pas une KDF coûteuse comme un mot de passe humain.

Le test passe sous Windows avec Edge headless et Wrangler 4.150.0. Le démonstrateur reste local. La récupération après perte de toutes les clés, les appareils physiques, les contrôles de débit et de taille des requêtes, ainsi que le CPU de la plateforme demandent des essais séparés.

## Simuler la perte d'une clé

Le parcours Playwright vérifie aussi la récupération de `demo-a`. Il ajoute une clé USB virtuelle alors que la session créée avec la clé interne est encore active, retire l'authentificateur interne, efface le cookie du navigateur et reconnecte le compte avec la clé USB. Après révocation de la clé perdue, il vérifie que l'ancienne session et une assertion préalablement signée échouent, que la session de secours reste active et que la dernière clé ne peut pas être supprimée.

La migration `0002_recovery.sql` rattache chaque session à la clé qui l'a créée. La suppression d'une clé supprime en cascade ses sessions. Les tests ont aussi vérifié la conservation d'une clé et d'une session fictives en passant de l'ancien schéma au nouveau dans SQLite.

Le parcours de perte des deux clés reste ouvert. Le démonstrateur réserve l'ajout de clés à une session active et le lie à cette session. Une réauthentification récente et des contrôles de débit restent à qualifier avant une preview.

## Publier et restaurer l'article

Le même test Edge couvre l'article fictif `/articles/article-test`. Il génère deux PNG et les fait réencoder en WebP par le formulaire. Edge ajoute un profil ICC à la sortie de son canvas opaque. Le client le retire pour envoyer un conteneur VP8 simple. Les images publiées sont décodées dans Edge. Le HTML est inspecté sur des réponses HTTP brutes.

Le test vérifie les refus anonymes et l'invisibilité du brouillon. Il publie V1 et V2, puis restaure V1 et compare son HTML et le SHA-256 de son WebP. Deux tentatives de publication concurrentes donnent un succès et un conflit. Les requêtes avec mauvais MIME, fichier trop lourd, contenu non-WebP, dimensions hors limite ou métadonnées sont refusées.

D1 associe le texte à une révision et KV stocke l'image sous la clé de cette révision. Une restauration déplace le pointeur D1. Un média déjà publié reste accessible par son URL versionnée pour les pages déjà chargées. Le média d'un brouillon renvoie 404.

Les pannes KV sont injectées dans les handlers pour vérifier le refus de l'upload, le report de la publication et le visuel de secours sans cache. Le serveur contrôle le conteneur sans décoder entièrement le bitstream. L'émulation locale ne reproduit pas la propagation entre régions.

## Restaurer depuis une sauvegarde D1/KV

Après le test navigateur, arrêter le serveur source pour figer les écritures. Utiliser le nom de son répertoire sous `.wrangler/`, sans le préfixe `.wrangler/`. Depuis `prototypes/m0-pages` :

```powershell
$source = 'session-remplacer-par-le-nom-observe'
$backup = 'exercice-m0'
$cible = 'restore-exercice-m0'
node benchmarks/session/backup.js export $source $backup
node benchmarks/session/backup.js restore $cible $backup
```

Le dossier ignoré `backups/<nom>` contient un manifeste JSON des révisions D1 et du pointeur publié, son SHA-256 et les binaires WebP accompagnés de leurs empreintes. La restauration vérifie chaque élément avant de créer la cible. Elle initialise D1, écrit les images vérifiées dans KV, puis importe les révisions et leur pointeur. Les commandes Wrangler utilisent toujours `--local`. Les identifiants d'accès, clés de connexion, défis et sessions sont exclus. Si un import est interrompu, garder la cible hors service et recommencer sous un nouveau nom. Une cible déjà existante est refusée.

Pour vérifier les réponses HTTP, démarrer la source avec la configuration du démonstrateur et son ancien `--persist-to`, puis exécuter `node benchmarks/session/backup-http-check.js capture $backup`. Arrêter la source. Démarrer ensuite le démonstrateur avec `--persist-to ".wrangler/$cible"` et exécuter `node benchmarks/session/backup-http-check.js compare $backup`. Les deux serveurs utilisent le même port local, ce qui permet de comparer le HTML complet avec son URL canonique.

L'exercice a reconstruit deux révisions et deux images publiées. Le HTML et les empreintes des images étaient identiques via HTTP. La cible contenait zéro clé de connexion, zéro défi et zéro session. Un fichier modifié d'un octet et un fichier absent ont été refusés avant création de la cible. Les SHA-256 détectent les altérations accidentelles. Le prototype ne signe ni ne chiffre la sauvegarde. Cet exercice ne couvre pas la reprise des comptes ni le retour à un ancien déploiement.
