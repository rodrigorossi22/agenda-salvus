import { describe, it, expect } from 'vitest';
import { formatNotes } from '../formatNotes';

describe('formatNotes utility', () => {
    it('formats completely populated fields correctly', () => {
        const input = {
            procedures: ['Consulta', 'Avaliação postural'],
            nextSteps: 'Retorno em 30 dias',
            evolution: 'Paciente relatou melhora nas dores lombares.'
        };

        const expected = `[Procedimentos: Consulta, Avaliação postural] | [Próximos passos: Retorno em 30 dias] | Evolução: Paciente relatou melhora nas dores lombares.`;
        expect(formatNotes(input)).toBe(expected);
    });

    it('omits procedures if empty', () => {
        const input = {
            procedures: [],
            nextSteps: 'Retorno em 30 dias',
            evolution: 'Sem queixas.'
        };

        const expected = `[Próximos passos: Retorno em 30 dias] | Evolução: Sem queixas.`;
        expect(formatNotes(input)).toBe(expected);
    });

    it('omits next steps if empty', () => {
        const input = {
            procedures: ['Consulta'],
            nextSteps: '',
            evolution: 'Tudo ok.'
        };

        const expected = `[Procedimentos: Consulta] | Evolução: Tudo ok.`;
        expect(formatNotes(input)).toBe(expected);
    });

    it('omits evolution if empty', () => {
        const input = {
            procedures: ['Consulta'],
            nextSteps: 'Retorno',
            evolution: ''
        };

        const expected = `[Procedimentos: Consulta] | [Próximos passos: Retorno]`;
        expect(formatNotes(input)).toBe(expected);
    });

    it('returns empty string if all fields are empty', () => {
        expect(formatNotes({})).toBe('');
        expect(formatNotes({ procedures: [], nextSteps: '   ', evolution: '' })).toBe('');
    });
});
