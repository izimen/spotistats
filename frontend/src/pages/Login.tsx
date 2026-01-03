/**
 * Login Page - Premium Spotify OAuth authentication
 */
import { Music, Headphones, BarChart3, Users, Sparkles } from "lucide-react";
import AnimatedBackground from "@/components/AnimatedBackground";

const Login = () => {
    const handleLogin = () => {
        const apiUrl = import.meta.env.VITE_API_URL || '';
        window.location.href = `${apiUrl}/auth/login`;
    };

    const features = [
        {
            icon: BarChart3,
            title: "Statystyki",
            description: "Szczegółowe dane o Twoim słuchaniu"
        },
        {
            icon: Users,
            title: "Top Artyści",
            description: "Sprawdź kogo słuchasz najczęściej"
        },
        {
            icon: Headphones,
            title: "Top Utwory",
            description: "Twoje ulubione piosenki"
        }
    ];

    return (
        <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center safe-top safe-bottom">
            <AnimatedBackground />

            {/* Gradient orbs */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float" />
            <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />

            <div className="relative z-10 text-center px-4 py-8 max-w-lg mx-auto opacity-0 animate-fade-in">
                {/* Logo */}
                <div className="mb-10">
                    <div className="inline-flex items-center justify-center mb-6">
                        <div className="relative">
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/70 flex items-center justify-center shadow-2xl shadow-primary/30 animate-float">
                                <Music className="w-10 h-10 text-primary-foreground" />
                            </div>
                            {/* Glow ring */}
                            <div className="absolute inset-0 rounded-2xl bg-primary/30 blur-xl -z-10 scale-110" />
                        </div>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight mb-3">
                        Spoti<span className="text-gradient">Stats</span>
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-md mx-auto">
                        Odkryj swoje statystyki słuchania muzyki na Spotify
                    </p>
                </div>

                {/* Features - refined cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10">
                    {features.map((feature, index) => (
                        <div
                            key={feature.title}
                            className="group p-4 rounded-xl bg-card/50 border border-border/30 backdrop-blur-sm hover:bg-card/80 hover:border-primary/30 transition-all duration-300 hover:-translate-y-0.5 opacity-0 animate-slide-up"
                            style={{ animationDelay: `${200 + index * 100}ms` }}
                        >
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/20 transition-colors">
                                <feature.icon className="w-5 h-5 text-primary" />
                            </div>
                            <h3 className="font-semibold text-foreground text-sm">{feature.title}</h3>
                            <p className="text-xs text-muted-foreground mt-1">{feature.description}</p>
                        </div>
                    ))}
                </div>

                {/* Login Button - premium styling */}
                <button
                    onClick={handleLogin}
                    className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 rounded-full bg-primary text-primary-foreground font-semibold text-lg shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/40 hover:scale-[1.02] active:scale-100 transition-all duration-300 opacity-0 animate-slide-up"
                    style={{ animationDelay: '500ms' }}
                >
                    {/* Spotify icon */}
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                    </svg>
                    <span>Zaloguj się przez Spotify</span>

                    {/* Shine effect */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                </button>

                <p className="mt-5 text-sm text-muted-foreground opacity-0 animate-fade-in" style={{ animationDelay: '600ms' }}>
                    Wymagane konto Spotify • Bezpieczne logowanie OAuth
                </p>

                {/* Decorative sparkles */}
                <div className="absolute top-1/4 left-1/4 opacity-0 animate-fade-in" style={{ animationDelay: '800ms' }}>
                    <Sparkles className="w-4 h-4 text-primary/60 animate-bounce-subtle" />
                </div>
                <div className="absolute bottom-1/3 right-1/3 opacity-0 animate-fade-in" style={{ animationDelay: '1000ms' }}>
                    <Sparkles className="w-3 h-3 text-primary/40 animate-bounce-subtle" style={{ animationDelay: '0.5s' }} />
                </div>
            </div>
        </div>
    );
};

export default Login;
