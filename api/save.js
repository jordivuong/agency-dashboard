// Fonction serverless Vercel : reçoit la liste des sites depuis index.html,
// vérifie le mot de passe, puis committe sites.json directement sur GitHub.
// Même mécanisme que api/save.js du template site-template.
//
// Variables d'environnement requises (Vercel > Project > Settings > Environment Variables) :
//   ADMIN_PASSWORD  — mot de passe d'accès au dashboard
//   GITHUB_TOKEN    — Personal Access Token fine-grained, permission Contents: Read & write,
//                     limité à ce repo (agency-dashboard)
//   GITHUB_REPO     — "owner/repo", ex: "jordivuong/agency-dashboard"
//   GITHUB_BRANCH   — branche à mettre à jour, ex: "main" (optionnel, défaut "main")

const crypto = require('crypto');

function passwordMatches(candidate, expected) {
    if (typeof candidate !== 'string' || typeof expected !== 'string') return false;
    const a = Buffer.from(candidate);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
}

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Méthode non autorisée' });
        return;
    }

    const { password, data, verifyOnly } = req.body || {};
    const expectedPassword = process.env.ADMIN_PASSWORD;

    if (!expectedPassword) {
        res.status(500).json({ error: "ADMIN_PASSWORD n'est pas configuré sur le serveur" });
        return;
    }

    if (!passwordMatches(password, expectedPassword)) {
        res.status(401).json({ error: 'Mot de passe incorrect' });
        return;
    }

    if (verifyOnly) {
        res.status(200).json({ ok: true });
        return;
    }

    if (!Array.isArray(data)) {
        res.status(400).json({ error: 'Données manquantes ou invalides (tableau attendu)' });
        return;
    }

    const token = process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_REPO;
    const branch = process.env.GITHUB_BRANCH || 'main';
    const filePath = 'sites.json';

    if (!token || !repo) {
        res.status(500).json({ error: "GITHUB_TOKEN ou GITHUB_REPO n'est pas configuré sur le serveur" });
        return;
    }

    const ghHeaders = {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
    };

    try {
        const getRes = await fetch(
            `https://api.github.com/repos/${repo}/contents/${filePath}?ref=${encodeURIComponent(branch)}`,
            { headers: ghHeaders }
        );
        if (!getRes.ok) {
            const errText = await getRes.text();
            throw new Error(`Lecture GitHub échouée (${getRes.status}) : ${errText}`);
        }
        const fileInfo = await getRes.json();

        const newContent = Buffer.from(JSON.stringify(data, null, 4), 'utf-8').toString('base64');
        const putRes = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
            method: 'PUT',
            headers: { ...ghHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: 'Mise à jour de la liste des sites via le dashboard',
                content: newContent,
                sha: fileInfo.sha,
                branch
            })
        });

        if (!putRes.ok) {
            const errText = await putRes.text();
            throw new Error(`Écriture GitHub échouée (${putRes.status}) : ${errText}`);
        }

        const result = await putRes.json();
        res.status(200).json({ ok: true, commit: result.commit && result.commit.sha });
    } catch (err) {
        res.status(500).json({ error: err.message || 'Erreur inconnue' });
    }
};
