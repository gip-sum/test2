# UI-12 — Buyer forms and public form consistency

Status: complete, 18 October 2026, on `main`. Builds on UI-01 to UI-11
([UI-11](UI-11-admin-workspace.md)).

UI-12 brings the buyer-facing forms onto the form, button, focus and
accessibility rules that UI-07, UI-09 and UI-11 set for sign-in, the seller
workspace and the admin console.

- **The enquiry form** uses the shared field frame:
  - errors sit beside their fields, behind a summary that takes focus;
  - the busy button keeps focus and refuses a second press;
  - the confirmation takes focus;
  - a lost connection keeps everything typed. Before, it threw the
    property page into its error boundary.
- **No JavaScript:**
  - the enquiry form still posts, returning errors or the confirmation;
  - phones now get the form inline, where before it was reachable only
    through a sheet that needs JavaScript.
- **The profile form** uses the shared fields:
  - errors appear at their field;
  - a failed save keeps the change being made. Before, React reset the
    fields to the saved profile.
  - focus lands on the confirmation after a save.
- **Saved list:**
  - removing a home hands focus to the next home and announces the
    removal. Before, focus fell to `<body>` on every removal.
  - the remaining cards glide to their new cells with the UI-08 FLIP,
    using no Motion.
- **Buttons:** a `text` Button variant for the ten public and workspace
  text actions. The zero-results exits became links. Handwritten buttons go
  from **39 to 27**.
- **Checks:**
  - `lead-check` and `saved-check` failed locally only because they
    targeted the wrong server. Both now pass and run in CI for the first
    time.
  - `property-check`'s two enquiry failures were a wording that never
    existed.

Unchanged:
- the enquiry business logic, validation rules, privacy behaviour and server
  actions;
- the profile data model (no schema change);
- authorization.

No new dependency, no Motion, no Kokonut, Bklit or Anime.js. The login and
404 scenes are untouched.

---

## 1. Scope

In:
- the property enquiry form (demo-fixture and real-listing paths);
- the account profile form;
- public text-action buttons;
- the `lead-check`, `saved-check` and `property-check` local failures;
- Saved-list removal continuity;
- Copy link;
- mobile sizing and autofill on these forms.

Out:
- page redesigns;
- the sign-in form (UI-07);
- seller and admin forms (UI-09, UI-11);
- business-rule changes;
- new entities or columns.

## 2. Audit findings (UI-11 state)

| Area | Finding |
|---|---|
| Enquiry form | Already a server action through `useActionState`, so it posted without JavaScript on desktop. Hand-wired labels and errors at 15px. No error summary. The confirmation replaced the focused button, so focus fell to `<body>`. A network failure during the action threw into the property page's error boundary, losing the message. |
| Enquiry on phones | The sidebar card is `hidden lg:block`; below 1024px the form lives only in a sheet opened by a client button. **Without JavaScript a phone had no enquiry form at all.** |
| Profile form | Errors had no field: one sentence under the button. A failed save **lost the change**: React resets an action form's fields to their defaults after the action, and the defaults were the saved profile. 44px controls. |
| Saved list | Removing a home refreshed the page; the card vanished, the rest snapped into place, and focus dropped to `<body>` (11 of 11 runs, §10). |
| Zero results | The relaxation and Clear all buttons called `router.push` in a transition and were `disabled` while pending, so focus fell to `<body>`. Without JavaScript they did nothing, although each was just a URL. |
| Text actions | Ten handwritten underlined buttons (Reload status, Try again, Withdraw, Copy link, Retry save, Sign out…), with no shared size or focus treatment. |

## 3. Enquiry form

`components/enquiry/EnquiryForm.tsx`.

**Fields** through `FormField`:

| Field | Label | Semantics |
|---|---|---|
| name | Your name | `autocomplete="name"` |
| phone | Mobile number | `type="tel"`, `inputmode="tel"`, `autocomplete="tel"`; hint "10-digit Indian mobile number. Only the seller of this property sees it." |
| message | Message (optional) | `textarea`, optional marker |

