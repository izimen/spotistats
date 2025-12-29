import { User, Music, Clock, Calendar, Settings, LogOut, Edit2, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import StatsCard from "@/components/StatsCard";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useSettings } from "@/hooks/useSettings";
import { useUser, useTopArtists } from "@/hooks/useSpotifyData";
import { authAPI } from "@/lib/api";
import { AxiosError } from "axios";

interface SpotifyArtist {
  name: string;
  genres?: string[];
}

const recentAchievements = [
  { id: 1, title: "Odkrywca", description: "Słuchasz wielu różnych artystów", icon: "🔍", date: "Aktywne" },
  { id: 2, title: "Meloman", description: "Kochasz muzykę!", icon: "🎵", date: "Aktywne" },
  { id: 3, title: "Premium User", description: "Pełen dostęp do Spotify", icon: "⭐", date: "Aktywne" },
];

type TabId = 'overview' | 'achievements' | 'settings';

const Profile = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const { settings, toggleSetting } = useSettings();

  // API hooks
  const { data: user, isLoading: userLoading, error: userError } = useUser();
  const { data: topArtists } = useTopArtists('long_term', 50);

  // Redirect on 401
  useEffect(() => {
    if (userError && (userError as AxiosError)?.response?.status === 401) {
      navigate('/login');
    }
  }, [userError, navigate]);

  // Calculate genre distribution from top artists
  const genreDistribution = (() => {
    if (!topArtists) return [];
    const genreCount: Record<string, number> = {};
    topArtists.forEach((artist: SpotifyArtist) => {
      (artist.genres || []).forEach((genre: string) => {
        genreCount[genre] = (genreCount[genre] || 0) + 1;
      });
    });
    const sorted = Object.entries(genreCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const total = sorted.reduce((sum, [, count]) => sum + count, 0);
    return sorted.map(([name, count]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      percentage: Math.round((count / total) * 100)
    }));
  })();

  // Handle logout
  const handleLogout = async () => {
    try {
      await authAPI.logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      // Still navigate to login even on error
      navigate('/login');
    }
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'Przegląd' },
    { id: 'achievements', label: 'Osiągnięcia' },
    { id: 'settings', label: 'Ustawienia' },
  ];

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      {/* Profile Header */}
      <section className="mb-12 opacity-0 animate-fade-in">
        <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-secondary/20 p-8">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-primary/5 rounded-full blur-3xl" />

          <div className="relative flex flex-col md:flex-row items-center gap-8">
            {/* Avatar */}
            <div className="relative">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.displayName}
                  className="w-32 h-32 rounded-full border-4 border-primary/30 shadow-lg shadow-primary/20 object-cover"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border-4 border-primary/30 shadow-lg shadow-primary/20">
                  <User className="w-16 h-16 text-primary" />
                </div>
              )}
              <button className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/40 hover:scale-110 transition-transform">
                <Edit2 className="w-5 h-5 text-primary-foreground" />
              </button>
            </div>

            {/* User Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                {user?.displayName || 'Użytkownik'}
              </h1>
              <p className="text-lg text-muted-foreground mb-4">
                {user?.email || 'email@example.com'}
              </p>
              <div className="flex flex-wrap justify-center md:justify-start gap-4">
                <div className="px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-primary text-sm font-medium">
                  {user?.product === 'premium' ? 'Premium' : 'Darmowe'}
                </div>
                <div className="px-4 py-2 rounded-full bg-secondary/50 border border-border/50 text-muted-foreground text-sm">
                  Spotify ID: {user?.spotifyId?.substring(0, 8) || 'N/A'}...
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Link to="/settings">
                <Button variant="outline" size="icon" className="rounded-full">
                  <Settings className="w-5 h-5" />
                </Button>
              </Link>
              <Button
                variant="outline"
                size="icon"
                className="rounded-full text-destructive hover:text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
        <StatsCard
          title="Top Artyści"
          value={(topArtists?.length || 0).toString()}
          subtitle="Wszystkie czasy"
          icon={Music}
          delay={100}
          variant="primary"
        />
        <StatsCard
          title="Gatunków"
          value={genreDistribution.length.toString()}
          subtitle="Top 5"
          icon={Clock}
          delay={200}
        />
        <StatsCard
          title="Top Gatunek"
          value={genreDistribution[0]?.name || "Pop"}
          subtitle={`${genreDistribution[0]?.percentage || 0}%`}
          icon={User}
          delay={300}
        />
        <StatsCard
          title="Konto"
          value={user?.product === 'premium' ? 'Premium' : 'Free'}
          subtitle="Spotify"
          icon={Calendar}
          delay={400}
        />
      </section>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 p-1.5 bg-secondary/50 rounded-full border border-border/50 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${activeTab === tab.id
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Genres */}
          <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-secondary/20 p-6">
            <div className="absolute -top-16 -left-16 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />

            <div className="relative flex items-center gap-4 mb-6">
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border border-primary/30">
                  <Music className="w-6 h-6 text-primary" />
                </div>
                <div className="absolute inset-0 rounded-xl bg-primary/20 blur-lg -z-10" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Ulubione gatunki</h2>
                <p className="text-sm text-muted-foreground">Na podstawie Top artystów</p>
              </div>
            </div>

            <div className="relative space-y-4">
              {genreDistribution.length > 0 ? (
                genreDistribution.map((genre, index) => (
                  <div key={genre.name} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-foreground">{genre.name}</span>
                      <span className="text-muted-foreground">{genre.percentage}%</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-1000"
                        style={{
                          width: `${genre.percentage}%`,
                          animationDelay: `${index * 100}ms`
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">Brak danych o gatunkach</p>
              )}
            </div>
          </div>

          {/* Listening Patterns */}
          <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-secondary/20 p-6">
            <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />

            <div className="relative flex items-center gap-4 mb-6">
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border border-primary/30">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
                <div className="absolute inset-0 rounded-xl bg-primary/20 blur-lg -z-10" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Informacje o koncie</h2>
                <p className="text-sm text-muted-foreground">Twoje dane Spotify</p>
              </div>
            </div>

            <div className="relative space-y-4">
              <div className="p-4 rounded-xl bg-secondary/30 border border-border/50">
                <p className="text-sm text-muted-foreground mb-1">Nazwa użytkownika</p>
                <p className="text-xl font-bold text-foreground">{user?.displayName || 'N/A'}</p>
              </div>
              <div className="p-4 rounded-xl bg-secondary/30 border border-border/50">
                <p className="text-sm text-muted-foreground mb-1">Email</p>
                <p className="text-xl font-bold text-foreground">{user?.email || 'N/A'}</p>
              </div>
              <div className="p-4 rounded-xl bg-secondary/30 border border-border/50">
                <p className="text-sm text-muted-foreground mb-1">Typ konta</p>
                <p className="text-xl font-bold text-foreground">{user?.product === 'premium' ? 'Premium' : 'Darmowe'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'achievements' && (
        <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-secondary/20 p-6">
          <div className="absolute -top-16 -left-16 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />

          <div className="relative flex items-center gap-4 mb-6">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border border-primary/30">
                <span className="text-2xl">🏆</span>
              </div>
              <div className="absolute inset-0 rounded-xl bg-primary/20 blur-lg -z-10" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Twoje osiągnięcia</h2>
              <p className="text-sm text-muted-foreground">{recentAchievements.length} aktywnych odznak</p>
            </div>
          </div>

          <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentAchievements.map((achievement) => (
              <div
                key={achievement.id}
                className="p-4 rounded-xl bg-secondary/30 border border-border/50 hover:border-primary/30 transition-all duration-300 group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                    {achievement.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {achievement.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">{achievement.description}</p>
                    <p className="text-xs text-muted-foreground mt-2">{achievement.date}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-secondary/20 p-6">
          <div className="absolute -top-16 -right-16 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />

          <div className="relative flex items-center gap-4 mb-6">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border border-primary/30">
                <Settings className="w-6 h-6 text-primary" />
              </div>
              <div className="absolute inset-0 rounded-xl bg-primary/20 blur-lg -z-10" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Ustawienia konta</h2>
              <p className="text-sm text-muted-foreground">Zarządzaj swoim kontem</p>
            </div>
          </div>

          <div className="relative space-y-4">
            <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Powiadomienia email</p>
                <p className="text-sm text-muted-foreground">Cotygodniowe podsumowania</p>
              </div>
              <Switch
                checked={settings['weekly-summary']}
                onCheckedChange={() => toggleSetting('weekly-summary')}
              />
            </div>
            <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Prywatny profil</p>
                <p className="text-sm text-muted-foreground">Ukryj statystyki przed innymi</p>
              </div>
              <Switch
                checked={!settings['public-profile']}
                onCheckedChange={() => toggleSetting('public-profile')}
              />
            </div>
            <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Udostępnianie danych</p>
                <p className="text-sm text-muted-foreground">Pozwól na analizę anonimowych danych</p>
              </div>
              <Switch
                checked={settings['share-data']}
                onCheckedChange={() => toggleSetting('share-data')}
              />
            </div>

            {/* Logout button */}
            <div className="pt-4 border-t border-border/50">
              <Button
                variant="destructive"
                className="w-full"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Wyloguj się
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Profile;
