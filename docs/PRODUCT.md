# Cahier des charges — Site Villa Corse

**Version initiale :** 05/11/2026. **Statut :** validé pour cadrage, détails éditoriaux à fournir. Se référer à `CONTENT.md` pour les faits connus et les ambiguïtés.

## 1. Objectif et publics

- Présenter chaleureusement la villa, sa **vue mer comme atout principal**, ses équipements, sa tranquillité et son environnement.
- Inspirer confiance avec une galerie excellente, des informations précises, des témoignages authentiques et des conseils locaux vécus.
- Inciter à la consultation de **l'annonce Amivac** ; la réservation, les disponibilités, le prix et le paiement restent exclusivement sur Amivac.
- Public : personnes francophones cherchant un séjour de 2 à 4 personnes à Cargèse, desktop ou mobile.
- Deux administrateurs (William et propriétaire), comptes individuels, mêmes droits.
- Quelques dizaines de visiteurs par mois au départ. Pas d'échéance ; livraisons progressives.

**Hors périmètre :** moteur de réservation, synchronisation de calendrier/prix, paiement, comptes visiteurs, messagerie publique, avis avec réponses/likes, traduction, application mobile native, vidéo initiale, visite 3D initiale.

## 2. Information et parcours

- **Accueil principal :** une longue page, organisée pour susciter l'envie et répondre aux questions.
- **Pages secondaires justifiées :** articles détaillés de recommandations, mentions légales, politique de confidentialité, administration. Éventuelles pages de parcours dédiées selon prototype UX.
- Menu classique discret sur la photo d'accueil, navigation accessible par ancres et depuis les pages de détail.
- Une grande photo principale **unique** et remarquable ; pas de carrousel automatique de héros.
- Réservation : CTA vers Amivac, ouverture dans un nouvel onglet, pas de formulaire de contact ni de réservation. Coordonnées téléphoniques révélées au clic, cliquables en appel sur mobile ; adresse e-mail non affichée initialement, action `mailto:`. Ne pas prétendre empêcher absolument les robots de lire des coordonnées exposées au navigateur.

## 3. Fonctions publiques

### F01 — Accueil
- Photo unique plein écran ou occupant presque tout le premier écran, texte court et lisible, navigation discrète, CTA vers Amivac.
- Priorité visuelle à la vue et au caractère authentique du lieu.
- Excellente ergonomie avec souris, clavier et toucher ; motion maîtrisé et réductible.

### F02 — Présentation
- Description du logement, capacité, une chambre, canapé convertible, surface 30 m², jardin, terrasse, vue, parking, résidence, situation.
- Pictogrammes pour les équipements ; détails et éventuelles restrictions ou réserves.
- Piscine de la résidence : **collective, réservée aux résidents et locataires, sécurisée, 16 × 8 m, accès réglementé**, jamais « privée ».

### F03 — Galerie photographique
- Photos très haute résolution sources ; affichage de dérivés Web optimisés et responsive. Environ 13 au départ et potentiellement plus de 100.
- Catégories filtrables instantanément : **Toutes, Vue panoramique, Terrasse et extérieurs, Intérieur, Piscine et résidence, Environnement et plage**.
- Ouverture en grand, navigation suivante/précédente, tactile et clavier ; légendes facultatives, textes alternatifs, support d'images verticales/horizontales.
- Admin : importer plusieurs fichiers, classer, décrire, réordonner, mettre à la une, ajuster cadrage/point focal, brouillon et prévisualisation, archiver/supprimer avec restauration.
- Images originals conservées **hors site** par le propriétaire ; site stocke les versions Web optimisées.

### F04 — Recommandations locales
- Fiches photo, titre, description, distance **estimée et contextualisée**, catégories facultatives, lien d'itinéraire pertinent.
- Pour chaque recommandation, page d'article détaillé avec récit personnel, plusieurs photos, conseils, liens sourcés.
- Admin : éditeur visuel riche mais à formats autorisés (titres, listes, liens, images, paragraphes), brouillon/publication/révisions.
- Contenus possibles : plages, randonnées, sorties bateau, commerces, restaurants, tours génoises, patrimoine, quelques mots corses, bonnes adresses.
- Aucun avis tiers importé ou reproduit sans autorisation.

### F05 — Itinéraires immersifs
- Au minimum : villa → plage du Pero et villa → supermarché, à pied et en voiture, avec variantes réelles si pertinentes.
- Animation d'un tracé sur fond orthophotographique ou plan, marqueur/pointillés progressifs, temps estimé qui avance pendant l'animation, possibilité pause/rejouer/ouvrir carte, photos facultatives aux étapes pouvant être agrandies.
- Le calcul et les temps ne sont pas un guidage GPS temps réel. Les trajets sont **vérifiés sur place** et publiés uniquement après vérification des variantes, de l'accessibilité et des droits cartographiques.
- Crédits cartographiques obligatoires ; fond plan de secours si photo aérienne non disponible.

