import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Home, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import AnimatedBackground from "@/components/AnimatedBackground";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: Użytkownik próbował wejść na nieistniejącą stronę:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center">
      <AnimatedBackground />

      <div className="relative z-10 text-center px-4">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/30 mb-6">
            <Music className="w-10 h-10 text-primary" />
          </div>

          <h1 className="text-8xl font-bold text-primary mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-foreground mb-2">Ups! Strona nie znaleziona</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Strona, której szukasz nie istnieje lub została przeniesiona.
          </p>
        </div>

        <Link to="/">
          <Button variant="glow" size="lg">
            <Home className="w-5 h-5 mr-2" />
            Wróć do strony głównej
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
