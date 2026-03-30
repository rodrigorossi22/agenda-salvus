/**
 * Formata os dados preenchidos no modal de evolução para o campo texto "obs" da Feegow.
 */
export function formatNotes({ procedures = [], nextSteps = '', evolution = '' } = {}) {
    const parts = [];

    if (procedures && procedures.length > 0) {
        parts.push(`[Procedimentos: ${procedures.join(', ')}]`);
    }

    if (nextSteps && nextSteps.trim()) {
        parts.push(`[Próximos passos: ${nextSteps.trim()}]`);
    }

    if (evolution && evolution.trim()) {
        parts.push(`Evolução: ${evolution.trim()}`);
    }

    // Usa um traço vertical em vez de \n (Enter)
    return parts.join(' | ');
}
