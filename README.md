# GharBazaar — Kolkata property marketplace

An original property marketplace for Kolkata, built around one loop:

**Buy/Rent → Search → Property → Contact → Lead.**

> **GharBazaar is a temporary working name.** The client will approve the final
> name later. Brand-dependent values live in `lib/brand.ts`.

## Status

| Phase | Scope | State |
|---|---|---|
| 0 | Plan and architecture | complete |
| 1 | Design system and application foundation | complete |
| 2 | Homepage and discovery | complete |
| 3 | Search, filters and results | complete |
| 4 | Property detail page | complete for development-fixture scope |
| 5 | Property gallery and media system | complete |
| 6 | Email OTP and Google authentication | implemented; live provider setup pending |
| 7 | Buyer profile and account area | deployed; real-account verification pending |
| 8 | Save and shortlist | implemented; real-account verification pending |
| 9 | Enquiry and lead system | implemented; real seller assignment pending |

The authoritative 75-phase roadmap is [Phases.txt](Phases.txt). Acceptance
criteria are in [the Phase 4 spec](docs/phases/PHASE-04-property-detail.md)
and [the Phase 5 spec](docs/phases/PHASE-05-media-gallery.md). Phase 6's
requirements and live-readiness checklist are in
[the auth spec](docs/phases/PHASE-06-authentication.md).
The [Phase 7 account spec](docs/phases/PHASE-07-user-account.md) covers the
profile and its live-readiness checks.
The [Phase 8 shortlist spec](docs/phases/PHASE-08-save-shortlist.md) records
save behavior, ownership and verification.
The [Phase 9 lead spec](docs/phases/PHASE-09-enquiry-leads.md) records enquiry
persistence, buyer history and seller inbox readiness.

## Getting started

```bash
npm install
npm run dev          # http://localhost:3000
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run verify` | **lint + typecheck + test** — run before every commit |
| `npm run shots -- /` | Render routes at 390/412/768/1280, fail on horizontal overflow |
| `npm run light-check` | Check theme surfaces under a dark-mode browser |
| `npm run search-check` | Browser assertions for search |
| `npm run property-check` | Browser assertions for the property page, including a 360px stress width |
| `npm run saved-check` | Browser assertions for save, reload, removal and buyer isolation with a simulated provider |
| `npm run lead-check` | Browser assertions for guest enquiries, repeat leads, buyer history and seller notifications |
| `npm run media-check` | Browser assertions for gallery navigation, touch, image loading and fallbacks |
| `npm run auth-check` | Browser assertions using a local Auth API simulator (requires the environment below) |

The browser checks need a server running (`npm run build && npm start -- -p 3100`).
Set `CHROME_PATH` if Chromium is installed elsewhere. `shots` uses `BASE`;
the other browser checks use `BASE_URL`.
It is the responsive check the plan requires at the end of every phase, and it
measures `scrollWidth` rather than relying on eyeballing a screenshot — an
earlier headless run *looked* broken at 390px when nothing was actually wrong.

## Phase 6 authentication setup

Copy `.env.example` to `.env.local` and supply your **project URL** and
**publishable key** for the intended Supabase Auth project. Never use a
service-role key. Enable email sign-in and configure the email template with
`{{ .Token }}` to deliver a six-digit OTP instead of a magic link. Set up
production SMTP, your deployment domain, and appropriate provider rate
limits. Apply `docs/migrations/006-auth-identities.sql` in that project.

To enable **Continue with Google**, also set `AUTH_SITE_URL` to the exact
origin of the deployed app (for example `https://homes.example`), enable
Google in Supabase Auth, and create a Google OAuth web client. Add your
Supabase project's callback URL (shown on its Google provider page) to
Google Cloud's authorized redirect URIs; put the Google client ID and secret
in Supabase's provider settings, never in this app. Allowlist
`https://homes.example/api/auth/google/callback` in Supabase's redirect URLs.
For local development also allowlist
`http://localhost:3000/api/auth/google/callback` and set `AUTH_SITE_URL`
to `http://localhost:3000`.

On the deployed site, verify real email delivery, invalid and expired codes,
return to `/account`, refresh and logout, plus Google consent and account
return, before considering Phase 6 complete.
Until configured, `/login` explains that sign-in is unavailable and creates
no local test account. To exercise the browser flow without a live project:

