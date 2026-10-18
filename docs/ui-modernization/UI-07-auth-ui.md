# UI-07 — Authentication UI

Status: complete, 18 October 2026, on `main`. Builds on UI-01 to UI-06
([UI-06](UI-06-search-cards.md)).

UI-07 hardens the sign-in form around the frozen login scene. The scene's
files, CSS, keyframes and timing are byte-identical (fingerprints and
`login-check`'s timing beats unchanged).

The audit found four defects in the form and fixed them:

1. **Without JavaScript, a wrong code lost the step.** The page came back
   as an empty email step with no error, because the email and code steps
   kept separate states.
2. **A busy button dropped focus.** While a code was being sent or
   checked, Chrome moved focus to `<body>`, because the busy button was
   `disabled`.
3. **A lost connection lost the page.** Submitting offline replaced the
   page with the route's error screen, and what had been typed was gone.
4. **An open redirect.** A return path such as `/.//evil.example` passed
   `safeReturnPath` and became `//evil.example`. After a successful Google
   sign-in the browser was sent to `http://evil.example/`. Fixed and pushed
   on its own (`fbaa983`), with tests.

Around those fixes:
- messages come from one table, and the provider's own wording is never
  shown;
- errors sit beside their field, and focus follows them, with and without
  JavaScript;
- the code step can send a new code and change the address;
- the Google button shows progress and refuses a double press;
- every control is a 44px target at all eight widths.

No Motion, no Kokonut component, no new dependency. Login JavaScript
+1.3 KB gzip; other routes +0.00–0.08 KB.

---

## 1. Scope

**In:**
- the sign-in form (email code and Google) on `/login`, in both modes;
- its server actions, messages, busy and focus behaviour;
- the shared `Button` busy state;
- the Google start/callback routes' error redirects;
- the return-path validator;
- browser checks.

**Out:**
- **The login scene.** No file under its fingerprints changed.
- **The authentication architecture.** It is still Supabase Auth over its
  HTTP API, server-side, with no SDK, the same PKCE flow and the same
  cookies.
- **New providers, phone or WhatsApp OTP, passwords.**
- Other forms (enquiry, profile, posting), and Anime.js, Bklit UI and
  Motion.

## 2. The flow, as audited

| Step | Before UI-07 | After |
|---|---|---|
| Entry | `/login` (`?mode=register`, `?next=`), the header's Log in, `proxy.ts` sending signed-out visitors to `/login?next=…`, `signOut` | unchanged |
| Signed in already | `/login` redirects to `next` | unchanged (`next` now validated correctly, §9) |
| Email | server action `requestCode` → `POST /otp` (`create_user` only on register). A provider refusal reads as "emailed if this address can sign in" | `submitAuth` with `intent=request`; same non-enumeration |
| Code | separate `verifyCode` action → `POST /verify` → HTTP-only cookies → redirect to `next` | `submitAuth` with `intent=verify`; same session handling |
| New code | "Use another email or request a new code": `window.location.reload()` (dead without JS, re-posts after a no-JS POST) | **Send a new code** (`intent=resend`, same address) and **Change email** (a link; with JS the address is kept) |
| Google | link → `/api/auth/google/start` (PKCE verifier and return path in 10-minute HTTP-only cookies) → Supabase `/authorize` → `/api/auth/google/callback` (exchange, cookies, redirect) | unchanged, plus a busy state; errors keep the return page and say "cancelled" or "could not be completed" |
| Errors | strings inline in the action; Google errors as `?error=google` | one message table, `lib/auth/messages.ts` |
| Session | `proxy.ts` refreshes tokens; `signOut` revokes at the provider and clears cookies | unchanged |

## 3. Shared primitives

Only what the form repeats is shared:

| Part | Was | Now | Uses |
|---|---|---|---|
| `AuthField` | label, hint, input and message written out twice, with hand-built `aria-describedby` | one component: label above, hint and error tied by `aria-describedby`, `aria-invalid` on the input, error as an alert | email, code |
| `AuthNotice` | `Notice`, private to the form | the same component, exported, with `role` derived from tone | 5 messages |
| `GoogleButton` | inline link | a link with a busy state | 1 |
| `Button` (shared) | `disabled` while loading | `aria-disabled`, refuses the press, keeps focus | all loading buttons |

They live in `components/auth/AuthParts.tsx`, not `components/ui`. The
enquiry, profile and posting forms each draw fields their own way today.
Unifying them is a posting-stage decision with its own style-diff, not a
side effect of the sign-in form.

The divider (`.login-divider`) is used once and stays CSS.

## 4. Validation

- **One rule, one wording.**
  - `emailProblem()` and `codeProblem()` use the existing
    `normalizeEmail` / `normalizeCode` rules.
  - The server action uses them as the authority.
  - The form uses them before sending, so a typo costs no round trip.
  - Rules are no stricter than before: plus addresses and long TLDs pass.
- **When:** on submit only. Nothing validates while typing. A message stays
  until the next attempt.
- **Where:**
  - A field error sits beside its field (`#auth-email-error`,
    `#auth-code-error`), referenced by `aria-describedby`, with
    `aria-invalid` on the input.
  - It is an alert, so it is heard even when focus is already in the field
    (Enter leaves it there).
  - It remounts per attempt, so the same mistake twice is announced twice.
- **Browser bubbles:** the forms are `noValidate`. Chrome's bubble was
  neither announced reliably nor styled, and disappeared. `type="email"`
  and `required` stay for keyboards and semantics.
- **Codes:** a pasted `123 456` or `123-456` is accepted (spaces and
  hyphens dropped); the rule is still exactly six digits. The field allows
  12 characters, because `maxLength=6` cut a pasted " 123456" to " 12345".

| Typed | Message |
|---|---|
| nothing | Enter your email address. |
| `buyer@` | Enter a valid email address, like name@example.com. |
| provider says `email_address_invalid` | This email address can’t be used to sign in. Check it for typos, or use another address. |
| empty code | Enter the six-digit code from your email. |
| `12345a` | The code is six digits, like 123456. |

## 5. Error mapping

`lib/auth/messages.ts` holds every sentence. The adapter now carries the
provider's machine-readable `error_code` on a failure (allow-listed to
`[a-z_]`). It is server-only, used only to choose a message, and the
provider's text never reaches the browser. A unit test fails if any
message mentions Supabase, OTP, tokens, HTTP or a status code.

