/**
 * Callback Page - Handles Spotify OAuth callback
 * Backend sets cookie and redirects here after successful auth
 */
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { authAPI, api } from "@/lib/api";

const Callback = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('Przetwarzanie autoryzacji...');

    useEffect(() => {
        const checkAuth = async () => {
            const error = searchParams.get('error');

            if (error) {
                console.error('Auth error from URL:', error);
                setStatus('error');
                setMessage('Błąd logowania: ' + error);
                setTimeout(() => navigate('/login?error=' + encodeURIComponent(error)), 2000);
                return;
            }

            // SEC-003: Exchange short-lived auth code for JWT via POST
            // JWT is never exposed in URL bar, browser history, or referrer headers
            const authCode = searchParams.get('code');
            if (authCode) {
                // Clear code from URL immediately
                window.history.replaceState({}, '', '/callback');
                try {
                    const response = await api.post('/auth/exchange', { code: authCode });
                    if (response.data?.token) {
                        localStorage.setItem('spotify_jwt', response.data.token);
                    }
                } catch (err) {
                    console.error('Code exchange failed:', err);
                    setStatus('error');
                    setMessage('Nie udalo sie wymienic kodu autoryzacji');
                    setTimeout(() => navigate('/login?error=exchange_failed'), 2000);
                    return;
                }
            }

            await new Promise(resolve => setTimeout(resolve, 300));

            try {
                // Verify token is working
                const response = await authAPI.getUser();
                if (response.data.user) {
                    setStatus('success');
                    setMessage(`Witaj ${response.data.user.displayName}!`);
                    setTimeout(() => navigate('/'), 1500);
                } else {
                    throw new Error('No user data');
                }
            } catch (err) {
                console.error('Auth verification failed:', err);
                localStorage.removeItem('spotify_jwt');
                setStatus('error');
                setMessage('Nie udało się zweryfikować logowania');
                setTimeout(() => navigate('/login?error=verification_failed'), 2000);
            }
        };

        checkAuth();
    }, [navigate, searchParams]);

    return (
        <main className="flex min-h-screen flex-col justify-center bg-background px-5 sm:px-10 lg:px-16" aria-live="polite">
            <h1 className={`type-poster text-[clamp(4rem,16vw,12rem)] ${status === 'error' ? 'text-warn' : 'text-foreground'} ${status === 'loading' ? 'motion-safe:animate-pulse' : ''}`}>
                {status === 'loading' && 'Logowanie…'}
                {status === 'success' && 'Gotowe'}
                {status === 'error' && 'Nie wyszło'}
            </h1>
            <p className="mt-6 max-w-[50ch] text-lg text-muted-foreground">{message}</p>
        </main>
    );
};

export default Callback;
