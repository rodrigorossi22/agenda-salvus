export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { id } = req.query; // identificador_clinica

    if (!id) {
        return res.status(400).json({ error: 'identificador_clinica is required' });
    }

    try {
        // Chama o webhook de sincronização que criamos no n8n (Fase 5)
        // O workflow aRLlqz3lZh0ud46K recebe POST em /webhook/sync-rag-urgente
        const webhookUrl = 'https://rossiatmz.com.br/n8n/webhook/sync-rag-urgente';

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ identificador_clinica: id }),
        });

        if (!response.ok) {
            throw new Error(`N8N webhook rejected with status ${response.status}`);
        }

        const data = await response.json();

        return res.status(200).json({
            success: true,
            message: 'Sincronização iniciada com sucesso na infraestrutura de IA.',
            data
        });

    } catch (error) {
        console.error('Error triggering RAG sync:', error);
        // Even if it fails network-wise, we let the user know
        return res.status(500).json({ error: 'Failed to trigger AI synchronization' });
    }
}