| Situation | Category | Message | Where |
|---|---|---|---|
| 429 on `/otp` | rate limit | Please wait a minute before requesting another code. | form notice |
| 429 on `/verify` | too many attempts | Too many attempts. Please wait a minute, then try again. | form notice |
| ≥500, timeout, provider unreachable | temporary service problem | We couldn’t reach the sign-in service… / We couldn’t check the code right now… | form notice |
| wrong or expired code (Supabase cannot tell them apart: 403 `otp_expired` for both) | expired / invalid code | That code is invalid or expired. Check your email, or send a new code. | beside the code |
| `email_address_invalid` | invalid email | (above) | beside the email |
| any other refusal on `/otp` (unknown address on Log in, sign-ups closed) | — | **reported as a sent code**, so the form never reveals whether an account exists | status |
| fetch failed in the browser / offline | network problem | You seem to be offline. Check your connection and try again — what you entered is still here. | form notice |
| other client failure | unknown recoverable | Something went wrong on our side. Please try again. | form notice |
| Google `error=access_denied` | Google cancelled | Google sign-in was cancelled. You can try again or use your email. | top of form |
| Google: no session for any other reason | Google failure | Google sign-in could not be completed. You can try again or use your email. | top of form |
| `?error=` anything else | — | ignored, never echoed | — |

`ErrorState` is not used here. Every failure is recoverable in place, so
an inline message beside the form fits better than a section-level state.

## 6. Busy states

