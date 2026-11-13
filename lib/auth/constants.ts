/** HttpOnly cookie that gates page access (middleware). Not used as API Bearer. */
export const SESSION_COOKIE = "dx_id_token";

/** Cookie lifetime — Firebase ID tokens expire in ~1h; client refreshes on change. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60;

/**
 * Custom header for BO browser → /api/proxy with a fresh Firebase ID token.
 * Prefer this over `Authorization`: some Next/runtime paths drop Authorization
 * on incoming requests to Route Handlers.
 */
export const ID_TOKEN_HEADER = "x-deportix-id-token";
