import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AxiosError } from "axios";
import { PageHeader, Figure, FigureRow, ChartRow, EmptyNote, ListSkeleton } from "@/components/Editorial";
import Segmented from "@/components/Segmented";
import TimeRangeFilter, { type TimeRange, timeRangeLabel } from "@/components/TimeRangeFilter";
import { useUser, useTopArtists, useTopTracks, mapTimeRange } from "@/hooks/useSpotifyData";
import { calculateTopGenres } from "@/lib/genreUtils";
import { formatDuration } from "@/lib/format";

type Kind = "artysci" | "utwory";

const Top = () => {
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const kind: Kind = params.get("typ") === "utwory" ? "utwory" : "artysci";
    const [timeRange, setTimeRange] = useState<TimeRange>("month");
    const apiRange = mapTimeRange(timeRange);

    const { error: userError } = useUser();
    const { data: artists, isLoading: artistsLoading } = useTopArtists(apiRange, 20);
    const { data: tracks, isLoading: tracksLoading } = useTopTracks(apiRange, 20);

    useEffect(() => {
        if (userError && (userError as AxiosError)?.response?.status === 401) navigate("/login");
    }, [userError, navigate]);

    const setKind = (k: Kind) => setParams(k === "utwory" ? { typ: "utwory" } : {}, { replace: true });

    const genres = new Set((artists || []).flatMap(a => a.genres || []));
    const { topGenreName } = calculateTopGenres(artists || []);
    const trackArtists = new Set((tracks || []).map(t => t.artists?.[0]?.name || t.artist));
    const years = (tracks || [])
        .map(t => parseInt(t.album?.releaseDate?.slice(0, 4) || "", 10))
        .filter(y => !isNaN(y));
    const avgYear = years.length ? Math.round(years.reduce((a, b) => a + b, 0) / years.length) : null;
    const newest = years.length ? Math.max(...years) : null;

    const loading = kind === "artysci" ? artistsLoading : tracksLoading;
    const count = kind === "artysci" ? artists?.length ?? 0 : tracks?.length ?? 0;

    return (
        <div>
            <PageHeader
                title="Topki"
                meta={`Twoja lista według Spotify, ${timeRangeLabel(timeRange).toLowerCase()}.`}
                controls={
                    <>
                        <Segmented
                            size="lg"
                            className="basis-full md:basis-auto"
                            label="Rodzaj listy"
                            value={kind}
                            onChange={setKind}
                            options={[
                                { value: "artysci", label: "Artyści" },
                                { value: "utwory", label: "Utwory" },
                            ]}
                        />
                        <TimeRangeFilter value={timeRange} onChange={setTimeRange} />
                    </>
                }
            />

            {kind === "artysci" ? (
                <FigureRow className="mb-14 lg:grid-cols-3">
                    <Figure label="Numer jeden" value={artists?.[0]?.name || "—"} emphasis />
                    <Figure label="Najczęstszy gatunek" value={topGenreName || "—"} />
                    <Figure label="Różne gatunki" value={genres.size || "—"} note="u artystów z listy" />
                </FigureRow>
            ) : (
                <FigureRow className="mb-14 lg:grid-cols-3">
                    <Figure label="Numer jeden" value={tracks?.[0]?.name || "—"} emphasis />
                    <Figure label="Różni wykonawcy" value={trackArtists.size || "—"} note={`na ${tracks?.length ?? 0} utworów`} />
                    <Figure label="Średni rok wydania" value={avgYear ?? "—"} note={newest ? `najnowszy z ${newest}` : undefined} />
                </FigureRow>
            )}

            {loading ? (
                <ListSkeleton rows={8} />
            ) : count === 0 ? (
                <EmptyNote title="Lista jest pusta">Słuchaj muzyki na Spotify, a Twoja lista pojawi się tutaj.</EmptyNote>
            ) : (
                <ol className="grid gap-x-12 md:grid-cols-2 rule">
                    {kind === "artysci"
                        ? artists!.map((a, i) => (
                            <ChartRow
                                key={`${a.name}-${i}`}
                                index={i}
                                rank={i + 1}
                                image={a.image}
                                round
                                title={a.name}
                                subtitle={a.genres?.slice(0, 2).join(", ") || undefined}
                                href={a.spotifyUrl}
                            />
                        ))
                        : tracks!.map((t, i) => (
                            <ChartRow
                                key={t.id || `${t.name}-${i}`}
                                index={i}
                                rank={i + 1}
                                image={t.album?.image}
                                title={t.name}
                                subtitle={t.artists?.map(a => a.name).join(", ") || t.artist}
                                value={t.duration ? formatDuration(t.duration) : undefined}
                                href={t.spotifyUrl}
                            />
                        ))}
                </ol>
            )}
            <p className="mt-8 text-sm text-muted-foreground">Kliknij pozycję, aby otworzyć ją w Spotify.</p>
        </div>
    );
};

export default Top;
