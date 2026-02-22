/**
 * API Client for SpotiStats Backend
 * Uses Vite proxy - all requests go through same origin
 *
 * Features:
 * - Token expiration check before requests
 * - Auto-refresh on 401 errors
 * - Multi-tab logout synchronization
 */
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { toast } from 'sonner';

// Use env var for API URL (for production) or relative URLs for dev (Vite proxy)
const BASE_URL = import.meta.env.VITE_API_URL || '';

// Debug logging for deployment verification
if (import.meta.env.DEV) {
    console.log('[API] Development mode, using proxy');
} else {
    console.log('[API] Production mode, BASE_URL:', BASE_URL || '(empty - using relative)');
}

const TOKEN_KEY = 'spotify_jwt';

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

/**
 * Decode JWT to get expiration time (without library)
 */
function getTokenExpiry(token: string): number | null {
    try {
        const payload = token.split('.')[1];
        const decoded = JSON.parse(atob(payload));
        return decoded.exp ? decoded.exp * 1000 : null; // Convert to ms
    } catch {
        return null;
    }
}

/**
 * Check if token is expired or about to expire (5 min buffer)
 */
function isTokenExpired(token: string): boolean {
    const expiry = getTokenExpiry(token);
    if (!expiry) return true;
    // 5 minute buffer before actual expiration
    return Date.now() > expiry - 5 * 60 * 1000;
}

/**
 * Subscribe to token refresh
 */
function subscribeToRefresh(callback: (token: string) => void) {
    refreshSubscribers.push(callback);
}

/**
 * Notify all subscribers with new token
 */
function onRefreshed(token: string) {
    // FIX #14: Copy and clear subscribers BEFORE notifying
    // This prevents race condition where a callback could add new subscribers
    const subscribers = refreshSubscribers;
    refreshSubscribers = [];
    subscribers.forEach(callback => callback(token));
}

/**
 * Clear auth and redirect to login
 */
function handleAuthFailure() {
    localStorage.removeItem(TOKEN_KEY);
    // Dispatch storage event for multi-tab sync
    window.dispatchEvent(new StorageEvent('storage', {
        key: TOKEN_KEY,
        newValue: null,
        oldValue: 'removed'
    }));
    window.location.href = '/login?error=session_expired';
}

// Create axios instance with credentials
export const api = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    }
});

// Request interceptor - add Authorization header and check expiration
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem(TOKEN_KEY);

        if (token) {
            // Check if token is expired before making request
            if (isTokenExpired(token) && !config.url?.includes('/auth/refresh')) {
                // Token expired, will try to refresh in response interceptor
                console.log('Token expired, request will trigger refresh');
            }
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor - handle 401 with auto-refresh and 429 rate limiting
api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // Handle 429 Rate Limiting - show toast to user
        if (error.response?.status === 429) {
            const retryAfter = error.response.headers?.['retry-after'];
            const minutes = retryAfter ? Math.ceil(parseInt(retryAfter) / 60) : 1;

            toast.error(`Osiągnięto limit API. Spróbuj za ${minutes} min.`, {
                id: 'rate-limit', // Prevent duplicate toasts
                duration: 5000,
            });

            console.warn('[API] Rate limited (429):', {
                endpoint: error.config?.url,
                retryAfter,
            });
            // The error will propagate to React Query which will handle retry
            return Promise.reject(error);
        }

        // Handle ERR_NETWORK (possible 429 with CORS issue)
        if (error.code === 'ERR_NETWORK' && !error.response) {
            console.error('[API] Network error (possible CORS/429):', error.message);
            toast.error('Błąd połączenia. Sprawdź internet.', {
                id: 'network-error',
                duration: 3000,
            });
            return Promise.reject(error);
        }

        // If 401 and not already retrying
        if (error.response?.status === 401 && !originalRequest._retry) {
            // Don't retry auth endpoints
            if (originalRequest.url?.includes('/auth/')) {
                return Promise.reject(error);
            }

            if (isRefreshing) {
                // Wait for refresh to complete
                return new Promise((resolve) => {
                    subscribeToRefresh((newToken: string) => {
                        originalRequest.headers.Authorization = `Bearer ${newToken}`;
                        resolve(api(originalRequest));
                    });
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Try to refresh the token
                const response = await api.post('/auth/refresh');

                // If backend returns new token in response
                if (response.data?.token) {
                    localStorage.setItem(TOKEN_KEY, response.data.token);
                    onRefreshed(response.data.token);
                }

                isRefreshing = false;

                // Retry original request
                return api(originalRequest);
            } catch (refreshError) {
                isRefreshing = false;
                handleAuthFailure();
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

// ===============================
// Multi-tab logout synchronization
// ===============================
if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
        // If token was removed in another tab, logout this tab too
        if (event.key === TOKEN_KEY && event.newValue === null) {
            console.log('Token removed in another tab, logging out');
            window.location.href = '/login';
        }
    });
}

// ===============================
// Auth API
// ===============================
export const authAPI = {
    getLoginUrl: () => api.get('/auth/login'),
    getUser: () => api.get('/auth/me'),
    refresh: () => api.post('/auth/refresh'),
    logout: () => {
        localStorage.removeItem(TOKEN_KEY);
        return api.post('/auth/logout');
    }
};

// ===============================
// Stats API
// ===============================
export const statsAPI = {
    getTopArtists: (timeRange = 'medium_term', limit = 20) =>
        api.get(`/api/v1/stats/top-artists?time_range=${timeRange}&limit=${limit}`),

    getTopTracks: (timeRange = 'medium_term', limit = 20) =>
        api.get(`/api/v1/stats/top-tracks?time_range=${timeRange}&limit=${limit}`),

    getTopAlbums: (timeRange = 'medium_term', limit = 20) =>
        api.get(`/api/v1/stats/top-albums?time_range=${timeRange}&limit=${limit}`),

    getRecentlyPlayed: (limit = 50) =>
        api.get(`/api/v1/stats/recent?limit=${limit}`),

    getOverview: () => api.get('/api/v1/stats/overview'),

    clearCache: () => api.post('/api/v1/stats/clear-cache'),

    // Listening History (persistent collection)
    getListeningChart: (days = 7) =>
        api.get(`/api/v1/stats/listening-history/chart?days=${days}`),

    syncListeningHistory: () =>
        api.post('/api/v1/stats/listening-history/sync'),

    getListeningHistory: (options: { limit?: number; offset?: number; from?: string; to?: string } = {}) => {
        const params = new URLSearchParams();
        if (options.limit) params.set('limit', String(options.limit));
        if (options.offset) params.set('offset', String(options.offset));
        if (options.from) params.set('from', options.from);
        if (options.to) params.set('to', options.to);
        return api.get(`/api/v1/stats/listening-history?${params.toString()}`);
    },

    // Audio Features (real music analytics from Spotify)
    getAudioFeatures: (trackIds: string[]) =>
        api.get(`/api/v1/stats/audio-features?ids=${trackIds.join(',')}`),
};

export default api;
