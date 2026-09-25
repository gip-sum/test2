/**
 * Session cookie names and attributes — one definition for every writer:
 * sign-in (lib/auth/session.ts), the Google callback, and the proxy's
 * token refresh.
 *
 * They must agree, because a cookie can only be replaced or deleted by a
 * write with matching attributes. Browsers will not let a non-Secure write
 * touch a Secure cookie, and current Chromium binds each cookie to the
 * scheme and port that set it, so a mismatched write adds a second cookie
 * beside the first instead of replacing it. When the proxy chose `secure`
 * from the request protocol while sign-in chose it from NODE_ENV, a
 * production build served over plain http (local runs, CI) collected
 * duplicate session cookies, and logout's delete could not clear the
 * Secure ones — the visitor stayed signed in. On an https deployment both
 * rules said Secure, which is why it never showed there.
 *
 * Deliberately free of `server-only` and `next/headers` so the proxy can
 * import it.
 */
export const ACCESS_COOKIE = 'gb-access'
export const REFRESH_COOKIE = 'gb-refresh'
export const cookieOptions = { httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/' }
