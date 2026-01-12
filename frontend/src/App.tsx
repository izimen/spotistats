import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Loader2 } from "lucide-react";

// Lazy load pages for code splitting
const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const Callback = lazy(() => import("./pages/Callback"));
const TopArtists = lazy(() => import("./pages/TopArtists"));
const TopTracks = lazy(() => import("./pages/TopTracks"));
const History = lazy(() => import("./pages/History"));
const Profile = lazy(() => import("./pages/Profile"));

const NotFound = lazy(() => import("./pages/NotFound"));

// Layout
const MainLayout = lazy(() => import("./layouts/MainLayout"));

// QueryClient with production-grade retry logic for 429 rate limiting
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retry logic - special handling for rate limiting
      retry: (failureCount, error: unknown) => {
        const axiosError = error as { response?: { status?: number; headers?: Record<string, string> } };
        const status = axiosError?.response?.status;

        // Always retry 429 (rate limited) up to 3 times
        if (status === 429) {
          // Check if Retry-After is too long (> 5 min = don't bother retrying)
          const retryAfter = axiosError?.response?.headers?.['retry-after'];
          if (retryAfter && parseInt(retryAfter) > 300) {
            console.warn('[QueryClient] Rate limit too long, not retrying');
            return false;
          }
          return failureCount < 3;
        }

        // Retry 5xx server errors once
        if (status && status >= 500) {
          return failureCount < 2;
        }

        // Don't retry other 4xx errors
        if (status && status >= 400 && status < 500) {
          return false;
        }

        // Network errors - retry once
        return failureCount < 1;
      },

      // Exponential backoff with jitter (prevents synchronized retry storms)
      retryDelay: (attemptIndex, error: unknown) => {
        const axiosError = error as { response?: { headers?: Record<string, string> } };
        const retryAfter = axiosError?.response?.headers?.['retry-after'];

        // If server specifies Retry-After, use it with ±20% jitter
        if (retryAfter) {
          const delay = parseInt(retryAfter) * 1000;
          const jitter = delay * (0.8 + Math.random() * 0.4); // ±20%
          console.log(`[QueryClient] Using Retry-After: ${delay}ms + jitter = ${Math.round(jitter)}ms`);
          return jitter;
        }

        // Otherwise use exponential backoff with ±50% jitter
        const baseDelay = Math.min(1000 * 2 ** attemptIndex, 30000);
        const jitter = baseDelay * (0.5 + Math.random()); // 50-150% of base
        return jitter;
      },

      // Default stale time and garbage collection
      staleTime: 1000 * 60 * 15, // 15 minutes (Spotify data changes daily)
      gcTime: 1000 * 60 * 60, // 1 hour (keep in cache)
    },
  },
});

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Auth routes (no layout) */}
            <Route path="/login" element={<Login />} />
            <Route path="/callback" element={<Callback />} />

            {/* Main routes with layout */}
            <Route element={<MainLayout />}>
              <Route path="/" element={<Index />} />
              <Route path="/top-artists" element={<TopArtists />} />
              <Route path="/top-tracks" element={<TopTracks />} />
              <Route path="/history" element={<History />} />
              <Route path="/profile" element={<Profile />} />

            </Route>

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
