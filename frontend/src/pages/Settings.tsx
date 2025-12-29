import { Settings as SettingsIcon, Bell, Shield, Palette, Globe, Volume2, Smartphone, LogOut, Trash2, type LucideIcon, Loader2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useSettings, type SettingsState } from "@/hooks/useSettings";
import { useUser } from "@/hooks/useSpotifyData";
import { authAPI, statsAPI } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";

interface SettingItem {
  id: keyof SettingsState;
  label: string;
  description: string;
}

interface SettingsSection {
  title: string;
  icon: LucideIcon;
  settings: SettingItem[];
}

const settingsSections: SettingsSection[] = [
  {
    title: "Powiadomienia",
    icon: Bell,
    settings: [
      { id: "weekly-summary", label: "Cotygodniowe podsumowanie", description: "Otrzymuj email z podsumowaniem tygodnia" },
      { id: "new-features", label: "Nowe funkcje", description: "Informacje o nowościach w aplikacji" },
      { id: "listening-milestones", label: "Kamienie milowe", description: "Powiadomienia o osiągnięciach" },
    ]
  },
  {
    title: "Prywatność",
    icon: Shield,
    settings: [
      { id: "public-profile", label: "Publiczny profil", description: "Pozwól innym zobaczyć Twoje statystyki" },
      { id: "share-data", label: "Udostępnianie danych", description: "Anonimowe dane do poprawy serwisu" },
      { id: "listening-history", label: "Historia słuchania", description: "Zapisuj historię odtwarzania" },
    ]
  },
  {
    title: "Wygląd",
    icon: Palette,
    settings: [
      { id: "dark-mode", label: "Tryb ciemny", description: "Używaj ciemnego motywu" },
      { id: "animations", label: "Animacje", description: "Włącz animacje interfejsu" },
      { id: "compact-mode", label: "Tryb kompaktowy", description: "Mniejsze odstępy między elementami" },
    ]
  },
  {
    title: "Odtwarzanie",
    icon: Volume2,
    settings: [
      { id: "autoplay", label: "Autoodtwarzanie", description: "Automatycznie odtwarzaj kolejne utwory" },
      { id: "crossfade", label: "Crossfade", description: "Płynne przejścia między utworami" },
      { id: "normalize-volume", label: "Normalizacja głośności", description: "Wyrównuj poziom głośności" },
    ]
  },
];

const Settings = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { settings, toggleSetting } = useSettings();
  const { data: user } = useUser();
  const [clearingCache, setClearingCache] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Handle clear cache
  const handleClearCache = async () => {
    setClearingCache(true);
    try {
      await statsAPI.clearCache();
      // Invalidate all queries to force fresh data
      await queryClient.invalidateQueries();
      alert('Cache wyczyszczony pomyślnie!');
    } catch (error) {
      console.error('Failed to clear cache:', error);
      alert('Błąd podczas czyszczenia cache');
    } finally {
      setClearingCache(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await authAPI.logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      // Still navigate to login even on error
      navigate('/login');
    }
  };

  return (
    <>
      {/* Hero Section */}
      <section className="mb-12 opacity-0 animate-fade-in">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground">
            <span className="text-primary">Ustawienia</span>
          </h1>
          <p className="text-lg text-muted-foreground">
            Dostosuj aplikację do swoich potrzeb
          </p>
        </div>
      </section>

      {/* Settings Sections */}
      <div className="space-y-6">
        {settingsSections.map((section, sectionIndex) => (
          <div
            key={section.title}
            className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-secondary/20 p-6 opacity-0 animate-fade-in"
            style={{ animationDelay: `${sectionIndex * 100 + 200}ms` }}
          >
            <div className="absolute -top-16 -right-16 w-32 h-32 bg-primary/5 rounded-full blur-2xl" />

            <div className="relative flex items-center gap-4 mb-6">
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border border-primary/30">
                  <section.icon className="w-6 h-6 text-primary" />
                </div>
                <div className="absolute inset-0 rounded-xl bg-primary/20 blur-lg -z-10" />
              </div>
              <h2 className="text-xl font-bold text-foreground">{section.title}</h2>
            </div>

            <div className="relative space-y-4">
              {section.settings.map((setting) => (
                <div
                  key={setting.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 border border-border/50 hover:border-primary/20 transition-colors"
                >
                  <div className="flex-1 pr-4">
                    <p className="font-medium text-foreground">{setting.label}</p>
                    <p className="text-sm text-muted-foreground">{setting.description}</p>
                  </div>
                  <Switch
                    checked={settings[setting.id]}
                    onCheckedChange={() => toggleSetting(setting.id)}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Connected Accounts */}
        <div
          className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-secondary/20 p-6 opacity-0 animate-fade-in"
          style={{ animationDelay: '600ms' }}
        >
          <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-primary/5 rounded-full blur-2xl" />

          <div className="relative flex items-center gap-4 mb-6">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border border-primary/30">
                <Globe className="w-6 h-6 text-primary" />
              </div>
              <div className="absolute inset-0 rounded-xl bg-primary/20 blur-lg -z-10" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Połączone konta</h2>
          </div>

          <div className="relative space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 border border-border/50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-lg">S</span>
                </div>
                <div>
                  <p className="font-medium text-foreground">Spotify</p>
                  <p className="text-sm text-muted-foreground">Połączono jako {user?.displayName || 'użytkownik'}</p>
                </div>
              </div>
              <span className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
                Połączono
              </span>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 border border-border/50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Apple Music</p>
                  <p className="text-sm text-muted-foreground">Nie połączono</p>
                </div>
              </div>
              <button className="px-4 py-1.5 rounded-full border border-border hover:border-primary/50 hover:bg-primary/10 text-sm font-medium text-muted-foreground hover:text-primary transition-all">
                Połącz
              </button>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div
          className="relative overflow-hidden rounded-2xl border border-destructive/30 bg-gradient-to-br from-destructive/5 via-card to-secondary/20 p-6 opacity-0 animate-fade-in"
          style={{ animationDelay: '700ms' }}
        >
          <div className="relative flex items-center gap-4 mb-6">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-destructive/30 to-destructive/10 flex items-center justify-center border border-destructive/30">
                <SettingsIcon className="w-6 h-6 text-destructive" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-foreground">Strefa niebezpieczna</h2>
          </div>

          <div className="relative space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 border border-border/50">
              <div>
                <p className="font-medium text-foreground">Wyczyść cache</p>
                <p className="text-sm text-muted-foreground">Odśwież wszystkie dane z Spotify</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearCache}
                disabled={clearingCache}
                className="border-destructive/50 hover:bg-destructive/10 text-destructive"
              >
                {clearingCache ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Wyczyść
              </Button>
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 border border-border/50">
              <div>
                <p className="font-medium text-foreground">Wyloguj się</p>
                <p className="text-sm text-muted-foreground">Wyloguj z konta SpotiStats</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                disabled={loggingOut}
                className="border-destructive/50 hover:bg-destructive/10 text-destructive"
              >
                {loggingOut ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <LogOut className="w-4 h-4 mr-2" />
                )}
                Wyloguj
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Settings;
