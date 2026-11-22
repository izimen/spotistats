/**
 * Login — the wordmark as a poster, one Spotify action.
 */
import { useSearchParams } from "react-router-dom";

const ERRORS: Record<string, string> = {
    access_denied: "Logowanie przerwane w Spotify. Spróbuj jeszcze raz.",
    exchange_failed: "Nie udało się dokończyć logowania. Spróbuj jeszcze raz.",
    verification_failed: "Nie udało się potwierdzić logowania. Spróbuj jeszcze raz.",
    callback_failed: "Spotify nie przyjęło logowania. Jeśli to się powtarza, poproś właściciela aplikacji o dodanie Twojego konta.",
};

const SpotifyMark = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 fill-current">
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.52 17.34c-.24.36-.66.48-1.02.24-2.82-1.74-6.36-2.1-10.56-1.14-.42.12-.78-.18-.9-.54-.12-.42.18-.78.54-.9 4.56-1.02 8.52-.6 11.64 1.32.42.18.48.66.3 1.02zm1.44-3.3c-.3.42-.84.6-1.26.3-3.24-1.98-8.16-2.58-11.94-1.38-.48.12-1.02-.12-1.14-.6-.12-.48.12-1.02.6-1.14C9.6 9.9 15 10.56 18.72 12.84c.36.18.54.78.24 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.3c-.6.18-1.2-.18-1.38-.72-.18-.6.18-1.2.72-1.38 4.26-1.26 11.28-1.02 15.72 1.62.54.3.72 1.02.42 1.56-.3.42-1.02.6-1.56.3z" />
    </svg>
);

const Login = () => {
    const [params] = useSearchParams();
    const error = params.get("error");

    const handleLogin = () => {
        const apiUrl = import.meta.env.VITE_API_URL || "";
        window.location.href = `${apiUrl}/auth/login`;
    };

    return (
        <main className="flex min-h-[100svh] flex-col justify-between bg-background px-5 py-8 sm:px-10 lg:px-16">
            <p className="text-sm text-muted-foreground">Statystyki słuchania ze Spotify</p>

            <div className="flex-1 pt-[12svh] pb-12 sm:flex-none sm:py-12">
                <h1 className="type-poster text-[30vw] text-primary sm:text-[clamp(4.5rem,21vw,17rem)]">
                    <span className="block sm:inline">Spoti</span><span className="block sm:inline">Stats</span>
                </h1>
                <div className="mt-10 grid gap-10 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                    <p className="max-w-[46ch] text-lg text-muted-foreground">
                        Twoi top artyści i utwory, historia słuchania zapisywana co godzinę i podsumowanie każdego miesiąca.
                    </p>
                    <div>
                        {error && (
                            <p role="alert" className="mb-4 max-w-[40ch] border-l-2 border-warn pl-3 text-sm text-foreground">
                                {ERRORS[error] ?? "Nie udało się zalogować. Spróbuj jeszcze raz."}
                            </p>
                        )}
                        <button
                            type="button"
                            onClick={handleLogin}
                            className="touch-target inline-flex items-center gap-3 rounded-full bg-spotify px-7 py-3 text-base font-bold text-ink hover:brightness-110"
                        >
                            <SpotifyMark />
                            Zaloguj się przez Spotify
                        </button>
                    </div>
                </div>
            </div>

            <p className="max-w-[70ch] text-sm text-muted-foreground">
                Potrzebujesz konta Spotify, dodanego przez właściciela aplikacji. Logujesz się na stronie Spotify, nie widzimy Twojego hasła.
                SpotiStats nie jest powiązany ze Spotify.
            </p>
        </main>
    );
};

export default Login;
