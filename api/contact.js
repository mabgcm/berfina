/**
 * Serverless proxy to forward contact form submissions to Google Apps Script.
 * Set GOOGLE_SCRIPT_URL in your environment (e.g., .env or deployment settings):
 * GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/XXXXX/exec
 */

export default async function handler(req, res) {
    // CORS headers for all responses
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
    }

    const url = process.env.GOOGLE_SCRIPT_URL;
    if (!url) {
        return res.status(500).json({ ok: false, error: 'Missing GOOGLE_SCRIPT_URL' });
    }

    let normalizedBody = req.body;
    if (typeof normalizedBody === 'string') {
        try {
            normalizedBody = JSON.parse(normalizedBody);
        } catch (err) {
            return res.status(400).json({ ok: false, error: 'Invalid JSON body' });
        }
    }

    try {
        const upstream = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(normalizedBody),
        });

        const text = await upstream.text();
        let parsed;
        try {
            parsed = JSON.parse(text);
        } catch (_) {
            parsed = null;
        }

        if (upstream.status !== 200) {
            return res
                .status(upstream.status || 502)
                .json({ ok: false, error: text });
        }

        if (parsed && parsed.ok === false) {
            return res.status(200).json({ ok: false, ...parsed });
        }

        return res.status(200).json({ ok: true, upstream: parsed || text });
    } catch (err) {
        return res.status(500).json({ ok: false, error: err.message || 'Unexpected error' });
    }
}
