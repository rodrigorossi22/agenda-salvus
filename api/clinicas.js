export default async function handler(req, res) {
    const { id } = req.query;

    if (!id) return res.status(400).json({ error: 'identificador_clinica is required' });

    // Webhook proxy limpo e remoto
    const webhookUrl = 'https://rossiatmz.com.br/n8n/webhook/dashboard-admin';

    try {
        if (req.method === 'GET') {
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ acao: 'GET', id: id })
            });

            if (!response.ok) throw new Error('Falha no webhook n8n (GET)');
            const data = await response.json();

            if (!data || Object.keys(data).length === 0 || data.length === 0) {
                return res.status(404).json({ error: 'Clínica não encontrada' });
            }

            return res.status(200).json(Array.isArray(data) ? data[0] : data);
        }

        if (req.method === 'PUT') {
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ acao: 'PUT', id: id, ...req.body })
            });

            if (!response.ok) throw new Error('Falha no webhook n8n (PUT)');

            return res.status(200).json(await response.json());
        }

        return res.status(405).json({ error: 'Method Not Allowed' });

    } catch (error) {
        console.error('Webhook DB proxy error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
