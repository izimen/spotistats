import { Music, User, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";

const navItems = [
  { label: "Panel", href: "/" },
  { label: "Top Artyści", href: "/top-artists" },
  { label: "Top Utwory", href: "/top-tracks" },
  { label: "Historia", href: "/history" },
];

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  // Track scroll for header background
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <header className={`
      fixed top-0 left-0 right-0 z-50
      transition-all duration-300
      ${scrolled ? 'bg-background/80 backdrop-blur-xl shadow-lg shadow-black/5' : 'bg-transparent'}
    `}>
      {/* Gradient border bottom */}
      <div className={`
        absolute bottom-0 left-0 right-0 h-px
        bg-gradient-to-r from-transparent via-border to-transparent
        transition-opacity duration-300
        ${scrolled ? 'opacity-100' : 'opacity-0'}
      `} />

      {/* Main header content */}
      <div className="container mx-auto px-4 safe-top">
        <div className="h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group cursor-pointer">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/40 group-hover:scale-105 transition-all duration-300">
                <Music className="w-4.5 h-4.5 text-primary-foreground" />
              </div>
              {/* Glow effect on hover */}
              <div className="absolute inset-0 rounded-xl bg-primary/30 blur-lg -z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="text-lg font-bold text-foreground tracking-tight">
              Spoti<span className="text-primary">Stats</span>
            </span>
          </Link>

          {/* Desktop Navigation - pill style */}
          <nav className="hidden md:flex items-center">
            <div className="flex items-center bg-muted/40 rounded-full p-1 border border-border/30 backdrop-blur-sm">
              {navItems.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.label}
                    to={item.href}
                    className={`
                      relative px-4 py-2 rounded-full text-sm font-medium
                      transition-all duration-300
                      ${isActive
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                      }
                    `}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            <Link to="/profile">
              <Button
                variant="ghost"
                size="icon"
                className={`
                  rounded-full w-9 h-9
                  hover:bg-primary/10 hover:text-primary
                  ${location.pathname === '/profile'
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground'
                  }
                `}
              >
                <User className="w-4.5 h-4.5" />
              </Button>
            </Link>

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden rounded-full w-9 h-9 text-muted-foreground hover:text-foreground"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation - slide down */}
      <div className={`
        md:hidden overflow-hidden transition-all duration-300 ease-out
        ${mobileMenuOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'}
      `}>
        <div className="bg-card/95 backdrop-blur-xl border-t border-border/30">
          <nav className="container mx-auto px-4 py-3 space-y-1">
            {navItems.map((item, index) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.label}
                  to={item.href}
                  className={`
                    flex items-center px-4 py-3 rounded-xl text-sm font-medium
                    transition-all duration-200
                    ${isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }
                  `}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
