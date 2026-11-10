# Prototype M0 — Routage Pages Functions

Depuis ce dossier, installer les dépendances avec `pnpm install --frozen-lockfile`, puis lancer `pnpm dev`. Dans un autre terminal, exécuter `pnpm test`.

`public/` est l’artefact statique utilisé par Wrangler. Son `_routes.json` couvre uniquement le témoin dynamique et l’administration de démonstration. Le middleware global ajoute `X-M0-Invoked: 1` aux réponses qui traversent les Functions. Les réponses statiques se vérifient avec leur contenu et l’absence de ce marqueur.

L’administration refuse toutes les requêtes à cette étape. Le test local couvre l’artefact et les réponses HTTP. Les métriques d’invocation et le réglage Fail closed de la plateforme devront être vérifiés en preview.
