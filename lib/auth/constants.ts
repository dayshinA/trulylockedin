// Shared by proxy.ts (optimistic check) and the server-only DALs.
export const SESSION_COOKIE = "tli_admin_session";

// Firebase allows 5 minutes to 2 weeks.
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 5;

// Members get their own cookie so the two roles never share a session.
export const MEMBER_SESSION_COOKIE = "tli_member_session";
export const MEMBER_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;
