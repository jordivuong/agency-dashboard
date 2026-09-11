# Dashboard — annuaire des sites clients

Page unique, protégée par mot de passe, qui liste tous les sites dupliqués à
partir de [site-template](https://github.com/jordivuong/site-template) : nom,
secteur, URL en ligne, lien direct vers le `/admin.html` de chaque site, lien
vers son repo GitHub, et son mode d'hébergement.

Même principe que `admin.html` du template : `index.html` édite la liste,
le bouton « Enregistrer » committe `sites.json` sur GitHub via `api/save.js`
(fonction serverless Vercel), ce qui déclenche le redéploiement automatique.
Rien à installer, pas de base de données — la liste des sites, c'est juste
`sites.json`.

## Variables d'environnement (Vercel → Project → Settings → Environment Variables)

| Variable | Valeur |
|---|---|
| `ADMIN_PASSWORD` | Mot de passe d'accès au dashboard |
| `GITHUB_TOKEN` | Personal Access Token GitHub *fine-grained*, permission **Contents: Read and write**, limité à ce repo |
| `GITHUB_REPO` | `jordivuong/agency-dashboard` |
| `GITHUB_BRANCH` | `main` |

## Ajouter un site après avoir dupliqué le template

1. Ouvrir ce dashboard, se connecter
2. « + Ajouter un site », remplir nom / secteur / URL / lien admin / repo / hébergement
3. « Enregistrer »
