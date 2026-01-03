/**
 * Mock Data for UI Preview Mode
 * Use with VITE_PREVIEW_MODE=true to test UI without backend
 */

export const MOCK_USER = {
    id: "preview_user",
    displayName: "Jan Kowalski",
    email: "jan@example.com",
    image: "https://i.pravatar.cc/150?u=spotistats",
    product: "premium",
    country: "PL",
};

export const MOCK_TOP_ARTISTS = [
    {
        id: "1",
        name: "Tame Impala",
        image: "https://picsum.photos/seed/artist1/300/300",
        popularity: 82,
        genres: ["psychedelic rock", "indie rock", "neo-psychedelia"],
    },
    {
        id: "2",
        name: "Arctic Monkeys",
        image: "https://picsum.photos/seed/artist2/300/300",
        popularity: 89,
        genres: ["rock", "indie rock", "alternative rock"],
    },
    {
        id: "3",
        name: "Daft Punk",
        image: "https://picsum.photos/seed/artist3/300/300",
        popularity: 85,
        genres: ["electronic", "french house", "synthpop"],
    },
    {
        id: "4",
        name: "Kendrick Lamar",
        image: "https://picsum.photos/seed/artist4/300/300",
        popularity: 91,
        genres: ["hip hop", "conscious hip hop", "west coast rap"],
    },
    {
        id: "5",
        name: "Radiohead",
        image: "https://picsum.photos/seed/artist5/300/300",
        popularity: 78,
        genres: ["alternative rock", "art rock", "experimental"],
    },
    {
        id: "6",
        name: "The Weeknd",
        image: "https://picsum.photos/seed/artist6/300/300",
        popularity: 95,
        genres: ["r&b", "pop", "canadian contemporary r&b"],
    },
    {
        id: "7",
        name: "Dawid Podsiadło",
        image: "https://picsum.photos/seed/artist7/300/300",
        popularity: 76,
        genres: ["polish pop", "polish rock"],
    },
    {
        id: "8",
        name: "Frank Ocean",
        image: "https://picsum.photos/seed/artist8/300/300",
        popularity: 84,
        genres: ["r&b", "neo soul", "alternative r&b"],
    },
    {
        id: "9",
        name: "Tyler, the Creator",
        image: "https://picsum.photos/seed/artist9/300/300",
        popularity: 88,
        genres: ["hip hop", "alternative hip hop", "rap"],
    },
    {
        id: "10",
        name: "Pink Floyd",
        image: "https://picsum.photos/seed/artist10/300/300",
        popularity: 81,
        genres: ["progressive rock", "psychedelic rock", "art rock"],
    },
];

export const MOCK_TOP_TRACKS = [
    {
        id: "t1",
        name: "The Less I Know The Better",
        artists: [{ name: "Tame Impala" }],
        album: {
            name: "Currents",
            image: "https://picsum.photos/seed/album1/300/300",
            releaseDate: "2015-07-17"
        },
        duration: 216000,
        popularity: 89,
    },
    {
        id: "t2",
        name: "Do I Wanna Know?",
        artists: [{ name: "Arctic Monkeys" }],
        album: {
            name: "AM",
            image: "https://picsum.photos/seed/album2/300/300",
            releaseDate: "2013-09-09"
        },
        duration: 272000,
        popularity: 92,
    },
    {
        id: "t3",
        name: "Get Lucky",
        artists: [{ name: "Daft Punk" }, { name: "Pharrell Williams" }],
        album: {
            name: "Random Access Memories",
            image: "https://picsum.photos/seed/album3/300/300",
            releaseDate: "2013-05-17"
        },
        duration: 369000,
        popularity: 88,
    },
    {
        id: "t4",
        name: "HUMBLE.",
        artists: [{ name: "Kendrick Lamar" }],
        album: {
            name: "DAMN.",
            image: "https://picsum.photos/seed/album4/300/300",
            releaseDate: "2017-04-14"
        },
        duration: 177000,
        popularity: 91,
    },
    {
        id: "t5",
        name: "Creep",
        artists: [{ name: "Radiohead" }],
        album: {
            name: "Pablo Honey",
            image: "https://picsum.photos/seed/album5/300/300",
            releaseDate: "1993-02-22"
        },
        duration: 236000,
        popularity: 85,
    },
    {
        id: "t6",
        name: "Blinding Lights",
        artists: [{ name: "The Weeknd" }],
        album: {
            name: "After Hours",
            image: "https://picsum.photos/seed/album6/300/300",
            releaseDate: "2020-03-20"
        },
        duration: 200000,
        popularity: 96,
    },
    {
        id: "t7",
        name: "Małomiasteczkowy",
        artists: [{ name: "Dawid Podsiadło" }],
        album: {
            name: "Małomiasteczkowy",
            image: "https://picsum.photos/seed/album7/300/300",
            releaseDate: "2018-03-16"
        },
        duration: 247000,
        popularity: 78,
    },
    {
        id: "t8",
        name: "Pink + White",
        artists: [{ name: "Frank Ocean" }],
        album: {
            name: "Blonde",
            image: "https://picsum.photos/seed/album8/300/300",
            releaseDate: "2016-08-20"
        },
        duration: 183000,
        popularity: 82,
    },
];

export const MOCK_RECENTLY_PLAYED = MOCK_TOP_TRACKS.slice(0, 5).map((track, index) => ({
    ...track,
    playedAt: new Date(Date.now() - index * 1000 * 60 * 30).toISOString(), // 30 min apart
}));

export const MOCK_LISTENING_CHART = {
    days: [
        { day: "Pon", count: 24 },
        { day: "Wt", count: 18 },
        { day: "Śr", count: 32 },
        { day: "Czw", count: 28 },
        { day: "Pt", count: 45 },
        { day: "Sob", count: 52 },
        { day: "Ndz", count: 38 },
    ],
    stats: {
        totalPlays: 237,
        firstPlay: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        lastPlay: new Date().toISOString(),
        collectionActive: true,
    },
};

export const MOCK_LISTENING_HISTORY = {
    plays: MOCK_RECENTLY_PLAYED.map((track, i) => ({
        id: `play_${i}`,
        track,
        playedAt: track.playedAt,
    })),
    total: 237,
    totalTimeMs: 237 * 3.5 * 60 * 1000, // ~3.5 min average
    hasMore: true,
    stats: {
        mostLooped: {
            trackName: "The Less I Know The Better",
            artistName: "Tame Impala",
            albumImage: "https://picsum.photos/seed/album1/300/300",
            count: 12,
        },
        topHours: [
            { hour: 20, count: 45 },
            { hour: 21, count: 42 },
            { hour: 19, count: 38 },
        ],
        uniqueTracks: 89,
        repeatRatio: 0.32,
    },
};

export const MOCK_AUDIO_FEATURES = {
    success: true,
    trackCount: 8,
    featuresCount: 8,
    averages: {
        danceability: 0.72,
        energy: 0.68,
        valence: 0.58,
        tempo: 118,
        acousticness: 0.15,
        instrumentalness: 0.08,
        speechiness: 0.12,
    },
    mood: "Energetyczny",
    features: [],
};

/**
 * Check if preview mode is enabled
 */
export const isPreviewMode = (): boolean => {
    return import.meta.env.VITE_PREVIEW_MODE === 'true';
};
