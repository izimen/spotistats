import { Navigate, Outlet } from "react-router-dom";
import Header from "@/components/Header";
import AnimatedBackground from "@/components/AnimatedBackground";
import { hasAuthToken } from "@/lib/api";
import { isPreviewMode } from "@/lib/mockData";

/**
 * MainLayout - Unified layout wrapper for authenticated pages
 * Provides common elements: Header, AnimatedBackground, consistent padding
 */
const MainLayout = () => {
    // Anonymous visitors go straight to the login page instead of firing
    // protected API calls (and a doomed token refresh) first.
    if (!isPreviewMode() && !hasAuthToken()) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="min-h-screen bg-background relative overflow-hidden">
            {/* A11Y-001: Skip to main content link */}
            <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-4 focus:left-4 focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-md">
                Przejdz do tresci
            </a>
            <AnimatedBackground />
            <Header />
            <main id="main-content" className="relative pt-24 pb-12 px-4">
                <div className="container mx-auto max-w-7xl">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default MainLayout;
