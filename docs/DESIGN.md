# Design et expérience — Site Villa Corse

## Positionnement

Un site accueillant, singulier, **immersif mais calme**. L'émotion vient d'abord de la photographie de la vue et du ton authentique. Qualité d'exécution comparable au site « Villa Rosa » ; énergie et personnalité éditoriale inspirées des rubriques Explorer et de la galerie « La Crique Magique », **sans** animations omniprésentes. Éviter le côté froid/rigide de « Villa Allegra ». Ne pas copier de design, de texte, d'illustration ou de photographies tiers.

Références évoquées par William : Villa Rosa (présentation professionnelle + FAQ), Villa Favone (photographies immersives + pictogrammes équipements), La Crique Magique (galerie filtrable réactive, articles de découvertes, bonnes adresses, astuces locales). « Domaines Misíncu » et « Murtoli » n'ont pas été retenus comme directeurs de création.

## Écrans et navigation

### Accueil : hypothèse d'ordre de lecture, à tester

1. **Héros** : une seule photo de la vue particulièrement réussie ; menu classique discret et lisible, titre évocateur, action Amivac.
2. **Introduction** : situation, capacité et promesse sans exagération.
3. **Galerie** : catégories/filtrage instantané, grille responsive, modale détaillée.
4. **Villa & équipements** : espaces, couchages, vue, terrasse, jardin, piscine **collective** ; pictogrammes et informations pratiques.
5. **Explorer Cargèse** : recommandations vedettes, accès à chaque article détaillé et éventuelle liste complète.
6. **Itinéraires** : vers la plage et le supermarché, temps et modes, animation non automatique si intrusive.
7. **Avis** : témoignages modérés, formulaire de dépôt.
8. **FAQ** : logement/séjour et alentours.
9. **Réservation & contact** : Amivac et coordonnées révélées sur action.

Ce n'est **pas** un ordre immuable. Un prototype et des tests d'usage peuvent le modifier, avec décision documentée.

### Pages secondaires

- `/explorer/slug` : article éditorial avec titre, photo forte, conseils, plusieurs photos/légendes, informations pratiques, retour accueil.
- `/mentions-legales`, `/confidentialite`, éventuelle politique des cookies si nécessaire.
- `/admin` : interface privée organisée par contenus, avis, galerie, statistiques, historique, sauvegardes.
- Éventuelle page `/explorer` si le volume d'articles le justifie ; pas de multiplication artificielle.

## Équivalence desktop/mobile

**Ni approche « mobile first » imposée, ni adaptation mobile après coup.** Définir pour chaque composant les états desktop, tablette et smartphone avant développement ; tester tous les parcours critiques sur les deux formats.

- Menu discret en surimpression sur le héros sur grand écran, menu replié **accessible** au tactile sur petit écran ; aucun lien masqué définitivement.
- Images : différents recadrages selon taille de fenêtre, décidés par le point focal modifiable dans l'admin ; utiliser `object-position`/`sizes` et variantes d'image.
- Galerie : mêmes filtres, navigation et accès à toutes les photos ; disposition différente pour densité/ergonomie.
- Articles : colonnes et marges généreuses sur large écran, lecture confortable sur petite largeur ; liens et images adaptées.
- Itinéraire : carte jamais réduite à une vignette illisible, commandes tactiles séparées, alternative texte, mécanisme plein écran.
- Admin : authentification, ajout d'avis/photo, modification, prévisualisation et restauration utilisables depuis smartphone, **sans promettre une interface d'édition complète identique au pixel près**.

## Composants et comportements attendus

- Héros : une image unique, compressée et prioritaire au chargement ; pas de slider ni vidéo en autoplay.
- Galerie : onglets/filtres instantanés et clairement actifs, compteurs facultatifs, zoom sans perte de contexte, navigation `Échap`/flèches clavier et gestes tactiles, alt pertinents et légendes.
- Avis : étoiles textuellement compréhensibles, tri transparent (ex. récents d'abord), aucune note agrégée trompeuse.
- Recommandations : cartes au récit vivant ; pages d'article réellement utiles, non simples teasers.
- FAQ : accordéon avec indicateurs d'état et touches clavier, moteur de recherche uniquement si le volume le justifie.
- Itinéraire : bouton démarrer/pause/rejouer, vitesse raisonnable, bouton passer l'animation et alternative texte ; respecter `prefers-reduced-motion`.
- Admin : interface fonctionnelle, moins « marketing », états de publication/brouillon explicites, avertissement sur destruction.

## Design system à définir en M0–M1

Tokens de couleur (palette corse : mer, pierre, végétation, chaleur, à explorer), typographies lisibles, échelle d'espacement, largeur de lecture, rayons, ombres, grille, boutons, icônes, états focus/hover/disabled, mouvements. Une présentation distinctive n'exige pas de framework CSS lourd.

Créer **2 à 3 propositions de direction visuelle limitées** avant de coder toute la page ; présenter ordinateur + smartphone et faire valider William. La conception du parcours appartient au développeur, qui la justifie et la soumet à la vérification utilisateur.

## Règles de performance visuelle

- Charger d'abord la photo héros et les contenus visibles ; charger le reste à l'approche du viewport ou à l'ouverture d'une photo.
- Réserver explicitement les dimensions/aspect ratios pour éviter les décalages.
- La grande galerie ne doit ni bloquer le premier affichage ni télécharger cent photos d'un seul coup.
- Les cartes, la 3D et les animations sont chargées uniquement quand nécessaires, avec états de secours.
- Toutes les animations non essentielles respectent les préférences de réduction des mouvements.

## Qualité d'interface

Pas de lien décoratif inactif ; chaque bouton doit fonctionner. Pas de défilement horizontal parasite ni de superposition illisible. Les contrastes sont mesurés (WCAG 2.2 AA visé). Test en lumière forte/visibilité mobile et en basse connexion.
