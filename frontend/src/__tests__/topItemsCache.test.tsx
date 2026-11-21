/**
 * Top artists/tracks share one cached request per time range (2026-11-21 review):
 * the dashboard (20 artists, 50 tracks) and the Top pages (20) must not refetch.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const getTopTracks = vi.fn();
vi.mock('@/lib/api', () => ({
    statsAPI: { getTopTracks: (...args: unknown[]) => getTopTracks(...args) },
    authAPI: {},
}));

import { useTopTracks } from '@/hooks/useSpotifyData';

function wrapper() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
}

const tracks = Array.from({ length: 50 }, (_, i) => ({ id: `t${i}`, name: `Track ${i}` }));

describe('useTopTracks cache sharing', () => {
    beforeEach(() => {
        getTopTracks.mockReset();
        getTopTracks.mockResolvedValue({ data: { tracks } });
    });

    it('fetches 50 once and slices per consumer', async () => {
        const Wrapper = wrapper();
        const dashboard = renderHook(() => useTopTracks('medium_term', 50), { wrapper: Wrapper });
        const topPage = renderHook(() => useTopTracks('medium_term', 20), { wrapper: Wrapper });

        await waitFor(() => expect(dashboard.result.current.data).toHaveLength(50));
        await waitFor(() => expect(topPage.result.current.data).toHaveLength(20));

        expect(getTopTracks).toHaveBeenCalledTimes(1);
        expect(getTopTracks).toHaveBeenCalledWith('medium_term', 50);
    });

    it('uses a separate request per time range', async () => {
        const Wrapper = wrapper();
        const a = renderHook(() => useTopTracks('short_term', 20), { wrapper: Wrapper });
        const b = renderHook(() => useTopTracks('long_term', 20), { wrapper: Wrapper });

        await waitFor(() => expect(a.result.current.data).toBeDefined());
        await waitFor(() => expect(b.result.current.data).toBeDefined());

        expect(getTopTracks).toHaveBeenCalledTimes(2);
    });
});
