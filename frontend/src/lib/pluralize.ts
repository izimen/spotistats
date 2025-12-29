/**
 * Polish pluralization helpers
 * Handles Polish grammar rules for numbers
 */

type PluralForms = {
    one: string;      // 1 odtworzenie
    few: string;      // 2-4 odtworzenia
    many: string;     // 5+ odtworzeń, 0 odtworzeń
};

/**
 * Get the correct Polish plural form based on the number
 *
 * Polish rules:
 * - 1 (exactly) → singular (one)
 * - 2, 3, 4, 22, 23, 24, 32, 33, 34... (but NOT 12, 13, 14) → few
 * - Everything else (0, 5-21, 25-31, 35-41... including 11-19) → many
 */
export function pluralize(count: number, forms: PluralForms): string {
    const absCount = Math.abs(count);
    const lastDigit = absCount % 10;
    const lastTwoDigits = absCount % 100;

    // Exactly 1 → singular
    if (absCount === 1) {
        return `${count} ${forms.one}`;
    }

    // Special case for 11-19 (always "many")
    if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
        return `${count} ${forms.many}`;
    }

    // 2, 3, 4 (also 22-24, 32-34, etc.) → few
    if (lastDigit >= 2 && lastDigit <= 4) {
        return `${count} ${forms.few}`;
    }

    // Everything else → many (0, 5-10, 21, 25-30, 31, 35-40, etc.)
    return `${count} ${forms.many}`;
}

// Predefined plural forms for common words
export const PLURALS = {
    play: {
        one: 'odtworzenie',
        few: 'odtworzenia',
        many: 'odtworzeń'
    },
    song: {
        one: 'utwór',
        few: 'utwory',
        many: 'utworów'
    },
    artist: {
        one: 'artysta',
        few: 'artystów',
        many: 'artystów'
    },
    minute: {
        one: 'minuta',
        few: 'minuty',
        many: 'minut'
    },
    hour: {
        one: 'godzina',
        few: 'godziny',
        many: 'godzin'
    }
} as const;

// Convenience functions
export function pluralizePlays(count: number): string {
    return pluralize(count, PLURALS.play);
}

export function pluralizeSongs(count: number): string {
    return pluralize(count, PLURALS.song);
}

export function pluralizeArtists(count: number): string {
    return pluralize(count, PLURALS.artist);
}

export function pluralizeMinutes(count: number): string {
    return pluralize(count, PLURALS.minute);
}

export function pluralizeHours(count: number): string {
    return pluralize(count, PLURALS.hour);
}