- All three are 16px and at least 48px tall (`fieldControlClass`), with
  visible labels.
- No email field, as before: a seller in this market calls back.
- `maxLength` attributes are gone. A browser silently truncated pasted text
  that the server would have reported; the server rule now speaks instead.

**Two paths, one action** (the UI-07 sign-in pattern). The form keeps
`action={formAction}` from `useActionState(submitEnquiry)`.

Without JavaScript it is an ordinary POST:
- the page returns with errors beside their fields and every value typed;
- or it returns with the confirmation.

With JavaScript, `onSubmit` cancels the native submit, so React skips the
form action and does not reset the fields. It then:
1. checks the fields with `validateEnquiry`, the server's own function and
   wording, so a typo costs no round trip;
2. refuses a second submit while one is in flight, through a ref set
   synchronously (two events in one frame cannot both pass) and through the
   busy `Button`;
3. calls `submitEnquiry` itself. A request that never reached the server
   (`catch`) becomes a message above the form, with every field intact:
   - offline: "Your enquiry was not sent. Check your connection and try
     again; what you typed is still here.";
   - otherwise: "Your enquiry could not be sent. Please try again; what you
     typed is still here.".

The server still decides everything: listing identity, seller assignment,
duplicates, rate limits and storage.

**Errors.**
- **Summary:** a `role="alert"` box above the fields, titled "Please check
  the form" or "Your enquiry was not sent".
  - It links each message to its field.
  - It takes focus after every failed attempt, including the same error
    twice. Without JavaScript it gets focus through `autoFocus` on the
    returned page.
- **Field errors:** each field also shows its error, with `aria-invalid`
  and `aria-describedby` pointing at the error and hint.
- **No validation while typing.**
- **Server refusals** (unknown listing, storage unavailable, rate limit)
  appear in the summary with the server's sentence. No technical detail
  reaches the page.

**Busy.**
- The `Button` is `aria-disabled` and `aria-busy` and refuses presses; it
  is never `disabled`, so focus stays on it.
- Its label becomes "Sending…" at the same size.
- A visually hidden status says "Sending your enquiry.".
- `lead-check` counts requests: a second press during a delayed send sends
  nothing.

**Success.**
- The confirmation (`role="status"`, `tabIndex=-1`) replaces the form and
  focuses itself on mount, so it is read out and focus does not drop.
- No animation.
- It states only what the database confirmed:
  - "Enquiry sent", or "Enquiry sent again" for a repeat;
  - whether an assigned seller has it in their inbox.
  
  It makes no response-time promise.

**Phones without JavaScript.** Both property pages
(`app/property/[handle]`, `app/listing/[id]`) render the contact card inside
`<noscript>` below 1024px. With JavaScript that markup is inert; without it,
a phone gets the same server-action form inline.

## 4. Profile form

`components/account/ProfileForm.tsx`, `app/account/actions.ts`,
`lib/account/validation.ts`.

**Fields.** `FormField` with `fieldControlClass`, 16px and 48px:

| Field | Semantics |
|---|---|
| Full name | `autocomplete="name"` |
| Contact number (optional) | `type="tel"`, `inputmode="tel"`, `autocomplete="tel"`; hint "Saved for your account. This number is not verified or shared with sellers." |
| I am interested in | select |
| Preferred locality | select |

The email-updates checkbox keeps its 44px row.

**Validation.**
- `validateProfile` now returns which field a failure belongs to; the
  wording is unchanged.
- The action returns `{ status, message, field, values }`. `values` echoes
  what was typed on any failure.
- The same function runs on the client before sending.

**Behaviour.** The same two paths as the enquiry form.
- **Without JavaScript:** a failure returns the page with the message at
  its field, that field focused (`autoFocus`) and every value kept.
