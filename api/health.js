// Fonction serverless Vercel : teste si les sites listés dans sites.json
// répondent bien (code HTTP 2xx/3xx), pour un indicateur de santé côté dashboard.
//
// Sécurité : ne prend AUCUNE URL en entrée depuis le client — elle relit
// sites.json elle-même côté serveur et ne teste que les URLs qui s'y
// trouvent déjà. Ça évite d'exposer un proxy HTTP arbitraire (SSRF).
//
// Variables d'environnement requises : ADMIN_PASSWORD (les mêmes que api/save.js)

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

    const { password } = req.body || {};
    const expectedPassword = process.env.ADMIN_PASSWORD;

    if (!expectedPassword) {
        res.status(500).json({ error: "ADMIN_PASSWORD n'est pas configuré sur le serveur" });
        return;
    }

    if (!passwordMatches(password, expectedPassword)) {
        res.status(401).json({ error: 'Mot de passe incorrect' });
        return;
    }

    let sites = [];
    try {
        const host = req.headers['x-forwarded-host'] || req.headers.host;
        const proto = req.headers['x-forwarded-proto'] || 'https';
        const sitesRes = await fetch(`${proto}://${host}/sites.json?v=${Date.now()}`);
        sites = await sitesRes.json();
        if (!Array.isArray(sites)) sites = [];
    } catch (err) {
        res.status(500).json({ error: 'Impossible de lire sites.json : ' + err.message });
        return;
    }

    const results = await Promise.all(
        sites.filter(s => s.url).map(async (s) => {
            const start = Date.now();
            try {
                const r = await fetch(s.url, {
                    method: 'GET',
                    redirect: 'follow',
                    signal: AbortSignal.timeout(8000)
                });
                return { url: s.url, ok: r.ok, status: r.status, ms: Date.now() - start };
            } catch (err) {
                return { url: s.url, ok: false, error: err.message, ms: Date.now() - start };
            }
        })
    );

    res.status(200).json({ results, checkedAt: new Date().toISOString() });
};
