import { NavLink } from "react-router-dom";
import { Disc3, ListOrdered, History, CalendarRange, UserRound, type LucideIcon } from "lucide-react";

const tabs: { to: string; label: string; icon: LucideIcon; end?: boolean }[] = [
    { to: "/", label: "Teraz", icon: Disc3, end: true },
    { to: "/top", label: "Topki", icon: ListOrdered },
    { to: "/history", label: "Historia", icon: History },
    { to: "/summary", label: "Podsumowanie", icon: CalendarRange },
    { to: "/konto", label: "Konto", icon: UserRound },
];

/**
 * Desktop: fixed left rail. Mobile: bottom tab bar (safe-area aware).
 * Active tab = accent bar + paper label; others muted.
 */
const AppNav = () => (
    <>
        {/* Desktop rail */}
        <nav
            aria-label="Główna nawigacja"
            className="hidden md:flex fixed inset-y-0 left-0 z-40 w-[var(--rail-width)] flex-col items-stretch border-r border-border bg-background"
        >
            <NavLink
                to="/"
                aria-label="SpotiStats — strona główna"
                className="flex h-20 items-center justify-center type-poster text-[28px] text-primary"
            >
                SS
            </NavLink>
            <ul className="flex flex-1 flex-col gap-1 pt-2">
                {tabs.map(({ to, label, icon: Icon, end }) => (
                    <li key={to}>
                        <NavLink
                            to={to}
                            end={end}
                            className={({ isActive }) =>
                                `relative flex flex-col items-center gap-1 px-1 py-3 text-[12px] wdth-75 font-semibold transition-colors ${isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <span
                                        aria-hidden="true"
                                        className={`absolute left-0 top-2 bottom-2 w-[3px] ${isActive ? "bg-primary" : "bg-transparent"}`}
                                    />
                                    <Icon className="h-5 w-5" strokeWidth={isActive ? 2.25 : 1.75} aria-hidden="true" />
                                    <span className="text-center leading-tight">{label}</span>
                                </>
                            )}
                        </NavLink>
                    </li>
                ))}
            </ul>
        </nav>

        {/* Mobile tab bar */}
        <nav
            aria-label="Główna nawigacja"
            className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background pb-safe"
        >
            <ul className="grid h-[var(--tabbar-height)] grid-cols-5">
                {tabs.map(({ to, label, icon: Icon, end }) => (
                    <li key={to} className="flex">
                        <NavLink
                            to={to}
                            end={end}
                            className={({ isActive }) =>
                                `relative flex flex-1 flex-col items-center justify-center gap-1 text-[11px] wdth-75 font-semibold ${isActive ? "text-foreground" : "text-muted-foreground"
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <span
                                        aria-hidden="true"
                                        className={`absolute top-0 left-3 right-3 h-[3px] ${isActive ? "bg-primary" : "bg-transparent"}`}
                                    />
                                    <Icon className="h-5 w-5" strokeWidth={isActive ? 2.25 : 1.75} aria-hidden="true" />
                                    <span className="max-w-full truncate px-0.5">{label}</span>
                                </>
                            )}
                        </NavLink>
                    </li>
                ))}
            </ul>
        </nav>
    </>
);

export default AppNav;