- **With JavaScript:**
  - Save keeps focus while busy ("Saving…", with "Saving your details." in
    the status) and refuses a second press;
  - a field error focuses its field;
  - a whole-form failure is an alert beside the button, with focus left on
    Save;
  - a success focuses the status line (`#profile-status`, `role="status"`),
    which reads "Your account details have been saved.".
- **Refresh:** the action already calls `revalidatePath('/account')`, so
  the page refreshes in place in the same response. Nothing reloads.
- **Offline or unreached:** "Your changes were not saved. Check your
  connection and try again; they are still here."

**Security.** `updateProfile` writes only for `getVerifiedUser()`. The form
carries no user id. Without a session it returns "Your session has ended…"
and keeps the values. There is no schema change.

## 5. Shared form-field adoption

Every buyer form control is now on `FormField`, `fieldControlClass` or
`FormCheckbox`:
- the enquiry form's three fields;
- the profile form's four fields;
- Copy link's manual fallback field, now the shared 16px control, because a
  13px field zooms the page on iPhone when it takes focus.

With this, the sign-in, posting, seller workspace, admin and buyer forms all
share one frame.

## 6. Focus and busy behaviour

| Action | While busy | After |
|---|---|---|
| Send enquiry | button keeps focus, refuses presses, "Sending…" | confirmation focused and announced; on failure the summary is focused |
| Save profile | Save keeps focus, refuses presses, "Saving…" | status focused and announced; field error focuses the field; whole-form failure keeps focus on Save |
| Remove from Saved | heart keeps focus (UI-08 busy heart) | focus moves to the next home's heart (then the previous, the count, or the empty shortlist); "*Title* removed from your saved properties." announced |
| Copy link | — | focus stays on the button; "Link copied" in a status that is cleared first so a repeat is announced; if the clipboard refuses, the link appears selected in a field to copy by hand (never a silent "copied") |
| Zero-results exits | — | they are links now: ordinary navigation, nothing disabled under the keyboard |

## 7. Validation

- **Wording.** Client and server use one function per form
  (`validateEnquiry`, `validateProfile`), so the wording cannot drift. The
  rules are no stricter than before; the one change is removing the
  browser's silent `maxLength` truncation.
- **When.** Validation runs only on submit, never while typing.
- **Where.** Each error appears at its field, tied with `aria-invalid` and
  `aria-describedby`. The enquiry summary links to each field.
  `lead-check` proves a summary link moves focus into its field.
- **Rejected without a request.** An invalid enquiry sends nothing.
  `lead-check` counts the requests.

## 8. Failure recovery

| Failure | Enquiry | Profile |
|---|---|---|
| Offline | message above the form, values kept (`lead-check`, via `context.setOffline`) | alert beside Save, change kept (`auth-check`) |
| Network failure / server unreachable | "could not be sent… still here", values kept | "could not be sent… still here", change kept |
| Temporary service error (503) | the server's "Your enquiry could not be saved. Please try again.", values kept | "We could not save your profile. Please try again.", change kept, focus on Save (`auth-check`) |
| Server rejection | the server's field or listing message (`lead-check`: tampered listing id refused) | the server's field message |

No failure replaces the page, and none shows technical detail.

## 9. Buttons

**A `text` variant** (`components/ui/Button.tsx`):
- `bg-transparent text-current border-transparent underline
  underline-offset-4 hover:decoration-2`;
- `min-h-11 px-0`: 44px tall, the text's own width;
- colour from the call site (`text-brand-700`, `text-danger-600`,
  `text-ink-900`).

There are ten genuine uses, which the brief's bar for a new variant
requires.

| Control | File | Decision |
|---|---|---|
| Try again | `drafts/ReloadDraft` | `Button text` |
| Reload status | `listings/LifecycleActions` | `Button text` |
| Withdraw, Reload dashboard | `dashboard/WithdrawAction` | `Button text` (×2) |
| Reload preview | `preview/ConfirmPreview` | `Button text` |
| Discard unsent edits, Retry save, Keep account version | `drafts/DraftEditor` | `Button text` (×3) |
| Copy link | `dashboard/CopyLink` | `Button text` |
| Sign out | `app/account/access` | `SubmitButton text` (a server-action form) |
| Remove a filter / Try another locality (×n), Clear all | `search/ZeroResults` | **links** (`<Link href>`): they change the URL, so they are links first. `ZeroResults` is now a server component. |

