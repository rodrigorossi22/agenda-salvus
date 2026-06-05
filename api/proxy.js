/* global process */
// Vercel serverless proxy for Feegow API
// This proxies /api/* requests to https://api.feegow.com/v1/api/*
// and adds the x-access-token header from the environment variable VITE_FEEGOW_TOKEN.

export default async function handler(req, res) {
    // Get the path passed from the vercel.json rewrite
    const { path: queryPath, ...otherParams } = req.query;
    const pathStr = Array.isArray(queryPath) ? queryPath.join('/') : queryPath || '';

    const feegowUrl = `https://api.feegow.com/v1/api/${pathStr}`;

    // Forward query params (excluding path used by Vercel routing)
    const url = new URL(feegowUrl);
    for (const [key, value] of Object.entries(otherParams)) {
        url.searchParams.set(key, value);
    }

    const token = process.env.VITE_FEEGOW_TOKEN;

    if (!token) {
        return res.status(500).json({ error: 'VITE_FEEGOW_TOKEN not configured' });
    }

    try {
        const fetchOptions = {
            method: req.method || 'GET',
            headers: {
                'x-access-token': token,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                'Origin': 'https://agenda-salvus.vercel.app',
                'Referer': 'https://agenda-salvus.vercel.app/',
            },
        };

        // Forward body for POST/PUT/PATCH
        if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
            fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
            console.log(`[Proxy] ${req.method} ${pathStr} — body:`, fetchOptions.body);
        }

        const response = await fetch(url.toString(), fetchOptions);
        const data = await response.json();

        // Forward status and data
        res.status(response.status).json(data);
    } catch (error) {
        console.error('Feegow proxy error:', error);
        res.status(502).json({ error: 'Failed to proxy request to Feegow API' });
    }
}
