/* global process */
const ALLOWED_ORIGINS = [
  'https://agenda-salvus.vercel.app',
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  process.env.NODE_ENV === 'development' ? 'http://localhost:5173' : null
].filter(Boolean);

const ALLOWED_ENDPOINTS = [
  { method: 'GET', pathRegex: /^patient\/search$/ },
  { method: 'GET', pathRegex: /^patient\/list$/ },
  { method: 'POST', pathRegex: /^patient\/create$/ },
  { method: 'GET', pathRegex: /^appoints\/search$/ },
  { method: 'POST', pathRegex: /^appoints\/statusUpdate$/ },
  { method: 'POST', pathRegex: /^appoints\/new-appoint$/ },
  { method: 'GET', pathRegex: /^appoints\/available-schedule$/ },
  { method: 'GET', pathRegex: /^professional\/list$/ },
  { method: 'GET', pathRegex: /^procedures\/list$/ },
  { method: 'POST', pathRegex: /^medical-reports\/create$/ }
];

function applyCors(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin && process.env.NODE_ENV === 'development') {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-app-token');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
}

function sanitizePath(queryPath) {
  const rawPath = Array.isArray(queryPath) ? queryPath.join('/') : queryPath || '';
  return rawPath.replace(/(\.\.[\/\\])+/g, '').replace(/[^\w\-\/]/g, '').replace(/^\/+|\/+$/g, '');
}

function isEndpointAllowed(method, cleanPath) {
  return ALLOWED_ENDPOINTS.some(ep => ep.method === method.toUpperCase() && ep.pathRegex.test(cleanPath));
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  const { path: queryPath, ...otherParams } = req.query;
  const cleanPath = sanitizePath(queryPath);
  if (!isEndpointAllowed(req.method, cleanPath)) {
    return res.status(403).json({ error: 'Endpoint não permitido pelo Proxy de Segurança' });
  }
  const feegowUrl = `https://api.feegow.com/v1/api/${cleanPath}`;
  const url = new URL(feegowUrl);
  for (const [key, value] of Object.entries(otherParams)) url.searchParams.set(key, value);
  const token = process.env.FEEGOW_TOKEN || process.env.VITE_FEEGOW_TOKEN;
  if (!token) return res.status(500).json({ error: 'FEEGOW_TOKEN não configurado no servidor' });
  console.log(`[Proxy] ${req.method} ${cleanPath} (Token length: ${token.length})`);
  try {
    const fetchOptions = {
      method: req.method || 'GET',
      headers: {
        'x-access-token': token,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'AgendaSalvus-Proxy/1.0',
      },
    };
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }
    const response = await fetch(url.toString(), fetchOptions);
    const responseText = await response.text();
    try {
      return res.status(response.status).json(JSON.parse(responseText));
    } catch (jsonError) {
      return res.status(502).json({ error: 'Resposta inválida recebida da API de agendamentos' });
    }
  } catch (error) {
    return res.status(502).json({ error: 'Falha ao conectar com o serviço de agendamento' });
  }
}
