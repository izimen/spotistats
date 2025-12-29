/**
 * Import Validation Schemas (Zod)
 * Protects against malformed JSON and JSON bombs
 */
const z = require('zod');

// Max limits to prevent abuse
const MAX_TRACKS_PER_FILE = 50000;
const MAX_STRING_LENGTH = 500;

/**
 * Single streaming history entry schema
 * Based on Spotify Extended Streaming History format
 */
const streamingHistoryEntrySchema = z.object({
    ts: z.string().datetime().or(z.string().min(1)), // ISO timestamp
    ms_played: z.number().int().min(0).max(86400000), // Max 24h in ms
    master_metadata_track_name: z.string().max(MAX_STRING_LENGTH).optional().nullable(),
    master_metadata_album_artist_name: z.string().max(MAX_STRING_LENGTH).optional().nullable(),
    master_metadata_album_album_name: z.string().max(MAX_STRING_LENGTH).optional().nullable(),
    spotify_track_uri: z.string().max(100).optional().nullable(),
    episode_name: z.string().max(MAX_STRING_LENGTH).optional().nullable(),
    episode_show_name: z.string().max(MAX_STRING_LENGTH).optional().nullable(),
    platform: z.string().max(50).optional().nullable(),
    conn_country: z.string().max(5).optional().nullable(),
    reason_start: z.string().max(50).optional().nullable(),
    reason_end: z.string().max(50).optional().nullable(),
    shuffle: z.boolean().optional().nullable(),
    skipped: z.boolean().optional().nullable(),
    offline: z.boolean().optional().nullable(),
    incognito_mode: z.boolean().optional().nullable()
}).passthrough(); // Allow extra fields but don't validate them

/**
 * Streaming history file schema
 */
const streamingHistoryFileSchema = z.array(streamingHistoryEntrySchema)
    .max(MAX_TRACKS_PER_FILE, `Maximum ${MAX_TRACKS_PER_FILE} tracks per file`);

/**
 * Import request body schema
 */
const importRequestSchema = z.object({
    files: streamingHistoryFileSchema,
    fileName: z.string().max(255).optional()
});

/**
 * Validate streaming history data
 * @param {any} data - Raw JSON data
 * @returns {{ success: boolean, data?: any, error?: string }}
 */
function validateStreamingHistory(data) {
    try {
        const result = streamingHistoryFileSchema.safeParse(data);

        if (!result.success) {
            const firstError = result.error.errors[0];
            return {
                success: false,
                error: `Validation error at ${firstError.path.join('.')}: ${firstError.message}`
            };
        }

        return { success: true, data: result.data };
    } catch (error) {
        return {
            success: false,
            error: 'Invalid JSON structure'
        };
    }
}

/**
 * Validate import request
 * @param {any} body - Request body
 * @returns {{ success: boolean, data?: any, error?: string }}
 */
function validateImportRequest(body) {
    try {
        const result = importRequestSchema.safeParse(body);

        if (!result.success) {
            const firstError = result.error.errors[0];
            return {
                success: false,
                error: `Validation error: ${firstError.message}`
            };
        }

        return { success: true, data: result.data };
    } catch (error) {
        return {
            success: false,
            error: 'Invalid request format'
        };
    }
}

/**
 * Size check middleware for JSON body
 * Prevents JSON bombs before they're fully parsed
 */
function jsonSizeLimit(maxSizeBytes = 50 * 1024 * 1024) { // 50MB default
    return (req, res, next) => {
        const contentLength = parseInt(req.headers['content-length'] || '0', 10);

        if (contentLength > maxSizeBytes) {
            return res.status(413).json({
                error: 'PayloadTooLarge',
                message: `Request body exceeds maximum size of ${maxSizeBytes / (1024 * 1024)}MB`
            });
        }

        next();
    };
}

module.exports = {
    validateStreamingHistory,
    validateImportRequest,
    jsonSizeLimit,
    streamingHistoryEntrySchema,
    streamingHistoryFileSchema,
    importRequestSchema,
    MAX_TRACKS_PER_FILE
};
