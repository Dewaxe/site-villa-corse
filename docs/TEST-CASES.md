# Cas d'acceptation et non-régression

Identifiants stables pour GitHub, PR, automatisation et audits. Les scénarios sont exécutés progressivement selon la roadmap ; **aucun n'est encore passé** dans ce kit documentaire.

## Navigation, design et responsive

| ID | Étant donné… quand… alors… |
| --- | --- |
| T-001 | Visiteur nouveau sur l'accueil : photo héros unique visible rapidement, titre lisible, navigation et action Amivac accessibles |
| T-002 | Même page à 375 px et à 1440 px : toutes les sections/actions présentes, aucune superposition ni défilement horizontal |
| T-003 | Visiteur clavier : navigation menu, filtres, galerie, FAQ et Amivac possible, focus visible et ordre logique |
| T-004 | Préférence `prefers-reduced-motion` : animations non essentielles coupées ou remplaçables par une étape instantanée |
| T-005 | Page article inconnue : réponse 404 appropriée ; brouillon : invisible pour utilisateur public |
| T-006 | Connexion faible : contenu principal lisible avant images secondaires ; galerie ne télécharge pas 100 photos initialement |

## Galerie et médias

| ID | Scénario |
| --- | --- |
| T-010 | Sélection « Vue panoramique » : uniquement les photos de cette catégorie, filtrage sans rechargement complet |
| T-011 | Ouvrir une photo : affichage agrandi, légende, `Esc` ferme, flèches changent, focus restitué ; swipe mobile si prévu |
| T-012 | Admin ajoute une photo valide : compression/validation, variante Web visible après publication, originales absentes du stockage Web |
| T-013 | Admin envoie faux JPEG, fichier énorme ou image dangereuse : refus sans stockage ni fuite d'information |
| T-014 | Admin change focale/ordre : aperçu correct sur mobile et bureau, version antérieure restaurable |
| T-015 | Stockage KV saturé ou délai de propagation : message d'erreur/état en attente, aucune image cassée publiée |

## Séjour, article et FAQ

| ID | Scénario |
| --- | --- |
| T-020 | L'annonce publique ne contient jamais « piscine privée » ; mention « piscine collective » et conditions fidèles |
| T-021 | Équipement/FAQ modifié en brouillon : public ne change pas avant publication ; prévisualisation admin reflète le brouillon |
| T-022 | Article créé puis publié : `/explorer/slug` accessible, `title` et HTML du corps présents **sans exécuter JS** |
| T-023 | Deux admins éditent même article : conflit signalé, aucune écriture silencieusement perdue, version restaurable |
| T-024 | Article contenant script/liens `javascript:` : rendu échappé/sanitisé ; aucun code injecté exécuté |
| T-025 | Admin revient à une ancienne FAQ : historique et révision auteur/date consultables, public affiche la version restaurée |

## Avis

| ID | Scénario |
| --- | --- |
| T-030 | Visiteur soumet note, prénom, séjour mois-année, commentaire : formulaire accepté sans e-mail et avis **non visible** avant validation |
| T-031 | Formulaire invalide ou spam Turnstile invalide : requête refusée côté serveur, réponse accessible, pas de création |
| T-032 | Admin publie/refuse : seul un avis approuvé apparaît et l'opération est journalisée |
| T-033 | Admin édite un extrait : texte original conservé, extrait fidèle signalé ; note et sens non altérés |
| T-034 | Admin importe avis historique réel : origine et niveau de vérification indiqués, pas de fausse attribution |
| T-035 | Script tente soumission massive ou XSS : rate-limit/validation échoue, aucune donnée active ou privée exposée |

## Réservation, cartes et statistiques

| ID | Scénario |
| --- | --- |
| T-040 | Clic Amivac : ouverture onglet externe vers URL autorisée, onglet d'origine intact, compteur incrémenté une fois selon méthode définie |
| T-041 | Clic « Afficher le numéro » sur mobile : numéro visible puis appel `tel:` possible ; e-mail via `mailto:` sans texte affiché d'emblée |
| T-042 | Mode marche villa→plage : tracé validé se dessine, temps estimé progresse, photo d'étape agrandissable |
| T-043 | Pause, rejouer, élargir carte, réduction animations : état correct sur smartphone et ordinateur |
| T-044 | Fond satellite indisponible : couche plan ou description alternative opérationnelle, pas de blocage de page |
| T-045 | Statistiques admin : nombres agrégés cohérents avec événements simulés, mention « visiteurs estimés », pas de piste individuelle |

## Sécurité, production et intégrations

| ID | Scénario |
| --- | --- |
| T-050 | Visiteur sans session : toute URL/API d'admin retourne refus ; brouillons/avis en attente non exposés |
| T-051 | Admin connecté : cookie protégé, déconnexion invalide session ; requête mutation CSRF refusée |
| T-052 | Tentatives répétées mauvais mot de passe : limitation de débit sans énumération de comptes |
| T-053 | Après mauvaise publication : restauration d'un contenu et d'une image en prévisualisation, puis re-publication correcte |
| T-054 | Export sauvegarde puis restauration locale/test : données et références médias vérifiées, aucun secret dans le dépôt |
| T-055 | Pipeline PR : tests passent, preview fonctionne, changement de production seulement après validation |
| T-056 | DNS externe : nouveau CNAME ne perturbe pas `william.dempure.com` ou `drop.dempure.com` |
| T-057 | Codex clôt une tâche validée : statut Notion, issue et PR liés, une compétence réelle consignée ; relancer n'ajoute pas de doublon |
| T-058 | Notion indisponible : changement Git et preuves conservés, synchronisation signalée en attente, pas de fausse réussite |
| T-059 | Quota Free atteint en simulation : erreur propre, pas de bascule sur plan facturable |
| T-060 | Artefact Pages et preview : routes dynamiques couvertes, fichiers statiques servis sans invocation Functions |
| T-061 | Quota de 100 000 requêtes par jour partagé entre Pages Functions et Workers Free vérifié |
| T-062 | Quota d'invocation épuisé en simulation : accès privé fermé, aucune mutation et fichiers statiques hors Functions servis |

## Traçabilité

La PR référence les IDs de tests concernés, les commandes réellement exécutées, les résultats et les environnements. Les tests automatisés portent le même ID ou lient un tableau de correspondance. Tout cas reporté est marqué explicitement `non exécuté`, jamais `passé` par défaut.
