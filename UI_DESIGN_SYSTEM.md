# 🎨 SpotiStats UI Design System

Kompletna dokumentacja systemu designu UI w stylu Stripe/Linear.
Użyj tego pliku jako referencji do przeniesienia stylu do innego projektu.

---

## 📦 Wymagane zależności

```bash
npm install lucide-react
npm install tailwindcss @tailwindcss/forms
npm install class-variance-authority clsx tailwind-merge
```

---

## 🎨 Design Tokens (CSS Variables)

```css
/* Skopiuj do index.css lub globals.css */

@layer base {
  :root {
    /* Tło i tekst */
    --background: 225 8% 5%;        /* Ciemne tło */
    --foreground: 0 0% 98%;         /* Jasny tekst */

    /* Karty */
    --card: 225 8% 8%;              /* Tło karty */
    --card-elevated: 225 8% 10%;    /* Podwyższona karta */
    --card-foreground: 0 0% 98%;

    /* Popover */
    --popover: 225 8% 10%;
    --popover-foreground: 0 0% 98%;

    /* Primary (zielony Spotify) */
    --primary: 141 76% 48%;         /* Główny kolor akcji */
    --primary-hover: 141 76% 55%;
    --primary-foreground: 0 0% 100%;
    --primary-glow: 141 76% 60%;
    --primary-muted: 141 50% 25%;

    /* Secondary */
    --secondary: 225 8% 12%;
    --secondary-foreground: 0 0% 98%;

    /* Muted */
    --muted: 225 8% 16%;
    --muted-foreground: 0 0% 55%;

    /* Accent */
    --accent: 141 40% 15%;
    --accent-foreground: 0 0% 98%;

    /* Destructive */
    --destructive: 0 72% 51%;
    --destructive-foreground: 0 0% 98%;

    /* Border */
    --border: 225 8% 18%;
    --border-subtle: 225 8% 14%;
    --input: 225 8% 14%;
    --ring: 141 76% 48%;
    --radius: 0.875rem;

    /* Sidebar */
    --sidebar-background: 225 8% 6%;
    --sidebar-foreground: 0 0% 98%;
    --sidebar-primary: 141 76% 48%;
    --sidebar-primary-foreground: 0 0% 100%;
    --sidebar-accent: 225 8% 12%;
    --sidebar-accent-foreground: 0 0% 98%;
    --sidebar-border: 225 8% 16%;
    --sidebar-ring: 141 76% 48%;
  }
}
```

---

## 🔤 Typografia

```css
/* Fonts loaded async in index.html */
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" media="print" onload="this.media='all'">

/* CSS */
body {
  font-family: 'Inter', system-ui, sans-serif;
  font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11';
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Tabular nums dla liczb */
.tabular-nums, time, .duration, .count {
  font-variant-numeric: tabular-nums;
}
```

---

## 🎯 Utility Classes

```css
@layer utilities {
  /* Gradient text */
  .text-gradient {
    @apply bg-clip-text text-transparent
           bg-gradient-to-r from-primary to-[hsl(141_76%_60%)];
  }

  /* Icon containers */
  .icon-container {
    @apply w-12 h-12 rounded-xl flex items-center justify-center
           bg-gradient-to-br from-primary/25 to-primary/10
           border border-primary/30 shadow-lg shadow-primary/20;
  }

  .icon-container-sm {
    @apply w-10 h-10 rounded-lg flex items-center justify-center
           bg-gradient-to-br from-primary/20 to-primary/5
           border border-primary/25;
  }

  /* Shimmer loading */
  .shimmer {
    background: linear-gradient(90deg,
      hsl(var(--card)) 0%,
      hsl(var(--muted)) 50%,
      hsl(var(--card)) 100%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s ease-in-out infinite;
  }

  /* Divider */
  .divider {
    @apply h-px w-full bg-gradient-to-r
           from-transparent via-border to-transparent;
  }

  /* Badge */
  .badge-primary {
    @apply inline-flex items-center px-2.5 py-0.5 rounded-full
           text-xs font-medium bg-primary/10 text-primary
           border border-primary/20;
  }

  /* Touch target (accessibility) */
  .touch-target {
    min-height: 44px;
    min-width: 44px;
  }

  /* Hide scrollbar */
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
}
```

---

## 🎬 Animacje

