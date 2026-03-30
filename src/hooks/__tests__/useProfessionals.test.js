import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useProfessionals } from '../useProfessionals';
import * as feegow from '../../services/feegow';

vi.mock('../../services/feegow');

describe('useProfessionals hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('initially sets loading to true and fetches professionals', async () => {
        const mockData = [{ profissional_id: 1, nome: 'Dr. John' }];
        feegow.fetchProfessionals.mockResolvedValueOnce(mockData);

        const { result } = renderHook(() => useProfessionals());

        expect(result.current.loading).toBe(true);
        expect(result.current.professionals).toEqual([]);
        expect(result.current.error).toBeNull();

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.professionals).toEqual(mockData);
        expect(result.current.error).toBeNull();
        expect(feegow.fetchProfessionals).toHaveBeenCalledTimes(1);
    });

    it('handles errors properly', async () => {
        feegow.fetchProfessionals.mockRejectedValueOnce(new Error('Network error'));

        const { result } = renderHook(() => useProfessionals());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.professionals).toEqual([]);
        expect(result.current.error).toBe('Network error');
    });
});
