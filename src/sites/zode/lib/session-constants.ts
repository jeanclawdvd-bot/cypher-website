/**
 * Session constants shared between the Edge-safe middleware and the Node-only
 * session helpers. This module must stay free of `node:crypto` imports so the
 * middleware bundle can include it.
 */
export const SESSION_COOKIE = "grid_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

/**
 * Temporary kill-switch for the shared-password gate. While `true`, every
 * page is publicly accessible and the login flow is bypassed. Flip back to
 * `false` to re-enable the password requirement.
 */
export const AUTH_DISABLED = true;