### F06 — Avis
- Formulaire public, sans création de compte ni e-mail : **note, prénom, mois et année du séjour, commentaire**.
- Protection anti-spam, consentement clair à la publication, information sur les données, contrôle de doublons raisonnable ; statut **en attente** jusqu'à validation.
- Admin : examiner, refuser, publier, masquer, importer un avis historique authentique, corriger une faute mineure ou afficher un extrait fidèle clairement signalé. Conserver un original privé et une trace des opérations.
- Pas de modification trompeuse du sens, de la note ou du contexte ; afficher le caractère vérifié/non vérifié et les modalités de collecte/modération selon le dispositif réellement mis en œuvre.
- Pas de likes, de réponses ni de discussion publique.

### F07 — FAQ
- Questions concernant **le séjour et le logement** (arrivée, linge, animaux, accès piscine, conditions) **et les alentours de Cargèse**.
- Admin : créer, modifier, supprimer/archiver, réordonner, catégoriser si utile, publier et prévisualiser.

### F08 — Réservation et contact
- Lien Amivac visible à des endroits cohérents, suivi du nombre de clics internes avant redirection. Toujours respecter l'URL finale et indiquer que la réservation a lieu sur Amivac.
- Numéro révélé par action volontaire (bouton) puis éventuel lien `tel:` ; e-mail via action `mailto:` ; téléphone/mail exacts **À FOURNIR**.
- Pas de formulaire de contact ; aucun calendrier de disponibilité ou tarif redondant.

### F09 — Statistiques
- Visits / pages vues (selon mesure retenue), **estimation** des visiteurs uniques, clics vers Amivac, tendances quotidiennes/hebdomadaires/mensuelles.
- Minimisation des données et traceurs ; ne pas vendre de mesure « exacte » si les méthodes ne permettent qu'une approximation.
- Tableau de bord réservé aux administrateurs ; pas de données nominatives de visiteurs.

### F10 — Administration
- Deux comptes distincts, mêmes autorisations, accès `/admin`.
- Contenus modifiables : textes de présentation, photos/catégories/ordre/recadrage, recommandations et articles, avis, FAQ, éventuellement contact, liens et informations pratiques.
- Workflow `brouillon → prévisualisation → publication` ; historique des versions, auteur/date, comparaison et restauration.
- Prévenir les collisions de modification à deux administrateurs ; validations avant suppression définitive.
- Sauvegardes/export, tests de restauration et alertes (mail seulement si solution gratuite et sans facturation validée).
- Les visiteurs ne peuvent jamais appeler une API admin sans authentification **et** autorisation côté serveur.

### F11 — Visite guidée / 3D (ultérieure)
- Possibilité de se déplacer dans une modélisation de la maison.
- Nécessite relevés/photographies/plans légitimes, choix technologique, stratégie d'accessibilité et performance, et accord explicite ultérieur. **Ne pas développer en M1–M4.**

## 4. Fonctions transversales

FR uniquement ; SEO et partage social ; navigation au clavier ; lecteurs d'écran ; contraste ; images correctement décrites ; pas de mouvements excessifs ; carte accessible avec alternative textuelle ; robustesse sur réseau mobile ; états chargement/erreur/vide ; sauvegarde des données ; HTTPS ; sécurité des comptes ; respect RGPD.

## 5. Critères transversaux d'acceptation

1. Une personne trouve immédiatement la vue, le logement, les équipements, les informations pratiques et le lien Amivac.
2. L'interface et tous les parcours critiques fonctionnent sur smartphone et ordinateur (pas de fonctionnalité supprimée sur l'un des formats).
3. Les photos n'imposent pas le téléchargement de toute la galerie à l'ouverture de l'accueil.
4. Les contenus non publiés, avis en attente et identifiants admin ne sont jamais visibles publiquement.
5. Chaque contenu administrable possède un mode de prévisualisation et une possibilité de restauration documentée.
6. Toutes les limites et mentions obligatoires ont été contrôlées avant la mise en production.

## 6. Politique de modification du périmètre

Toute demande nouvelle devient d'abord une issue/backlog : pourquoi, valeur, dépendances, estimation qualitative, risques, critères d'acceptation, impact qualité/coût. Les priorités sont choisies sur ces critères. Un « joli effet » n'entre pas automatiquement dans le jalon courant.
