/** Cookie HTTP-only com o JWT de sessão (substitui os cookies Supabase Auth). */
export const SESSION_COOKIE_NAME = "proeduka_session";

/** Duração do token (cookie max-age igual). */
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7;