**Count** (`lib/design/button-count.test.ts`, same method as UI-05 to
UI-11):
- baseline **39**, migrated **12**, remaining **27**;
- ceiling lowered to 27.

| Remaining | Count | Why it stays |
|---|---|---|
| Navigation toggles (`MarketplaceMenu` ×5, `HeaderNav` ×2) | 7 | disclosure/menu semantics and their own styling |
| Search and filter controls (`SearchPanel` ×4, `LocationField` ×2, `FilterControls` ×2, `SearchLayout` ×1) | 9 | combobox, segmented and sheet controls |
| Gallery controls (`Gallery`) | 6 | specialised media controls |
| Save heart (`SaveButton`) | 1 | specialised toggle with its own busy and focus rules |
| Home hero (`HomeHero`) | 2 | the search launcher and its tab |
| Read more (`DescriptionBlock`) | 1 | an inline disclosure inside text |
| Delete listing (`LifecycleActions`) | 1 | a danger outline; one use, no variant |

## 10. Saved list

**Investigation.** The UI-08 deferral was a real, user-visible problem,
confirmed on UI-11:
- the removed card vanished on refresh and the cards after it jumped one
  cell;
- focus fell to `<body>` in 11 of 11 measured removals.

It was unrelated to the `saved-check` failure (§12).

**Fix.**
- `components/account/SavedGrid.tsx` is a small client leaf. When the heart
  announces a confirmed removal (`gb:saved-removing`), it measures every
  card. After the refreshed list renders, it plays one Web Animations
  transform per moved card (`lib/motion/flip.ts`, UI-08).
- The DOM is already in its final order, so pointer and focus targets never
  lag the picture.
- **No Motion:** `layout` measured +42.6 KB and slower clicks in UI-08.
- **Reduced motion:** nothing plays (`saved-check` counts zero animations).
- **No premature removal:** the card leaves only after the server confirms.
  On failure it stays, its heart keeps focus and the error is shown
  (`saved-check`).
- **Focus:** before refreshing, the heart registers
  `afterRefresh(next, previous, count, empty)` with the announcement. The
  page renders `<RestoreFocus>`.
- **Bundles:** `after-refresh` is imported dynamically by the heart, so
  public pages carry only a lazy-chunk reference (§13).

## 11. `lead-check` root cause

**Symptom.** UI-10 and UI-11 failed at line 70, waiting for "Enquiry sent".

**Cause.**
- The script defaulted to `http://127.0.0.1:3100`, the public app, which
  has no Supabase configured. The enquiry RPC was unreachable, the product
  correctly refused, and the wait timed out.
- The check owns the simulator on 3300, but only an app started against it
  (3101 in CI) talks to it.
- Every simulator-backed check in CI is given `BASE_URL=http://localhost:3101`
  explicitly. `lead-check` was **never in CI**, so nobody noticed the
  default.
- Same browser (Chromium 1194) and same behaviour on both builds, so it was
  neither timing nor a product change.

**Second, hidden failure.** Pointed at 3101, the UI-11 build gave 14/15:
- "seller inbox shows assigned lead" used `getByText('Follow-up').first()`;
- at 390px the first match is the inbox's column-header row, hidden below
  1024px, so `isVisible()` was false;
- the lead itself rendered correctly, so it was a test defect.

**Fix (test only).**
- The default is now 3101, with a comment.
- The inbox assertion is scoped to the lead's `article` and its
  "Follow-up ·" line: stricter, since it names the element.
- No timeout changed.