- **Shared `Button`.** While loading it is `aria-busy` and
  `aria-disabled`, and its click is cancelled.
  - Cancelling the click also cancels a form submission, including the
    implicit one Enter makes in a field.
  - Focus stays on the button. `disabled` had sent it to `<body>`
    (measured in Chrome before the change).
  - The label stays and the ring spins beside it. The auth buttons are
    full-width, so their width never changes.
  - The busy button now keeps its full colour (it was faded by
    `disabled:opacity-45`), with a progress cursor: busy is not
    unavailable.
  - Every `loading` user gets this: the sign-in form, `EnquiryForm`,
    `ProfileForm`, `ZeroResults`.
- **Form.** A synchronous in-flight guard plus `useTransition`. A second
  press, Enter, or a third press while busy sends nothing. A browser test
  measured one request for three attempts.
- **Spoken progress.** A polite status says "Sending your code…", "Sending
  a new code…" or "Checking your code…". The spinner is decoration.
- **After a successful code.** The action redirects, and the form stays
  busy until the next page replaces it, instead of flashing back to idle.
- **No new animation.** It is the existing ring, `animate-spin` on the
  existing tokens; under reduced motion the global rule stops it and the
  label still says what is happening. No Motion.

## 7. Google sign-in

- **Name and target:** the accessible name is exactly "Continue with
  Google". The button is 48px tall and full width, with a visible focus
  ring, and keeps Google's mark (`aria-hidden`).
- **It stays a link to the start route,** so it works before and without
  JavaScript.
- **Once pressed** it is `aria-busy` and `aria-disabled`, shows the ring in
  its right padding (the label never moves), and refuses a second press. A
  second start would replace the first attempt's PKCE verifier cookie
  mid-flight. Modified clicks (new tab) are left to the browser.
- **It re-arms itself:**
  - on `pageshow` from the back/forward cache (Back from Google);
  - after 10s, if the browser never left (Stop pressed, a stalled
    navigation). A press then is a retry, not a double press.
- **Errors:**
  - Cancelled and failed attempts are told apart (`access_denied`).
  - Both keep the page the visitor was heading for: `?next=` survives the
    round trip, so trying again still ends there. Before, it fell back to
    `/account`.
- Provider configuration, scopes and the redirect URL are unchanged. No
  OAuth credential is in client code or in this document.

## 8. Email flow

