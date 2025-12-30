import { Music, BarChart3, User, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

const navItems = [
  { label: "Dashboard", href: "/" },
  { label: "Top Artyści", href: "/top-artists" },
  { label: "Top Utwory", href: "/top-tracks" },
  { label: "Historia", href: "/history" },
];

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      {/* Gradient border bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      {/* Main header content */}
      <div className="bg-background/90 backdrop-blur-2xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/25 group-hover:shadow-primary/40 transition-shadow">
              <Music className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">
              Spoti<span className="text-primary">Stats</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center">
            <div className="flex items-center bg-secondary/50 rounded-full p-1.5 border border-border/50">
              {navItems.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.label}
                    to={item.href}
                    className={`relative px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${isActive
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                      }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            <Link to="/statistics">
              <Button
                variant="ghost"
                size="icon"
                className={`hidden md:flex hover:bg-primary/10 hover:text-primary ${location.pathname === '/statistics' ? 'bg-primary/10 text-primary' : ''
                  }`}
              >
                <BarChart3 className="w-5 h-5" />
              </Button>
            </Link>
            <Link to="/profile">
              <Button
                variant="outline"
                size="icon"
                className={`rounded-full border-border/50 hover:border-primary/50 hover:bg-primary/10 ${location.pathname === '/profile' ? 'border-primary/50 bg-primary/10 text-primary' : ''
                  }`}
              >
                <User className="w-5 h-5" />
              </Button>
            </Link>

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl">
            <nav className="container mx-auto px-4 py-4 space-y-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.label}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive
                      ? "bg-primary/10 text-primary border-l-2 border-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                      }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
