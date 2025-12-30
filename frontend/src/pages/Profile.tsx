import { User, LogOut, Loader2, Mail, CreditCard, Shield, Fingerprint } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

import { useUser } from "@/hooks/useSpotifyData";
import { authAPI } from "@/lib/api";
import { useEffect } from "react";
import { AxiosError } from "axios";

const Profile = () => {
  const navigate = useNavigate();

  const { data: user, isLoading: userLoading, error: userError } = useUser();

  // Redirect on 401
  useEffect(() => {
    if (userError && (userError as AxiosError)?.response?.status === 401) {
      navigate('/login');
    }
  }, [userError, navigate]);

  // Handle logout
  const handleLogout = async () => {
    try {
      await authAPI.logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      navigate('/login');
    }
  };

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto opacity-0 animate-fade-in">
      {/* Header Profile Card */}
      <section className="mb-8">
        <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-secondary/20 p-8 shadow-xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3" />

          <div className="relative flex flex-col md:flex-row items-center gap-8 z-10">
            {/* Avatar */}
            <div className="relative group">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-primary to-secondary opacity-50 blur group-hover:opacity-75 transition duration-500"></div>
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.displayName}
                  className="relative w-32 h-32 rounded-full border-4 border-background shadow-2xl object-cover"
                />
              ) : (
                <div className="relative w-32 h-32 rounded-full bg-background flex items-center justify-center border-4 border-background shadow-2xl">
                  <User className="w-16 h-16 text-primary" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {user?.displayName || 'Użytkownik'}
              </h1>
              <p className="text-lg text-muted-foreground mb-4 font-light">
                {user?.email || 'brak adresu email'}
              </p>

              <div className="flex flex-wrap justify-center md:justify-start gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase ${user?.product === 'premium'
                  ? 'bg-primary/20 text-primary border border-primary/20'
                  : 'bg-secondary text-muted-foreground'
                  }`}>
                  {user?.product === 'premium' ? 'Premium Plan' : 'Free Plan'}
                </span>
                <span className="px-3 py-1 rounded-full bg-background/50 border border-border text-xs text-muted-foreground flex items-center gap-2">
                  <Fingerprint className="w-3 h-3" />
                  ID: {user?.spotifyId || 'N/A'}
                </span>
              </div>
            </div>

            {/* Logout Action */}
            <div>
              <Button
                variant="destructive"
                className="rounded-xl shadow-lg shadow-destructive/20 hover:shadow-destructive/40 transition-all font-medium px-6"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Wyloguj się
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-2xl mx-auto">
        {/* Account Details */}
        <section>
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Szczegóły konta
          </h2>
          <div className="space-y-4">
            <div className="p-5 rounded-xl bg-card border border-border/50 shadow-sm hover:border-primary/20 transition-all group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-secondary/50 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Adres Email</p>
                  <p className="font-medium text-foreground">{user?.email || '-'}</p>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-xl bg-card border border-border/50 shadow-sm hover:border-primary/20 transition-all group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-secondary/50 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Subskrypcja</p>
                  <p className="font-medium text-foreground capitalize">{user?.product || '-'}</p>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-xl bg-card border border-border/50 shadow-sm hover:border-primary/20 transition-all group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-secondary/50 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Kraj</p>
                  <p className="font-medium text-foreground">{user?.country || '-'}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Profile;