**Added coverage.** 41 assertions:
- field size, labels and autofill;
- refusal of invalid input with the request count;
- summary focus and links;
- field ARIA, server wording and values kept;
- keyboard busy with one request for two presses;
- the confirmation focused as a status;
- no seller key in the request;
- offline;
- tampered listing refused;
- 8 widths;
- no-JS error and success at 390.

**Stability.** Passed in every local run since the fix, including back-to-back runs on the same server.

## 12. `saved-check` root cause

**Symptom.** It failed at line 61, waiting for "Remove … from saved".

**Cause.** The same default URL:
- on the public app, auth is not configured;
- saving sends a guest to sign in, so the heart never becomes "Remove";
- pointed at 3101, the UI-11 build passed 14/14.

It was **not** related to the UI-08 jump, which was real but separate
(§10).

**Fix (test only).** Default 3101, with a comment.

**Added coverage.** 24 assertions:
- 8 widths;
- the removal flow by keyboard:
  - focus to the next heart;
  - announcement and count;
  - at least one FLIP animation;
  - focus to the empty shortlist after the last;
- reduced motion with zero animations;
- a failed removal keeps the home and focus.

Both checks now run in CI (`verify.yml`, `BASE_URL=http://localhost:3101`).

**`property-check`** (not in CI) failed "valid enquiry does not claim
success…" and "form submits without JavaScript".
- **Cause:** both waited for "temporarily unavailable", a sentence no
  enquiry path has ever produced. The check failed from the commit that
  wrote it (verified against that commit's `lib/enquiry/queries.ts`).
- **Fix:** they assert the real refusal, that nothing claims success, and
  that the typed values survive, with and without JavaScript.
- **Result:** 67/67 on UI-11 and UI-12.

## 13. Mobile results

| Check | Result |
|---|---|
| Enquiry controls: font size | 16px |
| Enquiry controls: height | ≥ 48px |
| Enquiry targets | ≥ 44px at 320, 360, 375, 390, 412, 430, 768 and 1280 (sheet below 1024, sidebar above); no horizontal overflow (`lead-check`) |
| Profile controls | 16px / 48px; targets ≥ 44px and no overflow at the eight widths (`auth-check`) |
| Saved list | no overflow at the eight widths (`saved-check`) |
| Text Buttons | 44px tall (`min-h-11`) by the variant itself |
| `shots` | no horizontal overflow at any width |

## 14. Motion, Kokonut, Bklit, Anime.js

| Library | Decision |
|---|---|
| **Motion** | Not used. Saved continuity reuses `flip.ts`; the brief's "build the lightweight version first, compare against Motion" was already measured in UI-08 (`layout`: +42.6 KB, slower clicks). Success states do not animate. Motion still has no production consumer, which is acceptable. |
| **Kokonut** | None. No Kokonut form component addresses a problem here better than the shared `FormField`. SmoothTabs remains the only adapted component. |
| **Bklit** | Not applicable; no charts. |
| **Anime.js** | Not installed; no timeline or SVG sequence. |

## 15. Bundle and performance (vs UI-11)

**Client JS.** From served HTML, gzip, two builds side by side:
- public routes as a guest;
- account routes with a simulator session (`bundle-report` now includes
  them).

| Route | UI-11 | UI-12 | Δ | Why |
|---|---|---|---|---|
| **Property details** | 181.49 KB | 182.89 KB | **+1.40 KB** | enquiry form logic and field frame |
| **Account profile** | 171.72 KB | 173.25 KB | **+1.53 KB** | profile form's two-path logic (page chunk 2.13 → 3.63 KB) |
| **Saved homes** | 171.86 KB | 173.01 KB | **+1.15 KB** | `SavedGrid` and `flip.ts` (page chunk 2.28 → 3.39 KB) |
| Search ×3 | 183.13 KB | 182.40 KB | **−0.73 KB** | `ZeroResults` is a server component |
| Home, 404 | 181.30 KB | 181.36 KB | +0.06 KB | the save heart's removal hand-off |
| Login | 174.63 KB | 174.72 KB | +0.08 KB | the `text` variant in `Button` |
| Seller dashboard / performance | 185.03 KB / 184.70 KB | 185.12 KB / 184.76 KB | +0.09 / +0.06 KB | `text` variant |
| EMI calculator, Activity | 176.64 KB / 171.86 KB | 177.05 KB / 172.11 KB | +0.41 / +0.25 KB | shared-chunk reshuffle; Activity's cards carry the heart |

**Leakage.**
- In public route chunks (Home, Search, Property, 404, Activity) the heart
  contributes only its `[data-flip-key]` selector, the event name and a
  lazy `import()` reference to `after-refresh`. That chunk is fetched only
  after a confirmed removal on the Saved page.
- `flip.ts`, `SavedGrid` and the announcer code are absent from every
  public chunk.
- No form, admin or Motion code reached Home, Search, Login or 404.

**Runtime.** 390px, 4× CPU, 11 interleaved runs (medians):

| | UI-11 | UI-12 |
|---|---|---|
| Enquiry: press → confirmation | 261 ms | 241 ms |
| Enquiry: longest event | 88 ms | 80 ms |
| Profile: press → "saved" | 569 ms | 575 ms |
| Profile: server action round trip | 80 ms | 60 ms |
| Profile: longest event | 88 ms | 72 ms |
| **Saved removal: press → card gone** | **523 ms** | **428 ms** |
| **Saved removal: focus on `<body>` afterwards** | **11 of 11** | **0 of 11** |
| TBT: property / account / saved / dashboard | 510 / 474 / 439 / 412 ms | 508 / 401 / 444 / 356 ms |
| TBT: Home / Search / Login / 404 | 858 / 588 / 481 / 445 ms | 920 / 610 / 488 / 412 ms |
| CLS, every page | 0 | 0 |

Submit timings are within noise. One run showed Home FCP 292 → 488 ms, but
the previous run showed the reverse. A dedicated Home run (21 interleaved)
settled it:

| | UI-11 | UI-12 |
|---|---|---|
| FCP | 312 ms | 296 ms |
| TBT | 765 ms | 764 ms |

The FCP spread was 200–700 ms on both builds. No regression.

## 16. Security

| Promise | Evidence |
|---|---|
| An enquiry cannot target an arbitrary seller or listing | The form carries only the listing's public id (or a real listing id). The server resolves the listing and its seller itself; no seller field exists. `lead-check`: a tampered `listingPublicId` is refused, and no seller key appears in the request. |
| Profile writes affect only the signed-in user | `updateProfile` uses `getVerifiedUser()`; the form carries no id (`auth-check`: profile writes counted). |
| Server authoritative | Client validation is the server's function. The server re-validates every request; the JavaScript path calls the same action. |
| No technical errors leak | Every failure is a sentence (§8); caught exceptions become the offline/unreached messages. |
| No unsafe redirects | UI-12 adds no redirect. The `safeReturnPath` unit tests (`lib/auth/validation.test.ts`, in `verify`) and `auth-check`'s crafted return paths (`/.//evil.example`, `/a/..//evil.example`, `/%2e//evil.example`, an off-site `next`) are green. |

## 17. Style-diff

New screens:
- `property-enquiry-sheet @390`;
- `property-enquiry-error @1280`;
- `account-profile @390/1280`;
- `account-profile-error @390`;
- `account-saved @390/1280`.

The simulator now returns two saved homes for the owner. Capturing UI-12
twice gives no difference except the known `.guest-activity` margin
reading (box identical; recorded since UI-06).

**UI-11 → UI-12, every difference explained:**
- **Enquiry fields:**
  - 15 → 16px, 12px vertical padding;
  - border `border-subtle` → `border-strong`;
  - label margin from the frame;
  - the new hint;
  - the trailing caption and the sr-only status re-pathing.
- **Enquiry error:** the summary with links, field errors under each field
  with a 2px danger border.
- **Profile:**
  - controls 44 → 48px (`min-h-11` → `min-h-12`), via the shared frame;
  - the hint as a shared hint;
  - the error at its field instead of under the button.
- **Dashboard:** the Withdraw and Reload text actions on `Button text`:
  - a 1px transparent border (+2px width);
  - the shared colour transition;
  - 8px gap.
- **Search zero:** `button` → `a`, same look.
- **Saved:** every card re-paths under its new `div[data-flip-key]`
  wrapper. Compared by element, every card's box and style are identical.
- **Hero image URL** differs by server port, as in every stage.
- **Login and 404 scenes:** markup, `@keyframes` and timing identical on
  every login and not-found screen.

## 18. Tests and checks

| Check | UI-11 | UI-12 |
|---|---|---|
| `npm run verify` (lint, types, unit) | 670 | **672** (`text` variant; profile field mapping) |
| `lead-check` | failed (line 70) | **41/41**, now in CI |
| `saved-check` | failed (line 61) | **24/24**, now in CI |
| `auth-check` | 48 | **63** (profile: sizing, autofill, validation focus, busy, one write, success focus, failure, offline, no-JS, 8 widths) |
| `search-check` | 64 | **65** (zero-result exits are links) |
| `property-check` (not in CI) | 65/67 | **67/67** |
| Rest of the CI suite | — | all unchanged: phase-e 64, moderation 61, users 170, listing 23, dashboard 124, performance 225, admin 286, description 28, preview 24, draft 27, photo 48, login 117 / 179, shots, light-check, calculator 43, shell 355, motion 101, ui 128, pricing 46, post 89, notfound 36 |
| Copy link (scripted browser probe, not committed) | — | 12/12: 44px; "Link copied" in a status with focus kept and the public URL on the clipboard; with the clipboard refused, no "copied", the link selected in a focused 16px field, no overflow |

## 19. Known failures remaining

| Check | State |
|---|---|
| `home-check` line 200 (passes in CI) | unchanged; local-only, as recorded in UI-10 and UI-11 |
| `media-check` 25/26 "failed image shows clear fallback" (not in CI) | unchanged on UI-11 and UI-12; outside UI-12's scope |

## 20. Remaining risks

- **Two submit paths.** The enquiry and profile forms call their server
  action directly with JavaScript and through the form action without it.
  Both run the same server function. A future change to the action's
  return shape must keep `values` and `field`, or the no-JavaScript path
  loses them. The browser checks cover both.
- **`<noscript>` form.** It adds a second, inert copy of the contact card
  to the markup on property pages. Only one is ever reachable.
- **FLIP on Saved** depends on the `gb:saved-removing` event arriving before
  the refresh. If the heart stops dispatching it, the list loses continuity
  but never correctness.
- **The `text` variant takes colour from its call site.** A missing colour
  class renders in the inherited text colour.

## 21. Recommendation for UI-13 — Search and discovery controls

The largest group of handwritten controls left is search and filter (9
buttons), with navigation toggles next (7). Both sit on the most-used
pages. Recommended UI-13:

1. **Search panel and filter controls** (`SearchPanel`, `LocationField`,
   `FilterControls`, `SearchLayout`):
   - review each against `Button`, `Chip` and `SmoothTabs`;
   - keep combobox semantics;
   - keep every URL-changing control a link or GET form (no-JS search is
     already proven by `search-check`).
2. **The locality combobox:**
   - keyboard and screen-reader pass (active descendant, result count
     announcement);
   - 16px input.
3. **Header and menu toggles** (`HeaderNav`, `MarketplaceMenu`): a shared
   disclosure pattern if three or more genuinely match. Otherwise leave
   them and record why.
4. **Read more** (`DescriptionBlock`): a disclosure with `aria-expanded`
   and a 44px target.
5. **Same gates:**
   - eight widths and 44px;
   - no new dependency without a bundle comparison;
   - style-diff;
   - search and motion checks;
   - login and 404 untouched.