```css
/* Keyframes */
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@keyframes slide-up {
  0% {
    transform: translateY(12px);
    opacity: 0;
  }
  100% {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes fade-in {
  0% { opacity: 0; }
  100% { opacity: 1; }
}

@keyframes marquee-bounce {
  0%, 10% { transform: translateX(0); }
  45%, 55% { transform: translateX(var(--marquee-distance, -50%)); }
  90%, 100% { transform: translateX(0); }
}

/* Animation classes */
.animate-slide-up {
  animation: slide-up 0.4s cubic-bezier(0.19, 1, 0.22, 1) forwards;
}

.animate-fade-in {
  animation: fade-in 0.5s ease forwards;
}

.animate-marquee {
  animation: marquee-bounce 6s ease infinite;
}
```

---

## 📊 Scrollbar Styling

```css
html {
  scroll-behavior: smooth;
  scrollbar-width: thin;
  scrollbar-color: hsl(225 8% 20%) transparent;
}

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: hsl(225 8% 18%);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: hsl(225 8% 28%);
}
```

---

## 🃏 Komponenty

### StatsCard (Kafelek statystyk)

```tsx
interface StatsCardProps {
  title: string;
  value: string;
  subtitle?: React.ReactNode;
  icon: LucideIcon;
  delay?: number;
  variant?: "default" | "primary" | "accent";
  tooltip?: string;
}

// Warianty kolorystyczne
const variants = {
  default: {
    bg: "from-card via-card to-card",
    iconBg: "from-primary/15 to-primary/5",
    iconBorder: "border-primary/20",
    accent: "bg-muted-foreground/50",
    border: "border-border/40",
  },
  primary: {
    bg: "from-primary/[0.08] via-card to-card",
    iconBg: "from-primary/25 to-primary/10",
    iconBorder: "border-primary/30",
    accent: "bg-primary",
    border: "border-primary/30",
  },
  accent: {
    bg: "from-accent/50 via-card to-card",
    iconBg: "from-primary/20 to-primary/5",
    iconBorder: "border-primary/25",
    accent: "bg-primary/70",
    border: "border-border/40",
  },
};

// Główna struktura
<div className={`
  group relative overflow-hidden rounded-2xl p-5 h-[140px] cursor-pointer
  bg-gradient-to-br ${v.bg}
  border ${v.border}
  shadow-lg shadow-black/5
  opacity-0 animate-slide-up
  hover:shadow-xl hover:shadow-primary/5
  hover:border-primary/40
  transition-all duration-300 ease-out
`}>
  {/* Glass edge effect */}
  <div className="absolute inset-0 rounded-2xl pointer-events-none">
    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    <div className="absolute top-0 left-0 bottom-0 w-px bg-gradient-to-b from-white/10 to-transparent" />
  </div>

  {/* Hover glow effect */}
  <div className="absolute -bottom-12 -right-12 w-24 h-24 rounded-full blur-2xl bg-primary/0 group-hover:bg-primary/10 transition-all duration-500" />

  {/* Content... */}
</div>
```

---

### TopTrackCard / TopArtistCard

```tsx
// 3D Tilt effect dla top 3
const handleMouseMove = (e: React.MouseEvent) => {
  if (!cardRef.current || !isTop3) return;

  const rect = cardRef.current.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;

  const rotateX = ((y - centerY) / centerY) * -4;
  const rotateY = ((x - centerX) / centerX) * 4;

  setTiltStyle({
    transform: `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.01, 1.01, 1.01)`
  });
};

// Rank badge colors (złoto, srebro, brąz)
const rankColors = {
  1: "from-yellow-400/20 to-yellow-500/10 text-yellow-400 border-yellow-400/30 shadow-yellow-400/20",
  2: "from-gray-300/20 to-gray-400/10 text-gray-300 border-gray-300/30 shadow-gray-300/20",
  3: "from-amber-600/20 to-amber-700/10 text-amber-500 border-amber-500/30 shadow-amber-500/20",
};

// Główna struktura karty
<div className={`
  group relative overflow-hidden rounded-xl p-3 cursor-pointer
  bg-card/50 backdrop-blur-sm
  border border-border/30
  hover:bg-card hover:border-primary/30
  hover:shadow-lg hover:shadow-primary/5
  opacity-0 animate-slide-up
  transition-all duration-300
`}
style={{
  transformStyle: 'preserve-3d',
  ...tiltStyle,
}}>
```

---

### TimeRangeFilter (Pill toggle)

