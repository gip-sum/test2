# GharBazaar — working agreement

A production property marketplace for a real client. Built incrementally
over many phases. Not an MVP, not a demo, not a portfolio piece.

**Brand:** GharBazaar is a *temporary working name*. Everything
brand-dependent reads from `lib/brand.ts`; `isPlaceholder` stays true until
the client approves a final identity.

---

## The five trade-offs, already decided

When these conflict, the left side wins. Every time.

| | over | |
|---|---|---|
| Quality | > | Speed |
| Correct architecture | > | Minimum code |
| Real product UX | > | Demo UX |
| Real data models | > | Shortcuts |
| Tested behaviour | > | Visual assumption |

This means: do not propose a smaller scope because a full one is more work.
Do not collapse an entity into a string because there is only one of it
today. Do not report something as working because it looked right in a
screenshot.

---

## Phase discipline

**Stop at the end of a phase. Do not begin the next one without explicit
approval.** Completing a phase ends with a report and a proposal, never
with the first commit of the following phase.

Every phase is specified before it is built, in `docs/phases/`, with all
nine sections:

1. **Scope** — what is in, and explicitly what is out
2. **UX requirements** — what the person using it experiences
3. **Technical requirements** — architecture, modules, seams
4. **Data requirements** — entities, fields, migrations, fixtures
5. **Edge cases** — empty, long, missing, slow, broken, hostile
6. **Accessibility requirements** — specific, testable, not "is accessible"
7. **Responsive requirements** — 390 / 412 / 768 / 1280 minimum
8. **Verification** — the commands and assertions that prove it
9. **Production readiness** — what would have to be true to ship it

A section that reads "N/A" needs a sentence saying why.

**`Phases.txt` at the repository root is the authoritative roadmap** — 75
client-owned phases. `docs/ROADMAP.md` is its companion, holding the
engineering audit and the register of which phase introduces which domain
model. When they disagree, `Phases.txt` wins.

The roadmap is expected to change as the product is understood better or
the client asks for something new. Changing it is normal; silently
narrowing an approved scope is not.

---

## Architecture rules

**Domain models get introduced properly, or not at all.** When a feature
genuinely needs a new entity — projects, builders, agents, reviews, price
trends, subscriptions — model it as an entity with its own identity,
lifecycle and table. Do not flatten it into a string column, a JSON blob or
an enum on an existing table because that is less work this week. The
14-table V0 model is a snapshot, not a ceiling.

The inverse also holds: **do not build an entity before a feature needs
it.** `docs/ROADMAP.md` keeps a register of deferred models and the trigger
that introduces each.

**Data access stays behind a seam.** `lib/*/queries.ts` and
`lib/property/search.ts` are the only modules that know where data comes
from. No route, page or component imports a fixture or a database client.
Swapping fixtures for Prisma must not touch anything above that line.

**The URL is the state.** Search, filters, sort and pagination live in the
address bar and nowhere else. No component mirrors a filter in local state.
This is what makes back, forward, refresh and a shared link work without
any of them being special-cased — and it is what makes saved searches and
alerts a table rather than a rewrite.

**Nothing claims more than it knows.** No invented counts, statistics,
testimonials, reviews, verification badges or marketplace metrics. When the
platform has not verified something, the interface does not imply it has.
Seeded development data is labelled as such in the interface itself.

**Money is integer rupees.** Never floats. Prices format through
`PriceDisplay`, areas through `AreaDisplay`, so the same figure cannot
render two ways on two screens.

---

## Verification

Four commands. All must pass before a phase is reported complete.

```bash
npm run verify        # lint, typecheck, unit tests
npm run build         # production build
npm run shots         # no horizontal overflow at 390/412/768/1280
npm run light-check   # light theme holds under a dark-mode browser
npm run search-check  # browser assertions over the search experience
```

`npm run shots`, `light-check` and `search-check` need a running server:
`npm run build && npm run start` (port 3100).

**A screenshot is not verification.** It cannot tell a theme that won from
a theme that failed to load, and it cannot tell a passing assertion from an
assertion that never ran. Measure the thing, and prefer a check that can
fail loudly later over one that passes quietly today.

**States that cannot be provoked from outside** — loading skeletons, error
boundaries — are verified by temporarily injecting a delay or a throw, then
reverting. Record that this is how they were checked; never report them as
verified without having provoked them.

**When a check is flaky, find out why.** A flaky assertion is a defect in
the net. Do not re-run until green.

---

## Theme

Light is the product, applied unconditionally. `prefers-color-scheme` does
not appear in `app/globals.css` and must not be reintroduced: a dark-OS
visitor gets the light product. Dark is retained but applies only under an
explicit `data-theme="dark"`.

Components never hardcode a colour. Every colour is a token, which is why a
palette change is one file. `supply-600` is a fill only — `supply-700` is
the orange that may be used as text.

---

## Conventions

- Next.js App Router, React 19, TypeScript strict with
  `noUncheckedIndexedAccess`. Tailwind v4, CSS-first `@theme`.
- `/buy` and `/rent` are literal route segments, not a dynamic `[intent]`.
  They are two products with different fields and economics.
- Comments explain *why*, especially where the obvious approach was
  rejected and what would break if someone re-introduced it.
- Indian conventions throughout: lakh/crore, Indian digit grouping, carpet
  area stated separately from built-up and super built-up.
