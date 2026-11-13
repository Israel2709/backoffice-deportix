/** HttpOnly cookie that gates page access (middleware). Not used as API Bearer. */
export const SESSION_COOKIE = "dx_id_token";

/**
 * Gate-cookie lifetime (middleware only). Real API writes use a fresh ID token
 * from the Firebase client; this cookie only proves the analyst opened a session.
 * Keep longer than the ~1h JWT so a stale cookie does not redirect /api/proxy to HTML.
 */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

/**
 * Custom header for BO browser → /api/proxy with a fresh Firebase ID token.
 * Prefer this over `Authorization`: some Next/runtime paths drop Authorization
 * on incoming requests to Route Handlers.
 */
export const ID_TOKEN_HEADER = "x-deportix-id-token";
