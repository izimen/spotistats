/**
 * Login — a record slides out of the SpotiStats sleeve and plays.
 */
import { useSearchParams } from "react-router-dom";
import VinylLogin from "@/components/login/VinylLogin";

const ERRORS: Record<string, string> = {
    access_denied: "Logowanie przerwane w Spotify. Spróbuj jeszcze raz.",
    exchange_failed: "Nie udało się dokończyć logowania. Spróbuj jeszcze raz.",
    verification_failed: "Nie udało się potwierdzić logowania. Spróbuj jeszcze raz.",
    callback_failed: "Spotify nie przyjęło logowania. Jeśli to się powtarza, poproś właściciela aplikacji o dodanie Twojego konta.",
};

const Login = () => {
    const [params] = useSearchParams();
    const error = params.get("error");

    const handleLogin = () => {
        const apiUrl = import.meta.env.VITE_API_URL || "";
        window.location.href = `${apiUrl}/auth/login`;
    };

    const errorNode = error ? (
        <p role="alert" className="mb-4 max-w-[40ch] border-l-2 border-warn pl-3 text-sm text-foreground">
            {ERRORS[error] ?? "Nie udało się zalogować. Spróbuj jeszcze raz."}
        </p>
    ) : null;

    return <VinylLogin error={errorNode} onLogin={handleLogin} />;
};

export default Login;
