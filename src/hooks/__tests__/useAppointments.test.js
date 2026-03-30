import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAppointments } from '../useAppointments';
import * as feegow from '../../services/feegow';

vi.mock('../../services/feegow');

describe('useAppointments hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('does not fetch if dateStart is not provided', async () => {
        const { result } = renderHook(() => useAppointments(null));

        expect(result.current.loading).toBe(true);
        expect(result.current.appointments).toEqual([]);
        expect(feegow.fetchAppointments).not.toHaveBeenCalled();
    });

    it('fetches appointments successfully given a date', async () => {
        const mockData = [{ agendamento_id: 1, paciente_nome: 'Mary' }];
        feegow.fetchAppointments.mockResolvedValueOnce(mockData);

        const { result } = renderHook(() => useAppointments('20-03-2026'));

        expect(result.current.loading).toBe(true);

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.appointments).toEqual(mockData);
        expect(result.current.error).toBeNull();
        expect(feegow.fetchAppointments).toHaveBeenCalledWith('20-03-2026', '20-03-2026');
    });

    it('handles custom date range', async () => {
        const mockData = [{ agendamento_id: 1, paciente_nome: 'Mary' }];
        feegow.fetchAppointments.mockResolvedValueOnce(mockData);

        const { result } = renderHook(() => useAppointments('01-03-2026', '31-03-2026'));

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(feegow.fetchAppointments).toHaveBeenCalledWith('01-03-2026', '31-03-2026');
    });

    it('handles refetching correctly', async () => {
        const mockData1 = [{ agendamento_id: 1 }];
        const mockData2 = [{ agendamento_id: 1 }, { agendamento_id: 2 }];

        feegow.fetchAppointments
            .mockResolvedValueOnce(mockData1)
            .mockResolvedValueOnce(mockData2);

        const { result } = renderHook(() => useAppointments('20-03-2026'));

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.appointments).toEqual(mockData1);

        await act(async () => {
            await result.current.refetch();
        });

        expect(result.current.appointments).toEqual(mockData2);
        expect(feegow.fetchAppointments).toHaveBeenCalledTimes(2);
    });

    it('handles errors properly', async () => {
        feegow.fetchAppointments.mockRejectedValueOnce(new Error('API failure'));

        const { result } = renderHook(() => useAppointments('20-03-2026'));

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.appointments).toEqual([]);
        expect(result.current.error).toBe('API failure');
    });
});
