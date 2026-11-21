# SpotiStats - Twoje statystyki muzyczne

Projekt frontendowy dla aplikacji SpotiStats, zbudowany przy użyciu:
- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Uruchomienie lokalne

Wymagany Node.js 22+ i npm. Bez backendu mozna podejrzec UI w trybie preview (`VITE_PREVIEW_MODE=true npm run dev`, dane testowe z `src/lib/mockData.ts`).

```sh
# Instalacja zależności
npm install

# Uruchomienie serwera deweloperskiego
npm run dev
```

Aplikacja będzie dostępna pod adresem `http://localhost:8080`.

## Struktura projektu

- `src/components`: Komponenty UI
- `src/pages`: Główne widoki aplikacji
- `src/hooks`: Logika (np. pobieranie danych ze Spotify)
- `src/lib`: Funkcje pomocnicze
