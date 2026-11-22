import { Navigate, Outlet } from "react-router-dom";
import AppNav from "@/components/AppNav";
import { hasAuthToken } from "@/lib/api";
import { isPreviewMode } from "@/lib/mockData";
import { useAccent } from "@/hooks/useAccent";

/**
 * App shell: left rail (desktop) / bottom tabs (mobile), page content offset accordingly.
 * The accent colour follows the user's #1 artist (useAccent).
 */
const Shell = () => {
    useAccent();
    return (
        <div className="min-h-screen bg-background">
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:z-50 focus:top-3 focus:left-3 focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2"
            >
                Przejdź do treści
            </a>
            <AppNav />
            <main
                id="main-content"
                className="md:pl-[var(--rail-width)] pb-[calc(var(--tabbar-height)+env(safe-area-inset-bottom)+24px)] md:pb-16"
            >
                <div className="mx-auto w-full max-w-[1180px] px-5 sm:px-8 lg:px-12 pt-8 md:pt-12">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

const MainLayout = () => {
    // Anonymous visitors go straight to the login page instead of firing
    // protected API calls (and a doomed token refresh) first.
    if (!isPreviewMode() && !hasAuthToken()) {
        return <Navigate to="/login" replace />;
    }
    return <Shell />;
};

export default MainLayout;
