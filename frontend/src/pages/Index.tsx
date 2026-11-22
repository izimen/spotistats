import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AxiosError } from "axios";
import Poster from "@/components/Poster";
import WeekBars from "@/components/WeekBars";
import RecentlyPlayed from "@/components/RecentlyPlayed";
import GenreList from "@/components/GenreChart";
import TimeRangeFilter, { type TimeRange, timeRangeLabel } from "@/components/TimeRangeFilter";
import { Section, Figure, FigureRow, ChartRow, EmptyNote, ListSkeleton, Skeleton } from "@/components/Editorial";
import { useUser, useTopArtists, useTopTracks, mapTimeRange } from "@/hooks/useSpotifyData";
import { calculateTopGenres } from "@/lib/genreUtils";
import { calculateListeningAge } from "@/lib/listeningAge";
import { formatDuration } from "@/lib/format";

const RANGE_PHRASE: Record<TimeRange, string> = {
  week: "z ostatnich 4 tygodni",
  month: "z ostatnich 6 miesięcy",
  year: "z ostatniego roku",
};

const monthYear = () =>
  new Date().toLocaleDateString("pl-PL", { month: "long", year: "numeric" });

const Index = () => {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<TimeRange>("month");
  const apiTimeRange = mapTimeRange(timeRange);

  const { data: user, error: userError } = useUser();
  const { data: artists, isLoading: artistsLoading } = useTopArtists(apiTimeRange, 20);
  const { data: tracks, isLoading: tracksLoading } = useTopTracks(apiTimeRange, 50);

  useEffect(() => {
    if (userError && (userError as AxiosError)?.response?.status === 401) navigate("/login");
  }, [userError, navigate]);

  const top = artists?.[0];
  const topTrack = tracks?.[0];
  const age = calculateListeningAge(tracks || []);
  const { topGenreName } = calculateTopGenres(artists || []);
  const firstName = user?.displayName?.split(" ")[0];

  return (
    <div className="space-y-16 md:space-y-20">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <p className="text-muted-foreground">
          {firstName ? `Cześć, ${firstName}.` : "Cześć."} Twoja muzyka {RANGE_PHRASE[timeRange]}.
        </p>
        <TimeRangeFilter value={timeRange} onChange={setTimeRange} />
      </div>

      {artistsLoading ? (
        <Skeleton className="h-[420px] w-full" />
      ) : top ? (
        <Poster
          kicker={`Najczęściej słuchany artysta ${RANGE_PHRASE[timeRange]}`}
          name={top.name}
          image={top.imageLarge || top.image}
          dateLine={age ? `Słuchasz jak ${age}-latek · ${monthYear()}` : monthYear()}
          href={top.spotifyUrl}
        />
      ) : (
        <EmptyNote title="Jeszcze nic tu nie ma">
          Statystyki pojawią się, gdy posłuchasz muzyki na Spotify. Starszą historię możesz wgrać z eksportu danych Spotify.
        </EmptyNote>
      )}

      <FigureRow>
        <Figure
          label="Utwór numer jeden"
          value={topTrack?.name || "—"}
          note={topTrack?.artists?.[0]?.name || topTrack?.artist}
        />
        <Figure label="Najczęstszy gatunek" value={topGenreName || "—"} note={timeRangeLabel(timeRange)} />
        <Figure
          label="Wiek Twojej muzyki"
          value={age ? `${age} lat` : "—"}
          note="Jak ktoś, kto miał 20 lat, gdy wyszły Twoje utwory"
        />
        <Figure label="Artyści na liście" value={artists?.length ?? "—"} note="Twoje top 20 według Spotify" />
      </FigureRow>

      <div className="grid gap-16 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-14">
        <Section title="Top utwory" action={{ to: "/top?typ=utwory", label: "Cała lista" }}>
          {tracksLoading ? (
            <ListSkeleton />
          ) : tracks && tracks.length > 0 ? (
            <ol>
              {tracks.slice(0, 5).map((t, i) => (
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
          ) : (
            <EmptyNote title="Brak utworów w tym okresie" />
          )}
        </Section>

        <Section title="Top artyści" action={{ to: "/top", label: "Cała lista" }}>
          {artistsLoading ? (
            <ListSkeleton />
          ) : artists && artists.length > 0 ? (
            <ol>
              {artists.slice(0, 5).map((a, i) => (
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
              ))}
            </ol>
          ) : (
            <EmptyNote title="Brak artystów w tym okresie" />
          )}
        </Section>
      </div>

      <div className="grid gap-16 lg:grid-cols-2 lg:gap-14">
        <Section title="Ten tydzień" note="Odtworzenia zapisane przez SpotiStats">
          <WeekBars />
        </Section>
        <Section title="Gatunki" note={`Na podstawie top 20 artystów, ${timeRangeLabel(timeRange).toLowerCase()}`}>
          <GenreList artists={artists} />
        </Section>
      </div>

      <RecentlyPlayed />
    </div>
  );
};

export default Index;
