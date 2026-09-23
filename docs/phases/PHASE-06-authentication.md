# Phase 6 — User authentication

**Status:** IMPLEMENTED — LIVE PROVIDER SETUP PENDING
**Source:** `Phases.txt`, Phase 6.

## 1. Scope

Implement email OTP registration and sign-in, persistent provider-backed
sessions, sign-out, and a guarded account entry. The account dashboard,
profile editing, saved properties and enquiries belong to later phases.
Phone reveal and phone OTP belong to Phase 10. There is no fake local user or
development bypass. Supabase Auth stores identities; the app holds only
session credentials in secure, HTTP-only cookies.

## 2. UX requirements

- Separate sign-in and registration choices. Request a six-digit code, enter
  it without switching devices, and recover from a wrong or expired code.
- Explain that the code is delivered by email. Never claim it was sent if
  the provider is unavailable; avoid exposing whether an address exists.
- A signed-in visitor sees their verified email and can sign out. A signed-out
  visitor trying `/account` returns to the requested path after sign-in.
- Configuration missing yields a clear unavailable state instead of a
  pretend sign-in; no account is created in the local fixture.

## 3. Technical requirements

- `lib/auth` owns provider requests, session cookies, validation and safe
  return paths. Server Actions handle code requests, verification and logout.
- Supabase Auth REST API handles one-time code creation, user persistence,
  expiry, verification and refresh token rotation. No service-role key in
  the application and no access token in localStorage or HTML.
- The existing middleware refreshes expired sessions, forwards rotated
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
- Cookie data: access token, refresh token and short-lived pending email
  state. Cookies are HTTP-only, SameSite=Lax and Secure on HTTPS.

## 5. Edge cases

- Malformed email/code, wrong and expired code, resend throttling, repeated
  submission, already registered email, two browser sessions, expired access
  token, revoked refresh token, provider outage and forged cookies.
- `next` cannot point off-site, to an auth action, or to protocol-relative
  URLs. Sign out clears cookies even if upstream revocation fails.
- Avoid leaking addresses through sign-in response wording or timing claims.

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
  refresh and sign-out without real credentials; inspect mobile auth UI.

## 9. Production readiness

- [x] Tests and build pass; protected state cannot be forged in browser checks.
- [ ] Supabase URL and publishable key set in deployment.
- [ ] Email template contains `{{ .Token }}` and SMTP delivery is configured.
- [ ] Live code delivery, verification, expiry, refresh and logout checked
  against the intended Supabase project and real deployment origin.
- [ ] SQL migration applied and its row-level policies reviewed.

Local verification: `npm run verify` (178 unit tests), `npm run build`,
`auth-check` (20/20 against a simulated Auth API), `property-check`
(67/67), `media-check` (26/26), `search-check` (64/64), `light-check`,
and responsive screenshots at 390/412/768/1280 passed. The unconfigured
login page displays its unavailable state and `/account` redirects (307).
The provider integration cannot be marked complete until the unchecked
live-project items are verified.
