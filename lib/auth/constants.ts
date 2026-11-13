/** HttpOnly cookie that carries the Firebase ID token for the BFF proxy. */
export const SESSION_COOKIE = "dx_id_token";

/** Cookie lifetime — Firebase ID tokens expire in ~1h; client refreshes on change. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60;
