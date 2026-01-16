// genreUtils.ts

interface GenreRule {
    category: string;
    keywords: string[];
}

// KOLEJNOŚĆ JEST KLUCZOWA (First Match Wins)
// Algorytm przechodzi od najbardziej specyficznych/kulturowych do najbardziej ogólnych.
const GENRE_RULES: GenreRule[] = [
    // 1. Specyficzne (Kultura/Region) - muszą być pierwsze, by nie wpadły do worków ogólnych
    {
        category: "Disco Polo",
        keywords: ["disco polo", "polski dance", "dance polo"]
        // Źródło: disco polo (Paste January 16, 2026 - 7:40PM:2123)
    },
    {
        category: "Latin",
        keywords: ["latin", "reggaeton", "salsa", "bachata", "urbano", "mariachi", "ranchera", "tropical", "cumbia", "pagode", "sertanejo", "mpb", "forro", "brazilian", "flamenco"]
        // Źródło: urbano latino (Paste January 16, 2026 - 7:40PM:4), pagode (Paste January 16, 2026 - 7:40PM:157)
    },
    {
        category: "K-Pop",
        keywords: ["k-pop", "korean pop"]
        // Źródło: k-pop (Paste January 16, 2026 - 7:40PM:19)
    },

    // 2. Silne gatunki instrumentalne/tradycyjne
    {
        category: "Metal",
        keywords: ["metal", "deathcore", "thrash", "djent", "grindcore", "sludge", "doom", "blackened"]
        // Źródło: metal (Paste January 16, 2026 - 7:40PM:99)
    },
    {
        category: "Jazz",
        keywords: ["jazz", "bop", "swing", "big band", "fusion"]
        // Źródło: jazz (Paste January 16, 2026 - 7:40PM:379)
    },
    {
        category: "Classical / Soundtrack",
        keywords: ["classical", "orchestra", "opera", "soundtrack", "score", "piano", "composer", "movie tunes"]
        // Źródło: classical (Paste January 16, 2026 - 7:40PM:151), soundtrack (Paste January 16, 2026 - 7:40PM:191)
    },
    {
        category: "Folk / Country",
        keywords: ["folk", "country", "bluegrass", "americana", "roots"]
        // Źródło: country (Paste January 16, 2026 - 7:40PM:42)
    },

    // 3. Główne nurty rozrywkowe (kolejność ma znaczenie dla hybryd)
    {
        category: "Hip Hop",
        keywords: ["rap", "hip hop", "trap", "drill", "boom bap", "crunk", "grime", "phonk"]
        // Źródło: hip hop (Paste January 16, 2026 - 7:40PM:5). "Phonk" (linia 791) tutaj, bo bliżej mu do trapu niż techno.
    },
    {
        category: "Indie / Alternative",
        keywords: ["indie", "alternative", "shoegaze", "dream pop", "bedroom pop", "post-punk", "art pop"]
        // Umieszczone PRZED Electronic, aby wyłapać "lo-fi indie" (linia 387) tutaj.
    },
    {
        category: "Rock",
        keywords: ["rock", "punk", "grunge", "britpop", "emo", "hardcore"]
        // Źródło: rock (Paste January 16, 2026 - 7:40PM:3)
    },
    {
        category: "Electronic",
        keywords: [
            "edm", "house", "techno", "trance", "dubstep", "dnb", "drum and bass",
            "electro", "hardstyle", "garage", "rave", "synth", "club",
            "disco", "ambient", "lo-fi"
        ]
        // USUNIĘTO: "dance" (by nie kraść dance popu), "chill" (by nie kraść chill r&b).
        // Dodano: "disco" (linia 169) - bezpieczne, bo Disco Polo jest wyżej.
    },
    {
        category: "R&B / Soul",
        keywords: ["r&b", "soul", "blues", "funk", "motown"]
        // Źródło: r&b (Paste January 16, 2026 - 7:40PM:20)
    },

    // 4. Fallback dla Popu (chwytacz ogólny)
    {
        category: "Pop",
        keywords: ["pop", "singer-songwriter"]
        // Tutaj bezpiecznie trafią "dance pop" (linia 8) i "chill pop" (linia 632)
    }
];

/**
 * Normalize genre name using keyword priority algorithm
 */
export function normalizeGenre(rawGenre: string): string {
    if (!rawGenre) return "Nieznany";
    const lowerGenre = rawGenre.toLowerCase().trim();

    // 1. Sprawdź reguły priorytetowe
    for (const rule of GENRE_RULES) {
        if (rule.keywords.some(keyword => lowerGenre.includes(keyword))) {
            return rule.category;
        }
    }

    // 2. Fallback dedykowany: Reggae/Ska
    // Często nie pasuje do powyższych, a jest dużą grupą.
    if (lowerGenre.includes("reggae") || lowerGenre.includes("dub") || lowerGenre.includes("ska")) {
        return "Reggae / Ska";
    }

    // 3. Fallback ostateczny: Formatowanie oryginalnej nazwy
    // Zwracamy np. "Modern Bollywood" zamiast "Inne", co pozwala na lepszą analitykę w przyszłości.
    return rawGenre.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

// ============================================================================
// Types and interfaces
// ============================================================================

export interface GenreStat {
    name: string;
    percentage: number;
    rawScore?: number;
}

export interface Artist {
    genres?: string[];
}

// ============================================================================
// Genre calculation algorithm
// ============================================================================

/**
 * Calculate top genres from a list of artists using V2 algorithm
 * - sqrt(rank) weighing
 * - divide by genre count per artist
 * - normalization with keyword priority
 */
export function calculateTopGenres(artists: Artist[] = [], limit = 5): { topGenres: GenreStat[], topGenreName: string } {
    const genreScore: Record<string, number> = {};
    const artistCount = artists.length;

    if (artistCount === 0) {
        return { topGenres: [], topGenreName: "Brak danych" };
    }

    // V2 Algorithm: Calculate weighted genre scores
    artists.forEach((artist: Artist, index: number) => {
        const artistGenres = artist.genres || [];
        if (artistGenres.length === 0) return;

        // sqrt() for smoother weight distribution
        const rankWeight = Math.sqrt(artistCount - index);

        // Divide weight by number of genres
        const perGenreWeight = rankWeight / artistGenres.length;

        artistGenres.forEach((genre: string) => {
            // Normalize genre names to broad categories using keyword priority
            const normalizedGenre = normalizeGenre(genre);
            genreScore[normalizedGenre] = (genreScore[normalizedGenre] || 0) + perGenreWeight;
        });
    });

    // Sort genres by score descending
    const sortedGenres = Object.entries(genreScore)
        .sort(([, a], [, b]) => b - a);

    const totalScore = sortedGenres.reduce((sum, [, score]) => sum + score, 0) || 1;

    // Take top genres
    let topGenres = sortedGenres
        .slice(0, limit)
        .map(([name, score]) => ({
            name,
            percentage: Math.round((score / totalScore) * 100),
            rawScore: score
        }));

    // Sort final list by percentage descending
    topGenres.sort((a, b) => b.percentage - a.percentage);

    return {
        topGenres,
        topGenreName: topGenres[0]?.name || "Brak danych"
    };
}