- **Labels and instructions:**
  - visible labels ("Email address", "Six-digit code");
  - a hint under each field ("We’ll email you a six-digit code…", "It can
    take a minute to arrive. If you can’t find it, check your spam
    folder.").
- **Autofill:**
  - Email field: `name="email" type="email" autocomplete="email"
    inputmode="email" enterkeyhint="send" autocapitalize="none"
    spellcheck="false"`.
  - Code field: `type="text" inputmode="numeric"
    autocomplete="one-time-code" enterkeyhint="go"`, so Safari can offer a
    code from Mail.
  - Why `email` and not `username`: this flow never submits a password, so
    password managers have no credential to store or offer. `email` lets
    the browser offer the visitor's own address.
- **Enter:** Enter submits each step.
- **Busy:** see §6.
- **New code:** "Didn’t get a code? **Send a new code**" asks again for the
  same address, says "a new six-digit code… Use the newest code", and moves
  focus to the code field. If the provider is throttling, the step stays
  and says so.
- **Change email:** returns to the email step. With JavaScript the address
  is kept and focused for correcting; without it, it is a fresh step.
- **Nothing typed is destroyed:**
  - a field error keeps the value;
  - a provider or connection error keeps both fields;
  - a no-JS round trip echoes the address back.
- The non-enumerating "If this address can sign in…" wording is kept.

## 9. Security review

| Finding | Severity | Action |
|---|---|---|
| **Open redirect via normalised return path.** `safeReturnPath` validated the raw string, then returned the parser's normalised pathname. `/.//x`, `/a/..//x`, `/%2e//x` became `//x`. Reachable through `/login?next=` (signed-in redirect), the code verification redirect, `proxy.ts`, and Google: `/api/auth/google/start?next=/.//evil.example` stored `//evil.example`, and the callback redirected to `http://evil.example/` after a successful sign-in. | **High** (phishing after a real sign-in) | Fixed in `fbaa983`: the normalised pathname is checked too. Unit tests plus an `auth-check` assertion on the stored cookie. |
| Google errors dropped `next` | low (UX) | fixed (§7) |
| Double-press on Google could replace the verifier cookie mid-flight | low | busy state (§7) |
| Duplicate code requests: a second request could hit 429 and report "please wait" though the first succeeded | low | in-flight guard (§6) |
| Provider error text reaching the page | none found | the table makes it structural |
| Credentials in client code | none | tokens stay in HTTP-only cookies (`auth-check`). `SUPABASE_PUBLISHABLE_KEY` is read server-side only. |
| Callback parameters | sound | code length-capped, verifier pattern-checked, Host compared with the fixed origin, redirects built only from `AUTH_SITE_URL` |
| Provider URL construction | sound | `URL` + `searchParams`, fixed `redirect_to` |
| `?error=` reflection | none | only the two known values map to text |

No architecture migration was needed or done.

## 10. Keyboard and focus

Measured by `login-check` with the keyboard only:
- **Tab order:** Google → email → Send sign-in code → Create an account.
  On the code step: Change email → code → Verify → Send a new code →
  Create an account.
- **Visible focus** on every control (2px ring).
- **Enter** submits each step.
- **Focus after an error:** the field at fault, with the code selected for
  retyping.
- **Focus after sending:** the code field.
- **Errors about the attempt** (busy provider, offline) leave focus where
  it was; their alert is announced there.
- **The scene:** 40 Tab presses never land in it, and it contains nothing
  focusable.
- **Escape:** nothing to dismiss on this page (no dialog). The header's
  menus keep their own Escape behaviour, untouched.

## 11. Without JavaScript

The whole email flow works as plain form posts, checked end to end by
`login-check`:
1. The page renders with label, hint, Google link and scene.
2. A malformed address gets the server's error beside the field, value
   kept, field focused (`autoFocus`).
3. The code step is announced, with the code field focused.
4. A wrong code stays on the code step with its error.
5. "Send a new code" works.
6. The right code, pasted with a space, signs in and returns to `next`.

**Google:** works without JavaScript, because it is a link and the routes
are server-side; only its busy state needs JavaScript.

**Change email:** without JavaScript it is a link to a fresh step; keeping
the address needs JavaScript.

**What needs JavaScript, and why:**
- the pre-send field check (the server does the same check);
- the duplicate-press guard (a native double POST makes the second request
  cancel the first navigation);
- catching an offline submit (without JavaScript the browser shows its own
  offline page and Back restores the form).

No logic is duplicated: the client calls the same server action.

## 12. Touch targets and mobile

`login-check` hit-tests every link, button and input in the card at
320/360/375/390/412/430/768/1280, on the email step and on the code step
with an error. The test checks the corners of a 44px square around each
centre, as in UI-05.

| Control | Before | After |
|---|---|---|
| Create an account / Log in (inline) | 22px line | 44px+ to the finger (`py-3 -my-3`), one line to the layout |
| Change email | n/a (was a 44px reload button) | 44px |
| Send a new code | n/a | 44px (`Button` md) |
| Google, Send / Verify, fields | 48 / 48 / 48–56px | unchanged |

Also measured:
- no horizontal overflow on either step;
- errors wrap inside the card at every width;
- field text stays 17px, so phones do not zoom;
- the existing keyboard-open checks (390×480, 360×400: field on screen and
  uncovered) still pass;
- the scene is unchanged at every width.

## 13. Motion, Kokonut, Anime.js, Bklit

- **Motion:** none. No transition in UI-07 needed more than the existing
  CSS. The spinner is a CSS ring, and messages appear without animation, as
  alerts should.
- **Kokonut UI** (`bb9120f`, the full component list reviewed): there is
  no form, input or one-time-code component.
  - `loader` is an 80–160px decorative page loader, not a button state.
  - `hold-button`, `slide-text-button`, `gradient-button`,
    `particle-button`, `v0-button` and `attract-button` are novelty
    interactions that would slow a sign-in.
  - None shipped.
- **Anime.js:** not installed. **Bklit UI:** not used.

## 14. Verification

| Check | Result |
|---|---|
| `npm run verify` | lint, types, **641** in 72 files unit tests (new: messages 6, validation +2 cases) |
| `npm run build` | passes |
| `login-check` (no auth configured) | 117 (unchanged: the honest "unavailable" state and the scene) |
| `login-check` (Auth simulator) | **179** (UI-06: 138). New: no-JS flow, keyboard flow, scene never focused, offline, duplicate presses, busy focus, Google state and re-arm, 44px targets on both steps at eight widths, error wrapping |
| `auth-check` | **42** (UI-06: 38) (adds: cancelled Google keeps `next`; three crafted return paths stored as `/account`) |
| `ui-check`, `motion-check` | 128 / 89 |
| `notfound-check` | 36 (scene fingerprint and timing) |
| rest of the suite | all pass with UI-06's counts: phase-e 64, moderation 34, users 92, listing 23, dashboard 72, performance 102, admin 124, description 28, preview 24, shots (no overflow), light-check, search 64, calculator 43, shell 355, pricing 46, post 87, draft 27, photo 31 |
| fingerprints (`protected-scenes.test.ts`) | unchanged; no protected file in the diff |
| style-diff UI-06 → UI-07 | below |

**Checks changed, and why:**
- **`login-check`**
  - Messages that UI-07 rewrote are asserted with the new wording.
  - "busy and disabled" became "busy, unavailable and keeps focus". That is
    stronger: the old assertion encoded the focus loss.
  - "rejected by the server" moved to the no-JS section, where only the
    server can reject.
  - "Use another email…" became Change email and Send a new code.
  - The unknown-`?error=` check looks inside the card, because Next's own
    route announcer also has `role="alert"`.
  - Nothing was removed.
- **`style-diff`** gains the configured sign-in screens:
  - `login-configured`, `login-register-configured`;
  - `login-google-error`, `login-email-error`, `login-code-step`.

  Two captures of the UI-06 build compared identically: 58 screens, 0
  differences.

**Known failures:** identical failure points to UI-06, compared line by line: `home-check` (locally only; `home-check.mjs:200`, passes in CI), `property-check` (the same two assertions), `media-check` (the same fallback case), `lead-check` (`lead-check.mjs:70`), `saved-check` (`saved-check.mjs:61`). None was modified.

## 15. Bundle (gzip, vs UI-06)

| Route | KB | Δ |
|---|---|---|
| Login | 170.5 | **+1.33** (form logic, message table, AuthParts) |
| Home | 176.9 | +0.03 |
| Search | 178.6 | +0.08 |
| Property | 176.2 | +0.08 |
| Not found | 176.9 | +0.03 |
| Seller dashboard (upper bound) | 180.1 | +0.08 |
| Admin overview (upper bound) | 178.2 | +0.03 |
| Activity (guest) | 167.7 | 0 |

The small shared deltas are the `Button` busy change. Motion still ships
nowhere.

## 16. Intentional visual changes (style-diff UI-06 → UI-07)

Captured with the five new configured sign-in screens. Two captures of
the UI-06 build first compared identically (58 screens, 0 differences).
The raw report lists 48 changes on 2,243 element-properties.

**Path artefacts.** style-diff pairs elements by DOM path (tag plus
index). UI-07 inserts a screen-reader status `<p>` before the divider, so
every later `<p>` in the card pairs with a different element. That is
where the reported colour, font and margin "changes" on the divider and
footer come from. Re-paired by label, the email step of
`login-configured` and `login-register-configured` is
**pixel-identical**, at 390 and 1280: Google button, field, button, card
height (465 / 544.5px).

**The real changes, all in the sign-in card:**

| Change | Where | Measured |
|---|---|---|
| "Create an account" / "Log in" hit area | every sign-in screen | text line unchanged (125.5px wide, same x); box 19 → 47px tall, the extra 14px each side handed back by negative margins |
| Field error beside the email field, red 2px field border | email error | card +48px. UI-06 never showed this state: Chrome's bubble blocked the submit. |
| Google failure message shorter | Google error | notice 90 → 70px (shorter copy, one line fewer) |
| Code step: hint under the code field, address row with Change email, "Didn’t get a code? Send a new code" row in place of the full-width reload link | code step | card +84px at 390. Code field still 56px, Verify still 48px. |
| Busy buttons keep full colour (no 45% fade), progress cursor | while busy | not captured (transient); asserted in `login-check` |

**The scene:**
- markup hash identical on all twelve sign-in captures;
- every non-UI `@keyframes` rule identical;
- the scene's elements move only where the card beside them grew. On the
  code step at 1280 the art column is 796.5px tall (UI-06: 744.5px),
  because from 1024px its height follows the form column (min 660px,
  `align-items: stretch`). UI-06's code step already stretched it past
  the minimum. The scene's markup, CSS and timing are untouched; it fills
  the taller frame by its existing rules. The email step, where most
  visits stay, is pixel-identical.

**Outside the sign-in card:**
- `admin-system @390` and `admin-moderation @390` show caption lines
  rewrapping (16px). Those captions are wait durations: "The oldest
  submission has waited 3 days 1 hour", "Waiting 1 hour". They are
  computed from the real clock against the simulator's fixed fixture
  times, and between the UI-06 capture (04:42 UTC) and this one (05:08)
  they crossed an hour, so the text got longer.
- No admin file is in the UI-07 diff, and the shared `Button` renders
  identically when not loading.
- A second UI-07 capture in the same hour compared identically (58
  screens, 0 differences). A style-diff improvement for later: anchor
  those durations to the fixture clock.
- No other screen changed: home, search, property, 404, posting,
  calculators, activity, dashboard, admin listings.

## 17. Protected login scene

1. No file under the fingerprints changed: `WayHomeScene`, `StreetPeople`,
   `ScenePlayback`, `way-home.css`, the protected rules in `login.css` and
   `globals.css`. `login.css` is not in the diff at all.
2. `protected-scenes.test.ts` passes with the UI-03 hashes.
3. style-diff reports the scene markup hash and every non-UI keyframe
   identical on every login screen, including the new configured ones.
4. `login-check`'s scene assertions all pass, both runs:
   - layout, CLS, the story beats at their times;
   - the loop seam, collisions, off-screen pause;
   - the reduced-motion still picture.
5. 404: `notfound-check` passes with its fingerprint and timing.

## 18. Remaining risks

- **The 10s Google re-arm** is a judgement. On a connection slower than
  that, a second press would start a second attempt. That is harmless: the
  last attempt wins and the earlier verifier is replaced.
- **Busy `Button` keeps full colour.** Some will expect a faded button;
  the spinner and cursor carry the state. It changes the look of every
  loading button (enquiry, profile, zero results), by design.
- **Supabase returns one answer for a wrong and an expired code,** so the
  message must name both.
- **`autoFocus` after a no-JS post** scrolls the field into view on a
  phone, past the banner. That is intended (it is the task), but it is a
  change from a page that used to open at the top.
- **Field parts are auth-local.** Three other forms still draw their own
  fields.

## Recommendation for UI-08 — Property details

UI-01 §6 item 8, now that search and cards are done:

1. **Gallery and lightbox:**
   - the UI-06 fade and Radix lightbox already exist;
   - review swipe affordances and thumbnails at 320–430;
   - check focus return on close with `motion-check`.
2. **Price, area and key facts** through `PriceDisplay` / `AreaDisplay` (no
   new formatting). Check the hierarchy against the card's.
3. **Enquiry form:**
   - apply what UI-07 established (field parts, message table, busy and
     offline handling, no-JS);
   - decide whether `AuthField` becomes a shared `FormField` (posting forms
     follow later).
4. **Known `property-check` failures:** investigate the two pre-existing
   assertions before touching the page. They predate UI-04 and must not be
   worked around.
5. CSS first. Measure Motion only if a sticky contact bar or section reveal
   needs it.

Out of UI-08: the seller workspace, charts, Anime.js, the login and 404
scenes.
