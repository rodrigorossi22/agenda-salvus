/**
 * Formata os dados preenchidos no modal de evolução para o campo texto "obs" da Feegow.
 *
 * Formato esperado:
 * [Procedimentos: Proc 1, Proc 2]
 * [Próximos passos: Retorno]
 * Evolução: Texto livre
 *
 * @param {Object} params
 * @param {string[]} params.procedures - Lista de nomes dos procedimentos
 * @param {string} params.nextSteps - Texto livre dos próximos passos
 * @param {string} params.evolution - Texto livre da evolução
 * @returns {string} String formatada
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

    return parts.join('\n');
}
