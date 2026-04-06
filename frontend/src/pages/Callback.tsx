/**
 * Callback Page - Handles Spotify OAuth callback
 * Backend sets cookie and redirects here after successful auth
 */
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Music, Loader2, CheckCircle, XCircle } from "lucide-react";
import AnimatedBackground from "@/components/AnimatedBackground";
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
        <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center">
            <AnimatedBackground />

            <div className="relative z-10 text-center">
                <div className="inline-flex items-center gap-3 mb-6">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center ${status === 'loading' ? 'animate-pulse' : ''}`}>
                        {status === 'loading' && <Music className="w-8 h-8 text-primary-foreground" />}
                        {status === 'success' && <CheckCircle className="w-8 h-8 text-primary-foreground" />}
                        {status === 'error' && <XCircle className="w-8 h-8 text-primary-foreground" />}
                    </div>
                </div>

                <h2 className="text-2xl font-bold text-foreground mb-4">
                    {status === 'loading' && 'Logowanie...'}
                    {status === 'success' && 'Logowanie udane'}
                    {status === 'error' && 'Błąd'}
                </h2>

                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    {status === 'loading' && <Loader2 className="w-5 h-5 animate-spin" />}
                    <span>{message}</span>
                </div>
            </div>
        </div>
    );
};

export default Callback;
