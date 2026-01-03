
/**
 * Genre Normalization Map
 * Maps specific Spotify genres to broader categories
 */
export const GENRE_MAP: Record<string, string> = {
    // Pop variants
    "art pop": "Pop",
    "dance pop": "Pop",
    "electropop": "Pop",
    "indie pop": "Pop",
    "french indie pop": "Pop",
    "french pop": "Pop",
    "polish pop": "Pop",
    "synth-pop": "Pop",
    "k-pop": "Pop",
    "europop": "Pop",
    "pop rock": "Pop",
    "power pop": "Pop",
    "teen pop": "Pop",

    // Hip Hop / Rap
    "polish hip hop": "Hip Hop",
    "hip hop": "Hip Hop",
    "rap": "Hip Hop",
    "trap": "Hip Hop",
    "polish trap": "Hip Hop",
    "drill": "Hip Hop",
    "gangster rap": "Hip Hop",
    "conscious hip hop": "Hip Hop",

    // Rock
    "rock": "Rock",
    "classic rock": "Rock",
    "hard rock": "Rock",
    "alternative rock": "Rock",
    "indie rock": "Rock",
    "polish rock": "Rock",
    "punk rock": "Rock",
    "soft rock": "Rock",
    "glam rock": "Rock",
    "progressive rock": "Rock",
    "psychedelic rock": "Rock",
    "garage rock": "Rock",
    "art rock": "Rock",
    "blues rock": "Rock",
    "southern rock": "Rock",
    "stoner rock": "Rock",
    "grunge": "Rock",
    "post-rock": "Rock",
    "britpop": "Rock",

    // Electronic / Dance
    "edm": "Electronic",
    "house": "Electronic",
    "techno": "Electronic",
    "trance": "Electronic",
    "dubstep": "Electronic",
    "drum and bass": "Electronic",
    "electro": "Electronic",
    "synthwave": "Electronic",

    // Disco Polo (keep separate - it's distinct)
    "disco polo": "Disco Polo",

    // R&B / Soul
    "r&b": "R&B",
    "soul": "R&B",
    "neo soul": "R&B",
    "contemporary r&b": "R&B",

    // Metal
    "metal": "Metal",
    "heavy metal": "Metal",
    "death metal": "Metal",
    "black metal": "Metal",
    "thrash metal": "Metal",
    "nu metal": "Metal",

    // Jazz
    "jazz": "Jazz",
    "smooth jazz": "Jazz",
    "jazz fusion": "Jazz",

    // Classical
    "classical": "Klasyka",
    "orchestra": "Klasyka",
    "opera": "Klasyka",

    // Latin
    "latin": "Latin",
    "reggaeton": "Latin",
    "salsa": "Latin",
    "bachata": "Latin",

    // Country / Folk
    "country": "Country",
    "folk": "Folk",
    "indie folk": "Folk",
};

/**
 * Normalize genre name using the map, or return capitalized original
 */
export function normalizeGenre(genre: string): string {
    const lower = genre.toLowerCase().trim();

    // Check exact match
    if (GENRE_MAP[lower]) {
        return GENRE_MAP[lower];
    }

    // Check partial matches (e.g., "uk hip hop" contains "hip hop")
    for (const [key, value] of Object.entries(GENRE_MAP)) {
        if (lower.includes(key) || key.includes(lower)) {
            return value;
        }
    }

    // Return original with first letter capitalized
    return genre.split(' ').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

export interface GenreStat {
    name: string;
    percentage: number;
    rawScore?: number;
}

export interface Artist {
    genres?: string[];
}

/**
 * Calculate top genres from a list of artists using V2 algorithm
 * - sqrt(rank) weighing
 * - divide by genre count per artist
 * - normalization
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

        // Change 1: sqrt() for smoother weight distribution
        const rankWeight = Math.sqrt(artistCount - index);

        // Change 2: Divide weight by number of genres
        const perGenreWeight = rankWeight / artistGenres.length;

        artistGenres.forEach((genre: string) => {
            // Change 3: Normalize genre names
            const normalizedGenre = normalizeGenre(genre);
            genreScore[normalizedGenre] = (genreScore[normalizedGenre] || 0) + perGenreWeight;
        });
    });

    // Sort by score
    const sortedGenres = Object.entries(genreScore)
        .sort(([, a], [, b]) => b - a);

    const totalScore = sortedGenres.reduce((sum, [, score]) => sum + score, 0) || 1;

    // Calculate percentages and take top N
    const topGenres = sortedGenres
        .slice(0, limit)
        .map(([name, score]) => ({
            name,
            percentage: Math.round((score / totalScore) * 100),
            rawScore: score
        }));

    return {
        topGenres,
        topGenreName: topGenres[0]?.name || "Brak danych"
    };
}
