/**
 * Listening Age Calculator
 * Calculates a "musical age" based on average release year of tracks
 */

export interface Track {
    album?: { releaseDate?: string };
    releaseDate?: string;
}

/**
 * Calculate listening age from an array of tracks
 * @param tracks - Array of track objects with album.releaseDate
 * @returns Estimated age (e.g., if avg release year is 1990, returns ~35)
 */
export function calculateListeningAge(tracks: Track[]): number | null {
    if (!tracks || tracks.length === 0) return null;

    const currentYear = new Date().getFullYear();
    let totalYears = 0;
    let validTracks = 0;

    tracks.forEach((track: Track) => {
        const releaseDate = track.album?.releaseDate || track.releaseDate;
        if (releaseDate) {
            // Release date can be "2023", "2023-05", or "2023-05-15"
            const year = parseInt(releaseDate.substring(0, 4), 10);
            if (!isNaN(year) && year > 1900 && year <= currentYear) {
                totalYears += year;
                validTracks++;
            }
        }
    });

    if (validTracks === 0) return null;

    const avgReleaseYear = totalYears / validTracks;

    // Calculate "age" - person who was 20 when avg song came out
    // If avg release year is 2000, they were 20 in 2000, so now they're 20 + (currentYear - 2000)
    const listeningAge = 20 + (currentYear - avgReleaseYear);

    // Clamp between reasonable ages (10-100)
    return Math.round(Math.max(10, Math.min(100, listeningAge)));
}

/**
 * Get a fun description for the listening age
 */
export function getAgeDescription(age: number | null): string {
    if (age === null) return "Brak danych";
    if (age <= 18) return "Nastolatek 🎧";
    if (age <= 25) return "Młody duchem 🎵";
    if (age <= 35) return "Milenials 🎶";
    if (age <= 50) return "Klasyk 🎸";
    if (age <= 65) return "Oldschool 📻";
    return "Legenda 🏆";
}
