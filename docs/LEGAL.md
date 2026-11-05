# Juridique et vie privée — checklist de publication

> **Document pédagogique, pas un avis juridique.** Confirmer les informations avec le propriétaire et les sources officielles au lancement. En cas de doute réel, solliciter un professionnel. **Éditeur : particulier louant occasionnellement son logement** (déclaration de William).

## Pages et obligations à prévoir

### Mentions légales

- Identifier correctement le responsable de publication/éditeur, coordonnées et statut, informations de l'hébergeur et modalités de contact exigées pour le contexte réel ; ne pas recopier d'adresse privée dans Git.
- Le sous-domaine et le nom commercial ne changent pas l'identité du responsable. Obtenir approbation du propriétaire avant publication des informations personnelles requises.
- Vérifier les démarches locales relatives à la location meublée/touristique et numéro d'enregistrement éventuel **sans présumer** des obligations de Cargèse.

### Vie privée / RGPD

- Cartographier les traitements : avis/prénom/date séjour/commentaire, comptes admin, journaux sécurité, statistiques de fréquentation, clics Amivac, usage de tuiles cartographiques tierces.
- Pour chaque traitement : finalité, base juridique validée, destinataires/sous-traitants, localisation/transferts, durée, sécurité, droits, contact pour demandes RGPD. Donner l'information **au moment de collecter** l'avis.
- Aucun champ e-mail dans le formulaire public d'avis. En l'absence d'e-mail, prévoir un mécanisme praticable pour faire valoir ses droits (message au contact de l'éditeur avec éléments d'identification raisonnables).
- Ne jamais afficher un avis sans modération. Ne pas conserver indéfiniment les demandes refusées ou les journaux sans justification.
- Proposer au propriétaire un calendrier de conservation écrit, puis appliquer suppression/anonymisation et sauvegarde cohérentes. Exemple **non validé** : avis refusés supprimés rapidement après résolution, logs minimaux quelques semaines, statistiques agrégées jusqu'à durée convenue ; ne pas inventer de délai « légal » universel.

### Cookies et audience

- Ne pas installer de marketing/pixels/Google Analytics par défaut. Statistiques agrégées et estimation non individualisante des visiteurs.
- Les cookies de session admin strictement nécessaires peuvent relever d'une exemption distincte des traceurs publicitaires. Pour les mesures d'audience, l'exemption de consentement exige le respect des conditions CNIL et une vérification de la solution/configuration.
- Si une fonction future utilise des cookies/traceurs nécessitant un accord : demander le consentement préalable conforme (refus aussi simple qu'acceptation, preuve, retrait, informations). Aucun bandeau décoratif inutile.
- Les appels cartographiques et ressources tiers peuvent déclencher des échanges de données : auditer les requêtes et informer correctement les visiteurs.

### Avis authentiques

- Afficher clairement collecte, modération, publication, éventuelle vérification du séjour, conditions de rejet et possibilité de modification de présentation.
- Conserver version originale hors affichage public, horodater les actions ; n'autoriser que corrections typographiques mineures et **extraits fidèles signalés**, sans altérer le sens ni la note.
- Avis historiques : créer uniquement des témoignages réellement reçus et dont la publication est permise ; indiquer la provenance et l'ancienneté sans inventer de date ou note.
- Ne pas supprimer uniquement des avis négatifs dans le but de tromper, ni afficher une note moyenne artificielle.
- Informer explicitement le visiteur, avant envoi, que son prénom, sa note, son mois/année de séjour et son texte **pourront** être publiés après modération. Vérifier la base légale de ce traitement.

### Photos, cartes, textes et liens

- Autorisation des auteurs pour toutes les images de la villa, de Cargèse et des recommandations ; attention aux personnes identifiables et aux plaques/coordonnées GPS dans les fichiers.
- Prévoir une notice de droits distincte pour les images/textes et le code source : une licence open source sur le dépôt public ne doit pas être interprétée comme une autorisation de réutiliser les photos de la villa.
- Ne pas aspirer d'images depuis Amivac sans preuve de droits ; les 13 photos initiales peuvent provenir du propriétaire, mais confirmer.
- Respecter licences cartographiques, crédits IGN et éventuels fonds de secours, sans copie non autorisée de Google Maps/Street View.
- Vérifier la marque Amivac et les modalités d'ouverture du lien ; le site ne collecte ni paiement ni contrat.
- Les CGV de réservation/paiement relèvent d'Amivac dans ce périmètre ; **ne pas créer automatiquement de CGV ou de CGU superflues** pour un simple site vitrine. Une rubrique « Conditions de publication des avis » peut être pertinente.

## Check-list avant le premier déploiement public

- [ ] Responsable du site, hébergeur, contact et textes légaux validés par le propriétaire.
- [ ] Adresse publique du logement et informations pratiques exactes.
- [ ] Texte de confidentialité adapté aux données réellement collectées.
- [ ] Formulaire d'avis informatif, honnête et modéré ; droits des personnes praticables.
- [ ] Audit cookies / scripts / ressources tierces sur production ; bannière uniquement si nécessaire.
- [ ] Licences/crédits photos/cartes respectés ; confirmation du droit d'usage des 13 photos.
- [ ] Aucun secret ni donnée personnelle non publique dans Git, Notion ou logs publics.
- [ ] Procédure de correction ou retrait rapide de contenus et d'avis erronés.

## Sources officielles

- Mentions légales : https://www.cnil.fr/fr/cnil-direct/question/les-mentions-legales-sur-un-site-web-est-ce-obligatoire
- Informations RGPD : https://www.cnil.fr/fr/conformite-rgpd-information-des-personnes-et-transparence
- Cookies/mesure d'audience : https://www.cnil.fr/fr/cookies-solutions-pour-les-outils-de-mesure-daudience
- Avis en ligne : https://www.economie.gouv.fr/dgccrf/les-fiches-pratiques/avis-en-ligne-attention-aux-faux-commentaires
- Modalités de vérification/publication : https://www.economie.gouv.fr/particuliers/mes-droits-conso/bien-consommer/peut-faire-confiance-aux-avis-en-ligne
