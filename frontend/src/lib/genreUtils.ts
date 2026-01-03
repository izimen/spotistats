/**
 * Genre Normalization Map
 * Maps specific Spotify genres to broader categories
 */
export const GENRE_MAP: Record<string, string> = {
    // Pop variants
    "art pop": "Pop",
    "dance pop": "Pop",
    "electropop": "Pop",
    "french pop": "Pop",
    "polish pop": "Pop",
    "synth-pop": "Pop",
    "europop": "Pop",
    "pop rock": "Pop",
    "power pop": "Pop",
    "teen pop": "Pop",

    // K-pop (separate category)
    "k-pop": "K-pop",
    "k-pop boy group": "K-pop",
    "k-pop girl group": "K-pop",
    "korean pop": "K-pop",

    // Indie / Alternative (separate category)
    "indie": "Indie",
    "indie pop": "Indie",
    "indie rock": "Indie",
    "indie folk": "Indie",
    "alternative": "Indie",
    "alt-pop": "Indie",
    "dream pop": "Indie",
    "shoegaze": "Indie",
    "french indie pop": "Indie",

    // Hip Hop / Rap
    "polish hip hop": "Hip Hop",
    "hip hop": "Hip Hop",
    "rap": "Hip Hop",
    "trap": "Hip Hop",
    "polish trap": "Hip Hop",
    "drill": "Hip Hop",
    "gangster rap": "Hip Hop",
    "conscious hip hop": "Hip Hop",
    "polish rap": "Hip Hop",

    // Rock
    "rock": "Rock",
    "classic rock": "Rock",
    "hard rock": "Rock",
    "alternative rock": "Rock",
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
    "punk": "Rock",

    // Electronic / Dance
    "edm": "Electronic",
    "house": "Electronic",
    "techno": "Electronic",
    "trance": "Electronic",
    "dubstep": "Electronic",
    "drum and bass": "Electronic",
    "electro": "Electronic",
    "synthwave": "Electronic",
    "deep house": "Electronic",
    "progressive house": "Electronic",
    "future bass": "Electronic",

    // Disco Polo (Polish - keep separate)
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
    "metalcore": "Metal",

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
    "latin pop": "Latin",

    // Country
    "country": "Country",

    // Folk
    "folk": "Folk",
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
 * - normalization with fallback to raw genres
 */
export function calculateTopGenres(artists: Artist[] = [], limit = 5): { topGenres: GenreStat[], topGenreName: string } {
    const genreScore: Record<string, number> = {};
    const rawGenreScore: Record<string, number> = {};
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
            // Normalize genre names to broad categories
            const normalizedGenre = normalizeGenre(genre);
            genreScore[normalizedGenre] = (genreScore[normalizedGenre] || 0) + perGenreWeight;

            // Also track raw genres for fallback
            const capitalizedGenre = genre.split(' ').map(word =>
                word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
            rawGenreScore[capitalizedGenre] = (rawGenreScore[capitalizedGenre] || 0) + perGenreWeight;
        });
    });

    // Sort normalized genres by score
    const sortedGenres = Object.entries(genreScore)
        .sort(([, a], [, b]) => b - a);

    // Sort raw genres by score (for fallback)
    const sortedRawGenres = Object.entries(rawGenreScore)
        .sort(([, a], [, b]) => b - a);

    const totalScore = sortedGenres.reduce((sum, [, score]) => sum + score, 0) || 1;

    // Take normalized categories first
    let topGenres = sortedGenres
        .slice(0, limit)
        .map(([name, score]) => ({
            name,
            percentage: Math.round((score / totalScore) * 100),
            rawScore: score
        }));

    // If we have less than limit, fill with raw genres not already included
    if (topGenres.length < limit) {
        const existingNames = new Set(topGenres.map(g => g.name.toLowerCase()));
        const additionalGenres = sortedRawGenres
            .filter(([name]) => !existingNames.has(name.toLowerCase()))
            .slice(0, limit - topGenres.length)
            .map(([name, score]) => ({
                name,
                percentage: Math.round((score / totalScore) * 100),
                rawScore: score
            }));
        topGenres = [...topGenres, ...additionalGenres];
    }

    return {
        topGenres,
        topGenreName: topGenres[0]?.name || "Brak danych"
    };
}
