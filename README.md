# Kolkata Property Marketplace

An original property marketplace for Kolkata, built around one loop:

**Buy/Rent → Search → Property → Contact → Lead.**

> **The brand is a placeholder.** `KPM` / "Kolkata Property Marketplace" is a
> working label. Everything brand-dependent resolves from `lib/brand.ts`, so
> the real name and domain drop in without restructuring the app.

## Status

| Phase | Scope | State |
|---|---|---|
| 0 | Plan, contradictions, V0 architecture | done — `docs/PHASE-0-PLAN.md` |
| **1** | **Design tokens, fonts, application shell** | **done** |
| 2 | Homepage | next |
| 3 | Search, filters, results | |
| 4 | Property detail page | |
| 5 | Auth + seller posting wizard | |
| 6 | Seller dashboard + enquiries | |
| 7 | Admin + moderation | |
| 8 | SEO, performance, accessibility | |

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

`npm run shots` needs a server running (`npm start -- -p 3100`, or set `BASE`).
It is the responsive check the plan requires at the end of every phase, and it
measures `scrollWidth` rather than relying on eyeballing a screenshot — an
earlier headless run *looked* broken at 390px when nothing was actually wrong.

## Architecture

One Next.js application, modular inside, single deployable.

```
app/          routes, layouts, server actions
components/
  ui/         no domain knowledge — Button, Badge, StatusPill, Skeleton
  property/   PriceDisplay, AreaDisplay, (cards, gallery in later phases)
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

- `docs/PHASE-0-PLAN.md` — architecture, scope, screen map, data model, build order
- `docs/kolkata-marketplace-screen-spec.md` — screen-by-screen behaviour
- `docs/design-system/` — tokens, brand book, component guidelines
- `docs/99acres-reverse-engineering-and-marketplace-spec.md` — the research
