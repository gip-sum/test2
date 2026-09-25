# Phase 6 — User authentication

**Status:** IMPLEMENTED — LIVE PROVIDER SETUP PENDING
**Source:** `Phases.txt`, Phase 6.

## 1. Scope

Implement email OTP and Google registration and sign-in, persistent
provider-backed sessions, sign-out, and a guarded account entry. The account dashboard,
profile editing, saved properties and enquiries belong to later phases.
Phone OTP is excluded from login by the client's decision. Phase 10's
contact reveal will be specified separately. There is no fake local user or
development bypass. Supabase Auth stores identities; the app holds only
session credentials in secure, HTTP-only cookies.

## 2. UX requirements

- Separate sign-in and registration choices. Request a six-digit code, enter
  it without switching devices, and recover from a wrong or expired code.
- A Google choice redirects through the configured identity provider and
  returns to the requested in-app page. A cancelled or failed Google flow
  returns to the login form with a generic, accessible error.
- Explain that the code is delivered by email. Never claim it was sent if
  the provider is unavailable; avoid exposing whether an address exists.
- A signed-in visitor sees their verified email and can sign out. A signed-out
  visitor trying `/account` returns to the requested path after sign-in.
- Configuration missing yields a clear unavailable state instead of a
  pretend sign-in; no account is created in the local fixture.

## 3. Technical requirements

- `lib/auth` owns provider requests, session cookies, validation and safe
  return paths. Server Actions handle code requests, verification and logout.
  Route handlers start and complete Google's OAuth PKCE code flow, keeping
  a short-lived verifier in a secure HTTP-only cookie.
- Supabase Auth REST API handles one-time code creation, user persistence,
  expiry, verification and refresh token rotation. No service-role key in
  the application and no access token in localStorage or HTML.
- The existing proxy refreshes expired sessions, forwards rotated
  cookies to the current request and browser, and guards account paths.
  Server rendering verifies the account against the provider as well.
- Signed-out pages can still be server rendered. Auth failures fail closed;
  an unavailable provider does not silently become a signed-in state.

## 4. Data requirements

- The provider `auth.users.id` UUID is the immutable user ID; email and its
  verification state come from the provider, never a fixture.
- A migration defines `public.organisations` and `public.memberships` keyed
  by auth user IDs for future seller ownership; it creates no sample users
  and gives no client permission to self-assign an organisation role.
- Cookie data: access token, refresh token and short-lived Google PKCE
  verifier and return path. Cookies are HTTP-only, SameSite=Lax and Secure
  on HTTPS. Google provider tokens are not stored by this application.

## 5. Edge cases

- Malformed email/code, wrong and expired code, resend throttling, repeated
  submission, already registered email, two browser sessions, expired access
  token, revoked refresh token, provider outage and forged cookies.
- `next` cannot point off-site, to an auth action, or to protocol-relative
  URLs. Sign out clears cookies even if upstream revocation fails.
- Avoid leaking addresses through sign-in response wording or timing claims.
- Google redirect denial, missing/expired verifier, tampered callback code,
  callback replay and an unsafe return URL all fail without creating a session.

## 6. Accessibility requirements

- Label email and code inputs; set autocomplete and input modes. Status and
  error messages use live regions and remain text, not colour alone.
- All controls work by keyboard with visible focus and at least 44px touch
  targets on mobile. Error focus is returned to the relevant input.

## 7. Responsive requirements

- Verify 390, 412, 768 and 1280px widths without horizontal overflow.
  The auth card stays usable with zoom and the on-screen keyboard.

## 8. Verification

- `npm run verify`, `npm run build`, `shots`, `light-check`, `search-check`,
  `property-check`, `media-check` and `auth-check` browser assertions.
- Test validation, open-redirect protection, cookie expiry, provider error
  mapping and account guard with a deterministic fake provider. Exercise
  refresh, Google PKCE exchange and sign-out without real credentials;
  inspect mobile auth UI.

## 9. Production readiness

- [x] Tests and build pass; protected state cannot be forged in browser checks.
- [ ] Supabase URL and publishable key set in deployment.
- [ ] Email template contains `{{ .Token }}` and SMTP delivery is configured.
- [ ] Google sign-in is enabled in Supabase, with a Google OAuth client and
  the Supabase callback URL in Google Cloud, and the app callback URL
  allowlisted in Supabase. `AUTH_SITE_URL` matches the live site origin.
- [ ] Live code delivery, verification, expiry, refresh and logout checked
  against the intended Supabase project and real deployment origin.
- [ ] Live Google consent, callback, account linking and cancellation checked
  on the intended deployment origin.
- [x] SQL migration applied to Supabase project `zploxccfgehtqesdwueg` on
  2026-09-23; both tables have RLS enabled, owner-scoped read policies were
  verified, and the security advisor reported no findings.

Local verification: `npm run verify` (178 unit tests), `npm run build`,
`auth-check` (26/26 against a simulated Auth API), `property-check`
(67/67), `media-check` (26/26), `search-check` (64/64), `light-check`,
and responsive screenshots at 390/412/768/1280 passed. The unconfigured
login page displays its unavailable state and `/account` redirects (307).
The provider integration cannot be marked complete until the unchecked
live-project items are verified.

### Login screen redesign (2026-09-25, outside the phase numbering)

The login page gained an illustrated scene (`components/auth/WayHomeScene.tsx`)
beside the form on desktop and above it on phones. The auth flow itself is
unchanged: email code and Google only, the same server actions, routes,
cookies and provider calls. The redesign also completes §6's "error focus is
returned to the relevant input": a rejected email returns focus to the
email field, a requested code moves it to the code field, and a wrong code
returns it there with the text selected.

`npm run login-check` covers the page at 390/412/768/1280, controls reachable
on a phone's first screen, zero layout shift through the animation, the
scene's reduced-motion picture, and — against the Auth API simulator —
malformed, throttled and failed requests, both pending states, code sent,
wrong code, success redirect, registration and the Google error. CI now
runs it with and without auth configured, alongside `auth-check`.

**Logout cookie fix (same day).** Adding `auth-check` to CI exposed a latent
bug under CI's newer Chromium, which binds each cookie to the scheme that
set it. Sign-in marked the session cookies Secure from `NODE_ENV`. The
proxy's refresh marked them Secure only on https. Logout deleted them with
no attributes at all. On a production build served over plain http (local
`next start`, CI), the refresh added second copies and logout could not
clear the Secure ones, so the visitor stayed signed in. On https every path
agreed, so the deployed site was not affected.

All three writers now share `lib/auth/cookies.ts`, and logout expires the
cookies with the attributes they were set with. `auth-check`'s simulator
now revokes refresh tokens at logout, as Supabase does, so a refresh racing
the sign-out cannot revive the session. It also expires the app's own access
cookie instead of planting a lookalike beside it. Verified: `auth-check`
33/33 and `login-check` 57/57, with and without scheme-bound cookies.
