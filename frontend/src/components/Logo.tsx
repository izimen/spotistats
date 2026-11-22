/**
 * SpotiStats mark: a poster sleeve with three rising bars, a record sliding out of it.
 * In the app the sleeve and label take the live accent; docs/brand/logo.svg is the fixed-colour master.
 */
const Logo = ({ className = "h-10 w-10", title }: { className?: string; title?: string }) => (
    <svg viewBox="6 10 58 44" className={className} role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
        {title && <title>{title}</title>}
        <circle cx="45" cy="32" r="17" fill="#3A3046" stroke="#7A6A8E" strokeWidth="1.5" />
        <circle cx="45" cy="32" r="12.5" fill="none" stroke="#54476A" strokeWidth="1" />
        <circle cx="45" cy="32" r="6" fill="hsl(var(--primary))" />
        <circle cx="45" cy="32" r="1.4" fill="#16111D" />
        <rect x="6" y="16" width="32" height="32" rx="2" fill="hsl(var(--primary))" />
        <rect x="11" y="34" width="5" height="8" fill="#16111D" />
        <rect x="18.5" y="29" width="5" height="13" fill="#16111D" />
        <rect x="26" y="24" width="5" height="18" fill="#16111D" />
    </svg>
);

export default Logo;