```tsx
<div className="inline-flex items-center bg-muted/40 rounded-full p-1 border border-border/30">
  {timeRanges.map((range) => (
    <button
      className={`
        px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap
        transition-all duration-200
        ${value === range.value
          ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
          : "text-muted-foreground hover:text-foreground"
        }
      `}
    >
      {range.label}
    </button>
  ))}
</div>
```

---

### GenreChart (Paski gatunków)

```tsx
// Paleta kolorów dla pasków
const genreColors = [
  { from: "hsl(141, 76%, 48%)", to: "hsl(141, 76%, 38%)" }, // Primary green
  { from: "hsl(151, 70%, 45%)", to: "hsl(151, 70%, 35%)" }, // Teal green
  { from: "hsl(161, 65%, 42%)", to: "hsl(161, 65%, 32%)" }, // Cyan green
  { from: "hsl(171, 60%, 40%)", to: "hsl(171, 60%, 30%)" }, // Turquoise
  { from: "hsl(181, 55%, 38%)", to: "hsl(181, 55%, 28%)" }, // Blue-green
];

// Pasek z efektem shine on hover
<div className="h-2 bg-muted/30 rounded-full overflow-hidden relative">
  <div
    className="h-full rounded-full relative overflow-hidden transition-all duration-700 ease-out group-hover:shadow-[0_0_16px_hsl(141_76%_48%/0.4)]"
    style={{
      width: `${scaledWidth}%`,
      background: `linear-gradient(90deg, ${color.from}, ${color.to})`
    }}
  >
    {/* Shine effect on hover */}
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
  </div>
</div>
```

---

## 🖼️ Efekty wizualne

### Glass Edge Effect
```tsx
<div className="absolute inset-0 rounded-2xl pointer-events-none">
  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
  <div className="absolute top-0 left-0 bottom-0 w-px bg-gradient-to-b from-white/10 to-transparent" />
</div>
```

### Hover Glow
```tsx
<div className="absolute -bottom-12 -right-12 w-24 h-24 rounded-full blur-2xl bg-primary/0 group-hover:bg-primary/10 transition-all duration-500" />
```

### Ambient Background Glow
```tsx
<div className="absolute -top-20 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
```

### Bottom Accent Line on Hover
```tsx
<div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/0 to-transparent group-hover:via-primary/40 transition-all duration-300" />
```

---

## 📱 Marquee dla długiego tekstu

```tsx
// Hook do wykrywania overflow
useEffect(() => {
  if (textRef.current && containerRef.current) {
    const textWidth = textRef.current.scrollWidth;
    const containerWidth = containerRef.current.clientWidth;
    const overflow = textWidth - containerWidth;
    setNeedsMarquee(overflow > 0);
    if (overflow > 0) {
      setScrollDistance(overflow + 16);
    }
  }
}, [value]);

// Użycie
<div ref={containerRef} className="overflow-hidden max-w-full">
  <p
    ref={textRef}
    className={`whitespace-nowrap ${needsMarquee ? 'animate-marquee' : ''}`}
    style={needsMarquee ? {
      animationDuration: `${Math.max(4, value.length * 0.25)}s`,
      '--marquee-distance': `-${scrollDistance}px`
    } : {}}
  >
    {value}
  </p>
</div>
```

---

## ⚡ Optymalizacje performance

### Lazy loading komponentów
```tsx
const ListeningChart = lazy(() => import("@/components/ListeningChart"));
const GenreChart = lazy(() => import("@/components/GenreChart"));

// Użycie
<Suspense fallback={<ChartSkeleton />}>
  <ListeningChart />
</Suspense>
```

### Preconnect i async fonts (index.html)
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link
  href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
  rel="stylesheet"
  media="print"
  onload="this.media='all'"
>
```

### Lazy loading obrazków
```tsx
<img loading="lazy" src={image} alt={title} />
```

---

## 📋 Checklist do przeniesienia

- [ ] Skopiuj design tokens do `index.css`
- [ ] Dodaj font Inter (async loading)
- [ ] Skopiuj utility classes
- [ ] Skopiuj keyframes animacji
- [ ] Skopiuj komponenty: StatsCard, TopTrackCard, TopArtistCard
- [ ] Skopiuj TimeRangeFilter
- [ ] Dodaj stylowanie scrollbara
- [ ] Dodaj focus-visible styles

---

*Wygenerowano: 2026-01-03*
