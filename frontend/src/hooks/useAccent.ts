import { useEffect } from "react";
import { useTopArtists } from "@/hooks/useSpotifyData";
import { applyAccent, cachedAccent, extractAccent, DEFAULT_ACCENT } from "@/lib/accent";

/**
 * Tints the app with the colour of the user's #1 artist (6-month list).
 * Cached colours apply instantly; new ones cross-fade (body transition).
 */
export function useAccent() {
    const { data: artists } = useTopArtists("medium_term", 1);
    const top = artists?.[0];
    const url = top?.imageLarge || top?.image || null;

    useEffect(() => {
        let cancelled = false;
        const cached = cachedAccent(url);
        applyAccent(cached || DEFAULT_ACCENT);
        if (!cached && url) {
            extractAccent(url).then(hex => {
                if (!cancelled) applyAccent(hex);
            });
        }
        return () => {
            cancelled = true;
        };
    }, [url]);
}
