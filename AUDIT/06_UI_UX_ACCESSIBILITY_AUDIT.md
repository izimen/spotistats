# AUDIT: UI/UX / Product / Accessibility

## Ocena: 8/10

Profesjonalny dark theme z Spotify-green accent. Dobre animacje, responsywny layout, jasna hierarchia informacji. Glowne problemy: brak a11y, brak skip-to-content, brak focus management.

---

## UX Findings

### UX-001: Brak Onboardingu po Pierwszym Logowaniu
- **Problem:** Po pierwszym logowaniu uzytkownik trafia na dashboard z pustymi danymi (brak historii importu). Nie ma wyjasnenia co robic dalej.
- **Wplyw:** Uzytkownik nie wie, ze moze importowac historie lub ze dane zbieraja sie automatycznie
- **Zmiana:** Dodaj banner/modal onboardingowy z krokami: 1) Dane Spotify API zbieraja sie automatycznie, 2) Import historii z pliku
- **Priorytet:** Medium
- **ETAP 2:** TAK

### UX-002: Brak Empty States z CTA
- **Problem:** Sekcje bez danych pokazuja "Brak danych" bez kontekstu ani akcji
- **Wplyw:** Uzytkownik nie wie dlaczego brak danych i co zrobic
- **Zmiana:** Dodaj opisowe empty states z CTA (np. "Zacznij sluchac muzyki na Spotify, a twoje statystyki pojawia sie tutaj")
- **Priorytet:** Medium
- **ETAP 2:** TAK

### UX-003: Brak Feedback po Akcjach (Import, Sync, Logout)
- **Problem:** Niektore akcje nie maja wyraznego feedback'u (toast/notification)
- **Wplyw:** Uzytkownik nie wie czy akcja sie powiodla
- **Zmiana:** Dodaj toast notification po kazdej istotnej akcji
- **Priorytet:** Low
- **ETAP 2:** TAK

### UX-004: Time Range Labels Nieczytelne
- **Problem:** "Tydzien" to faktycznie "Ostatnie 4 tygodnie" w Spotify API, "Miesiac" to "6 miesiecy", "Rok" to "All time". Uzytkownik moze byc zdezorientowany.
- **Wplyw:** Nieprecyzyjne nazwy mogą mylić użytkownika
- **Zmiana:** Uzywaj precyzyjnych labelek: "4 Tygodnie", "6 Miesiecy", "Caly czas" (juz czesciowo zrobione w kodzie ale nie wszedzie)
- **Priorytet:** Low
- **ETAP 2:** TAK

### UX-005: Brak Breadcrumbs/Back Navigation
- **Problem:** Na stronach subpages (TopArtists, TopTracks) brak jasnej sciezki powrotnej poza header nav
- **Wplyw:** Lekka dezorientacja na mobile
- **Zmiana:** Dodaj breadcrumb lub "< Wstecz" link na subpages
- **Priorytet:** Low
- **ETAP 2:** TAK

### UX-006: Profile Page - Brak Statystyk Uzytkownika
- **Problem:** Profil pokazuje tylko dane konta (email, subskrypcja, kraj). Brak statystyk sluchania.
- **Wplyw:** Zmarnowana szansa na prezentacje danych
- **Zmiana:** Dodaj sekcje "Twoje statystyki" z podsumowaniem (total plays, hours, etc.)
- **Priorytet:** Low
- **ETAP 2:** TAK

---

## Accessibility Findings

### A11Y-001: Brak Skip-to-Content Link
- **Problem:** Brak skip link na poczatku strony
- **Wplyw:** Uzytkownicy screen readera musza tabulowac przez caly header
- **Zmiana:** Dodaj `<a href="#main-content" class="sr-only focus:not-sr-only">Skip to content</a>`
- **Priorytet:** Medium
- **ETAP 2:** TAK

### A11Y-002: Brak Focus Visible na Interaktywnych Elementach
- **Problem:** Niektorych komponentow nie widac focus outline (animowane karty, stat cards)
- **Wplyw:** Keyboard navigation utrudniona
- **Zmiana:** Dodaj `focus-visible:ring-2 focus-visible:ring-primary` do kart i interactive elements
- **Priorytet:** Medium
- **ETAP 2:** TAK

### A11Y-003: Brak aria-label na Icon-only Buttons
- **Problem:** Przyciski z ikonami (profil, menu mobilne) nie maja `aria-label`
- **Lokalizacja:** `Header.tsx:91-104`, `Header.tsx:108-119`
- **Wplyw:** Screen reader czyta "button" bez kontekstu
- **Zmiana:** Dodaj `aria-label="Profil"`, `aria-label="Menu nawigacji"`
- **Priorytet:** Medium
- **ETAP 2:** TAK

### A11Y-004: Brak alt Text na Obrazach Albumow
- **Problem:** Obrazy albumow/artystow nie maja opisowych alt tekstow
- **Lokalizacja:** TopArtistCard.tsx, TopTrackCard.tsx
- **Wplyw:** Screen reader nie opisze obrazu
- **Zmiana:** Dodaj alt z nazwa artysty/albumu
- **Priorytet:** Medium
- **ETAP 2:** TAK

### A11Y-005: Animacje Bez prefers-reduced-motion
- **Problem:** Animacje CSS (fade-in, slide-up, float, pulse) nie respektuja `prefers-reduced-motion`
- **Lokalizacja:** `index.css`, komponenty z klasami animate-*
- **Wplyw:** Problemy dla uzytkownikow z motion sensitivity
- **Zmiana:** Dodaj `@media (prefers-reduced-motion: reduce) { .animate-* { animation: none; } }`
- **Priorytet:** Medium
- **ETAP 2:** TAK

### A11Y-006: Kontrast Tekstu muted-foreground
- **Problem:** `--muted-foreground: 0 0% 55%` na `--background: 225 8% 5%` - kontrast ~4.0:1 (niski dla malego tekstu)
- **Wplyw:** Trudna czytelnosc dla uzytkownikow z ograniczeniami wzroku
- **Zmiana:** Zwieksz jasnosc muted-foreground do min 60% (kontrast 4.5:1+)
- **Priorytet:** Medium
- **ETAP 2:** TAK

### A11Y-007: Mobile Menu - Brak Trap Focus
- **Problem:** Menu mobilne nie trapuje focusu - tab moze wyjsc poza otwarte menu
- **Lokalizacja:** `Header.tsx:125-153`
- **Wplyw:** Keyboard navigation issues na mobile
- **Zmiana:** Dodaj focus trap do otwartego menu mobilnego
- **Priorytet:** Low
- **ETAP 2:** TAK
