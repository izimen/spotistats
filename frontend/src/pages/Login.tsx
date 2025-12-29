/**
 * Login Page - Spotify OAuth authentication
 */
import { Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import AnimatedBackground from "@/components/AnimatedBackground";
import { authAPI } from "@/lib/api";

const Login = () => {
    const handleLogin = () => {
        // Redirect to backend auth endpoint
        const apiUrl = import.meta.env.VITE_API_URL || '';
        window.location.href = `${apiUrl}/auth/login`;
    };



    return (
        <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center">
            <AnimatedBackground />

            <div className="relative z-10 text-center px-4">
                {/* Logo */}
                <div className="mb-8">
                    <div className="inline-flex items-center gap-3 mb-4">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center">
                            <Music className="w-8 h-8 text-primary-foreground" />
                        </div>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-2">
                        Spoti<span className="text-primary">Stats</span>
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-md mx-auto">
                        Odkryj swoje statystyki słuchania muzyki na Spotify
                    </p>
                </div>

                {/* Features */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 max-w-2xl mx-auto">
                    <div className="p-4 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm">
                        <div className="text-2xl mb-2">📊</div>
                        <h3 className="font-semibold text-foreground">Statystyki</h3>
                        <p className="text-sm text-muted-foreground">Szczegółowe dane o Twoim słuchaniu</p>
                    </div>
                    <div className="p-4 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm">
                        <div className="text-2xl mb-2">🎤</div>
                        <h3 className="font-semibold text-foreground">Top Artyści</h3>
                        <p className="text-sm text-muted-foreground">Sprawdź kogo słuchasz najczęściej</p>
                    </div>
                    <div className="p-4 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm">
                        <div className="text-2xl mb-2">🎵</div>
                        <h3 className="font-semibold text-foreground">Top Utwory</h3>
                        <p className="text-sm text-muted-foreground">Twoje ulubione piosenki</p>
                    </div>
                </div>

                {/* Login Button */}
                <Button
                    variant="glow"
                    size="lg"
                    className="px-8 py-6 text-lg"
                    onClick={handleLogin}
                >
                    <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                    </svg>
                    Zaloguj się przez Spotify
                </Button>

                <p className="mt-4 text-sm text-muted-foreground">
                    Wymagane konto Spotify
                </p>
            </div>
        </div>
    );
};

export default Login;
