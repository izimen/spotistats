import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { PageHeader, Section, Figure, FigureRow, Skeleton } from "@/components/Editorial";
import { useUser, useListeningChart } from "@/hooks/useSpotifyData";
import { authAPI } from "@/lib/api";
import { exportHistoryCsv } from "@/lib/download";
import { timeAgo } from "@/lib/format";

const SYNC_STALE_MS = 3 * 60 * 60 * 1000; // hourly sync: 3 h without one means something is wrong

function collectionState(user: {
    collectionEnabled?: boolean;
    lastSyncAt?: string | null;
    lastGapDetectedAt?: string | null;
    syncFailureCount?: number;
}) {
    if (user.collectionEnabled === false) return { tone: "off" as const, label: "Zbieranie wyłączone" };
    const last = user.lastSyncAt ? new Date(user.lastSyncAt).getTime() : 0;
    const gap = user.lastGapDetectedAt ? new Date(user.lastGapDetectedAt).getTime() : 0;
    if ((user.syncFailureCount ?? 0) > 0 || (last && Date.now() - last > SYNC_STALE_MS)) {
        return { tone: "warn" as const, label: "Synchronizacja nie działa" };
    }
    if (gap && gap >= last - 60 * 60 * 1000) return { tone: "warn" as const, label: "Mogły przepaść odtworzenia" };
    return { tone: "live" as const, label: "Zbieranie działa" };
}

const Account = () => {
    const navigate = useNavigate();
    const { data: user, isLoading, error } = useUser();
    const { data: chart } = useListeningChart(30);
    const [busy, setBusy] = useState<"export" | "disconnect" | "delete" | null>(null);

    useEffect(() => {
        if (error && (error as AxiosError)?.response?.status === 401) navigate("/login");
    }, [error, navigate]);

    const logout = async () => {
        try {
            await authAPI.logout();
        } finally {
            navigate("/login");
        }
    };

    const disconnect = async () => {
        if (!window.confirm("Zatrzymać zbieranie historii? Zapisane dane zostaną, ale nowe odtworzenia nie będą zapisywane, dopóki znowu się nie zalogujesz.")) return;
        setBusy("disconnect");
        try {
            await authAPI.disconnect();
        } catch {
            /* logged out locally anyway */
        }
        navigate("/login");
    };

    const deleteAccount = async () => {
        if (!window.confirm("Usunąć konto i całą zapisaną historię? Tego nie da się cofnąć.")) return;
        setBusy("delete");
        try {
            await authAPI.deleteAccount();
            navigate("/login");
        } catch {
            toast.error("Nie udało się usunąć konta. Spróbuj ponownie.");
            setBusy(null);
        }
    };

    const doExport = async () => {
        setBusy("export");
        await exportHistoryCsv();
        setBusy(null);
    };

    if (isLoading || !user) {
        return <Skeleton className="h-64 w-full" />;
    }

    const state = collectionState(user);
    const stats = chart?.stats;

    return (
        <div className="space-y-16">
            <PageHeader
                title="Konto"
                meta={
                    <>
                        Zalogowano jako <span className="font-semibold text-foreground">{user.displayName || user.spotifyId}</span>.
                    </>
                }
            />

            <Section title="Zbieranie historii" note="Co godzinę zapisujemy, czego słuchasz na Spotify. Spotify pokazuje tylko 50 ostatnich utworów, więc bez tego historia by przepadała.">
                <div className="flex items-start gap-4">
                    <span
                        aria-hidden="true"
                        className={`mt-2 h-3 w-3 shrink-0 rounded-full ${state.tone === "live" ? "bg-primary motion-safe:animate-pulse" : state.tone === "warn" ? "bg-warn" : "bg-muted-foreground"}`}
                    />
                    <div>
                        <p className="type-head text-[28px]">{state.label}</p>
                        <p className="mt-1 text-muted-foreground">
                            {user.lastSyncAt ? <>Ostatnia synchronizacja {timeAgo(user.lastSyncAt)}.</> : "Jeszcze nie było synchronizacji."}
                            {state.tone === "warn" && " Zaloguj się ponownie, a jeśli to nie pomoże, napisz do właściciela aplikacji."}
                            {state.tone === "off" && " Zaloguj się ponownie, aby wznowić."}
                        </p>
                    </div>
                </div>

                <FigureRow className="mt-10 lg:grid-cols-3">
                    <Figure label="Zapisane odtworzenia" value={stats?.totalPlays?.toLocaleString("pl-PL") ?? "—"} />
                    <Figure
                        label="Zbieramy od"
                        value={stats?.firstPlay ? new Date(stats.firstPlay).toLocaleDateString("pl-PL", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                    />
                    <Figure label="Strefa czasowa" value="Warszawa" note="Godziny i dni liczone w czasie polskim" />
                </FigureRow>
            </Section>

            <Section title="Twoje dane">
                <ul className="divide-y divide-border border-b border-border">
                    <AccountAction
                        title="Pobierz historię jako CSV"
                        description="Wszystkie zapisane odtworzenia w jednym pliku, który otworzysz w Excelu."
                        action="Pobierz"
                        busyLabel="Pobieram…"
                        busy={busy === "export"}
                        onClick={doExport}
                    />
                    <AccountAction
                        title="Wyloguj się"
                        description="Wylogowanie nie zatrzymuje zbierania historii."
                        action="Wyloguj"
                        onClick={logout}
                    />
                    <AccountAction
                        title="Zatrzymaj zbieranie"
                        description="Odłączamy Spotify i przestajemy zapisywać nowe odtworzenia. Zapisana historia zostaje."
                        action="Zatrzymaj"
                        busyLabel="Zatrzymuję…"
                        busy={busy === "disconnect"}
                        onClick={disconnect}
                        danger
                    />
                    <AccountAction
                        title="Usuń konto"
                        description="Usuwamy konto i całą zapisaną historię. Tego nie da się cofnąć."
                        action="Usuń konto"
                        busyLabel="Usuwam…"
                        busy={busy === "delete"}
                        onClick={deleteAccount}
                        danger
                    />
                </ul>
            </Section>

            <footer className="rule pt-6 text-sm text-muted-foreground">
                Dane pochodzą ze Spotify. SpotiStats nie jest powiązany ze Spotify AB.
            </footer>
        </div>
    );
};

const AccountAction = ({
    title,
    description,
    action,
    busyLabel,
    busy = false,
    onClick,
    danger = false,
}: {
    title: string;
    description: string;
    action: string;
    busyLabel?: string;
    busy?: boolean;
    onClick: () => void;
    danger?: boolean;
}) => (
    <li className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-[60ch]">
            <p className="font-semibold text-foreground">{title}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <button
            type="button"
            onClick={onClick}
            disabled={busy}
            className={`touch-target shrink-0 self-start border px-5 text-sm font-semibold transition-colors disabled:opacity-60 sm:self-auto ${danger
                ? "border-warn/60 text-warn hover:bg-warn hover:text-ink"
                : "border-foreground/40 text-foreground hover:border-foreground hover:bg-foreground hover:text-ink"
                }`}
        >
            {busy ? busyLabel : action}
        </button>
    </li>
);

export default Account;
