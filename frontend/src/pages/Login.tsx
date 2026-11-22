/**
 * Login — three animated concepts while we pick one (?v=1|2|3).
 * The switcher is only rendered in dev / preview builds.
 */
import { useSearchParams } from "react-router-dom";
import { EqualizerLogin, VinylLogin, WallLogin } from "@/components/login/LoginVariants";

const ERRORS: Record<string, string> = {
    access_denied: "Logowanie przerwane w Spotify. Spróbuj jeszcze raz.",
    exchange_failed: "Nie udało się dokończyć logowania. Spróbuj jeszcze raz.",
    verification_failed: "Nie udało się potwierdzić logowania. Spróbuj jeszcze raz.",
    callback_failed: "Spotify nie przyjęło logowania. Jeśli to się powtarza, poproś właściciela aplikacji o dodanie Twojego konta.",
};

const VARIANTS = {
    "1": { name: "Equalizer", Component: EqualizerLogin },
    "2": { name: "Winyl", Component: VinylLogin },
    "3": { name: "Afisz", Component: WallLogin },
} as const;
type VariantKey = keyof typeof VARIANTS;

const showSwitcher = import.meta.env.DEV || import.meta.env.VITE_PREVIEW_MODE === "true";

const Login = () => {
    const [params, setParams] = useSearchParams();
    const error = params.get("error");
    const v = (params.get("v") ?? "1") as VariantKey;
    const { Component } = VARIANTS[v] ?? VARIANTS["1"];

    const handleLogin = () => {
        const apiUrl = import.meta.env.VITE_API_URL || "";
        window.location.href = `${apiUrl}/auth/login`;
    };

    const errorNode = error ? (
        <p role="alert" className="mb-4 max-w-[40ch] border-l-2 border-warn pl-3 text-sm text-foreground">
            {ERRORS[error] ?? "Nie udało się zalogować. Spróbuj jeszcze raz."}
        </p>
    ) : null;

    return (
        <>
            <Component error={errorNode} onLogin={handleLogin} />
            {showSwitcher && (
                <nav aria-label="Wariant ekranu logowania" className="fixed right-3 top-3 z-50 flex gap-1 border border-border bg-background/90 p-1 text-sm backdrop-blur">
                    {(Object.keys(VARIANTS) as VariantKey[]).map(key => (
                        <button
                            key={key}
                            type="button"
                            aria-pressed={key === v}
                            onClick={() => {
                                const next = new URLSearchParams(params);
                                next.set("v", key);
                                setParams(next, { replace: true });
                            }}
                            className={`px-3 py-1.5 font-semibold ${key === v ? "bg-foreground text-ink" : "text-muted-foreground hover:text-foreground"}`}
                        >
                            {key}. {VARIANTS[key].name}
                        </button>
                    ))}
                </nav>
            )}
        </>
    );
};

export default Login;
