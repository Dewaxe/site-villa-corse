# Roadmap et ordre de construction

**Règle :** la priorité est décidée par risque, dépendances, valeur et conformité, **jamais** par la popularité d'une fonctionnalité. Les jalons décrivent des incréments potentiellement livrables, pas des dates promises. Le périmètre peut évoluer par décision documentée.

## M0 — Exploration professionnelle et fondations **[PROCHAIN]**

Le [cadrage technique M0](M0.md) documente la comparaison, les étapes du PoC et les preuves d'acceptation attendues.

1. Confirmer besoins ouverts, inventaire des données, droits des photos et modèle de publication.
2. Comparer les technologies **indépendamment de l'expérience passée de William** ; tester les quotas gratuits, l'absence de facturation, Cloudflare Pages/Functions/D1/KV, DNS externe, sécurité minimum et SEO d'articles éditables.
3. Faire les prototypes à haut risque : upload image versionnée/optimisée, rendu indexable d'article dynamique, publication/rollback et fond satellite IGN.
4. Rédiger ADR architecture ; choisir organisation dépôt, conventions Git, environnement preview, sécurité/secrets, tests et CI.
5. Proposer 2–3 pistes visuelles simples sur desktop **et** smartphone ; choisir direction après avis de William.
6. Créer/matcher les issues GitHub avec le backlog Notion ; tester une synchronisation contrôlée et une création de note d'apprentissage.

**Sortie M0 :** ADR accepté, PoC démontré, premier CI vert, aucune facturation activée, design direction validée, backlog ordonné et lié. Ne pas lancer M1 si risque bloquant non résolu.

## M1 — Première vitrine publique utilisable

- Structure, navigation et design system ; une photo héros remarquable, description vérifiée, équipements et mentions exactes.
- Galerie de base avec catégories/filtre, affichage en grand et images Web, contenus initiaux pouvant être ajoutés via un processus provisoire **documenté** si l'admin n'est pas encore livrée.
- Lien Amivac, contact à la demande, FAQ initiale, pages légales minimales, SEO de base.
- Tests navigateurs et smartphone, sécurité en lecture seule, accessibilité et performance.
- Déploiement **prévisualisé**, puis mise en production progressive **sur accord de William**.

**Sortie M1 :** visiteur sait ce qu'est le logement, voit la vue/galerie, trouve le lien de réservation et les informations fiables ; personne ne peut soumettre/modifier de données publiques.

## M2 — Administration et contenus riches

- Comptes admins distincts, sessions sûres, protections, redémarrage de session, gestion des droits.
- Modèle D1 des contenus, historique, brouillons, prévisualisation, publication, contrôle de concurrence, export/restauration.
- Administration des photos : import, compression, catégorie, ordre, focale, galerie, archivage, quotas KV.
- FAQ et présentation modifiables ; recommandations, éditeur visuel à formats limités, pages d'articles détaillés indexables et administrables.
- Vérifier le processus de restauration sur un environnement de test.

**Sortie M2 :** les deux administrateurs peuvent modifier le site, revenir à une version antérieure et retrouver le rendu public attendu sans intervention de développeur.

## M3 — Avis et statistiques

- Formulaire sans e-mail, modération, anti-spam, consentement/publication honnête, historique, import de témoignages existants licites.
- Statistiques minimales de visites/visiteurs approximatifs, clics Amivac, tableau de bord.
- Alertes exploitables au propriétaire, avec canal testé et compatible 0 €.
- Audits sécurité, confidentialité, tests de suppression et de récupération.

**Sortie M3 :** aucun avis ne s'affiche sans validation ; aucun comportement frauduleux sur avis ; statistiques utiles sans profilage inutile ; administrateurs alertés des événements prévus.

## M4 — Itinéraires immersifs

- Tracés validés et variantes pour la plage et le supermarché, à pied et en voiture.
- Carte IGN orthophoto + plan de secours, licence/crédits, interpolation des trajets, temps estimé animé, points photo, contrôles pause/rejouer, version accessible.
- Tests sur desktop et mobile (performance et confort), réduction des mouvements, résilience si service cartographique indisponible.

**Sortie M4 :** parcours exacts suffisamment vérifiés pour être publiés, non confondus avec navigation GPS en direct.

## M5 — Visite guidée 3D **(facultative et tardive)**

- Cadrer données du bâtiment/plans, temps, qualité visuelle, technologie et implications mobiles.
- Prototype isolé et mesures de performance avant décision de développement.
- Alternative photos/plans pour utilisateurs sans WebGL ou réduisant les mouvements.
- Aucun engagement de réalisation avant bilan de valeur.

## Dépendances et risques majeurs

| Élément | Précondition / risque | Stratégie |
| --- | --- | --- |
| Pages articles dynamiques | SEO peut échouer si contenu uniquement chargé en JS | PoC M0, validation HTML brut |
| Photos admin | KV à cohérence éventuelle, quota 1 Go, processing | PoC M0 + clés immuables, quotas, tests |
| DNS sous-domaine | Interdiction de perturber portfolio/drop | Pages + CNAME externe, vérification avant changement |
| Avis | Spam et témoignages trompeurs | Modération+protection+mentions M3 |
| Itinéraires satellite | Licence/couverture/latence cartographie | Test technique M0, finalisation M4 |
| Sauvegardes | Time Travel D1 Free 7 jours seulement | Export privé, révisions applicatives, test restauration M2 |
| Notifications | E-mail gratuit sans paiement à confirmer | Canal validé avant promesse ; alerte admin de secours |
| Notion | Un connecteur actif ne garantit pas synchronisation continue | Test de droit d'écriture, rituel Codex, éventuel CI/API plus tard |

## Format standard d'une tâche

ID, titre, contexte, utilisateur concerné, règle métier, critères testables, dépendances, niveau de priorité et justification, risque, maquettes éventuelles, démarche d'apprentissage, fichiers probables, tests prévus, statut, liens GitHub/Notion, décision de publication et preuves.

Statuts : `À qualifier` → `Prête` → `En cours` → `Revue/Tests` → `À valider` → `Terminée` (ou `Bloquée`, `Annulée`). Ne pas confondre « fusionnée dans Git » et « en production ».
