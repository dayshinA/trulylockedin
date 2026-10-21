// Shared by proxy.ts (optimistic check) and the server-only DAL.
export const SESSION_COOKIE = "tli_admin_session";

// Firebase allows 5 minutes to 2 weeks.
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 5;
