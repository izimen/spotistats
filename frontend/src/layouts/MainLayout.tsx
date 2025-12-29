import { Outlet } from "react-router-dom";
import Header from "@/components/Header";
import AnimatedBackground from "@/components/AnimatedBackground";

/**
 * MainLayout - Unified layout wrapper for authenticated pages
 * Provides common elements: Header, AnimatedBackground, consistent padding
 */
const MainLayout = () => {
    return (
        <div className="min-h-screen bg-background relative overflow-hidden">
            <AnimatedBackground />
            <Header />
            <main className="relative pt-24 pb-12 px-4">
                <div className="container mx-auto max-w-7xl">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default MainLayout;