```bash
SUPABASE_URL=http://127.0.0.1:3300 SUPABASE_PUBLISHABLE_KEY=test-public-key AUTH_SITE_URL=http://localhost:3100 npm start -- -p 3100
# In another terminal, with CHROME_PATH set if needed:
npm run auth-check
```

## Phase 7 buyer profiles

The account editor stores buyer details and preferences in
`public.buyer_profiles`, keyed to the Supabase Auth user. Apply
`supabase/migrations/20260924032910_phase_07_buyer_profiles.sql` to the
same project as Phase 6. The migration grants authenticated users access
to their own row through RLS; anonymous users cannot read profiles. The
contact number is optional and unverified. Once deployed, sign in with a
real account, save details, reload, and confirm persistence before marking
the live account flow complete.

## Phase 8 saved properties

Signed-in buyers save listings from the property page and cards and find them
at `/account/saved`. Apply
`supabase/migrations/20260924083858_phase_08_saved_properties.sql` to the
same Supabase project as Auth. Row policies and table grants limit saved
properties to their owner. Search still uses development listings; saved
IDs remain available for removal if a listing disappears. Browser checks use
a simulated provider; confirm a real-account save, reload and remove before
marking the live flow complete.

## Phase 9 enquiries and leads

`/account/enquiries` shows enquiries sent while signed in.
`/dashboard/enquiries` provides an inbox for sellers assigned to listings,
with notifications and lead status. Guest enquiries are stored securely but
cannot be attached to a later buyer account. Apply both Phase 9 migrations
in `supabase/migrations/` in order. Existing fixture listings have no seller
account assignment, so their enquiries are retained but nobody is notified
until a trusted operator links an actual seller to a listing. Email and
phone delivery are not enabled. The simulated browser suite passed 15/15
lead checks; the current repo suite passed 173/173 tests.

## Architecture

One Next.js application, modular inside, single deployable.

```
app/          routes, layouts, server actions
components/
  ui/         no domain knowledge — Button, Badge, StatusPill, Skeleton
  property/   cards, gallery, price, area and property details
  navigation/ AppHeader, BottomNav, Wordmark
  layout/     PageShell
lib/
  brand.ts    brand + launch geography — single source of truth
  format/     price and area formatting (unit-tested)
  cn.ts
scripts/      shot.mjs — responsive verification harness
docs/         research, design system, specs, phase plan
```

Three rules that keep the layering honest:

1. `components/ui/` knows nothing about property. Domain folders compose it.
2. No component imports the database. Data arrives as props or via a server action.
3. `PriceDisplay` and `AreaDisplay` are components, not helpers — every price
   and every area in the product renders through them.

## Decisions worth knowing before you edit

**Typography.** Archivo (display + prices) and IBM Plex Sans (UI). Archivo
carries `U+20B9` ₹ **only in its `latin-ext` subset**, so `app/fonts.ts` must
request `['latin', 'latin-ext']` — dropping it silently falls the rupee sign
back to another font on every price. Neither face ships a usable `tnum`;
IBM Plex Sans has uniform 600-unit digit advances, which is why it replaced
the reference design system's Instrument Sans (which has no ₹ glyph at all).

**Tokens.** `app/globals.css` is the single source. Tailwind v4's `@theme`
emits each token as both a CSS custom property and a utility, so there is no
second config file to drift. Dark theme re-declares the same properties.

**TypeScript is pinned to 5.x.** TypeScript 7 builds fine but
`typescript-eslint` does not support it yet, so linting breaks.

**Area.** Carpet, built-up and super built-up are stored and displayed
separately. Never collapse them into one "area" field.

**No "Verified" badge.** The platform performs no verification in V0, and an
unearned trust badge is the one thing here that could do real harm.

## Documentation

- `docs/PROJECT-CONTEXT.md` — current implementation and boundaries
- `docs/PHASE-0-PLAN.md` — initial architecture and screen map
- `Phases.txt` — authoritative 75-phase roadmap
- `docs/kolkata-marketplace-screen-spec.md` — screen-by-screen behaviour
- `docs/design-system/` — tokens, brand book, component guidelines
- `docs/99acres-reverse-engineering-and-marketplace-spec.md` — the research
