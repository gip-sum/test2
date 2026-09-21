# Kolkata Property Marketplace

The design system for an original, mobile-first property marketplace serving Kolkata. It covers the one loop V1 exists to deliver:

**Buy/Rent → Search → Property → Contact → Lead.**

Everything here is built for that loop. If a component does not help a buyer find a property, help a seller publish one, or help an admin keep the marketplace honest, it is not in V1.

> **The product name is not yet decided.** The working name is now **GharBazaar** (it replaced the earlier "Kolkata Property Marketplace" / "KPM" label); the client has not approved it, so **D-17** stays open. The palette, type and components below are deliberately name-independent — the wordmark drops into the header without any token changing. Older headings and the compiled `Kolkata-Marketplace-Design-System.html` still carry the previous label; the application itself reads its brand only from `lib/brand.ts`.

---

## What this system is not

It is not derived from any competitor's visual identity. The product was informed by researching publicly observable marketplace *functionality* — what a property card must show, why filters must never lose state, why a verified badge must be scoped honestly. None of that research produced a colour, a typeface, a logo or a layout that appears here. The visual language below is original and must stay that way.

---

## Voice and content

Write from the user's side of the screen.

| Do | Don't |
|---|---|
| "Show 248 properties" | "Apply filters" |
| "Posted 3 days ago by Owner" | "Listing metadata" |
| "We couldn't load these results. Try again." | "Error 500" |
| "Your listing is being reviewed. This usually takes a few hours." | "Status: UNDER_SCREENING" |
| "Add a floor plan — listings with one get 18% more enquiries" | "Incomplete listing" |

Four rules:

1. **Name things the way a person in Kolkata would.** A seller has a *flat*, not a *residential unit*. A buyer looks in *New Town*, not *locality 4412*.
2. **A button says what happens, and the confirmation echoes it.** "Publish" → "Published". "Save" → "Saved".
3. **Never show a raw state name.** `UNDER_SCREENING` is a database value. The user reads "Being reviewed".
4. **Errors say what broke and what to do next.** No apologies, no blame, no error codes in the user's face.

### Numbers are the interface

Prices and areas are what people actually compare, so they are typeset, not just printed.

- Indian format always: `₹ 62.5 L`, `₹ 1.4 Cr`, `₹ 42,000 /mo`. Never `6250000`.
- Every figure that lines up in a column uses `font-variant-numeric: tabular-nums`. It is built into the **Data** type styles.
- **Area always carries its basis.** `1,240 sqft (carpet)` — never a bare number. Carpet, built-up and super area are three different legal quantities in India, and conflating them produces a wrong price-per-sqft and destroys trust. This is a content rule, not a formatting preference.

---

## Visual foundations

### Colour

**The product is light.** White header, white cards, white inputs, a very light neutral page ground, deep navy text. That is not a theme preference — it is what the product is, applied unconditionally, because a marketplace is read in daylight beside photographs the buyer is judging, and a dark chrome fights the photography. Real property photography is meant to be the loudest thing on any screen; the interface stays quiet so it can be.

Beyond that, the palette answers one question: *can the user tell, at a glance, what is theirs to act on?*

- **`brand-600` (strong blue)** is the buyer's action. Search, Enquire, View Phone, Save. Exactly one filled `brand-600` button per surface.
- **`supply-600` (orange)** is the seller's action. Post Property, Publish, Renew. A different hue on purpose: in a two-sided marketplace the supply-side call to action must never be mistaken for the demand-side one. If both appear on a screen, they are distinguishable without reading them.
  - It ships in **two steps**, which is the one place this palette deviates from a flat 600/100 scale. `supply-600` is tuned as bright as an orange can be while still carrying white text (4.51:1 — the ceiling), which leaves it too light to *be* text. **`supply-700` is the foreground step.** Never set type in `supply-600`.
- **`trust-600` (green)** means verified or active. It is never decorative.
- **`danger-600` (red)** means rejected, destructive or wrong.
- **`warn-600` (amber)** is for caution, but warning *body copy* is set in `ink-900`. Amber text on an amber band reads brown and turns a light notice into a dark bar.
- **Neutrals carry a cool navy-grey bias**, tuned to sit under the blue. A warm grey next to `brand-600` reads as unconsidered.

Every pairing the components actually render is measured, not eyeballed — including the tight ones, `ink-500` on the sunken surface (4.86:1) and white on `supply-600` (4.51:1). Both sit just above AA, deliberately: they are the limit of what the hue allows while staying itself.

**Dark is secondary.** It is declared in full and every component follows it, but it applies only when something sets `data-theme="dark"`. `prefers-color-scheme` reaches neither the tokens nor the `dark:` variant, so a dark-OS visitor gets the light product. `on-brand` / `on-supply` / `on-danger` exist because white text on the dark theme's lighter blue and orange would fail contrast — **never hardcode `#fff` on a filled button.**

### Type

Two families, three jobs.

- **Archivo** (`display`) — headings, and every price. Sturdy, slightly condensed, with numerals that hold their width. Prices are set in the display face because the price is the loudest thing on a property card.
- **Instrument Sans** (`sans`) — all UI text, labels and body copy. Clean at 13px, which is where most of this product lives.

Body copy never goes below `body` (15px). `body-sm` (13px) is for card attributes and meta. `caption` (12px) is the floor and is reserved for legal text and photo counters.

Both faces are loaded from Google Fonts with real fallback stacks. **Bengali script support is not in V1** but the system is built to accept a third family later without restructuring — multi-language is explicitly out of MVP scope.

### Space, shape, depth

- **Spacing is a 4px scale.** `space-4` (16px) is the page gutter on mobile and the default card padding. A value that is not on the scale is a bug.
- **Radius by role**, not one value everywhere: `radius-sm` on inputs, `radius-md` on buttons, `radius-lg` on the property card, `radius-xl` on sheets, `radius-pill` on status pills.
- **Borders beat shadows.** A result list can hold fifty cards; fifty shadows cost real paint time on a mid-range Android phone. Cards separate with `border-subtle` and `shadow-0`. Shadows are spent on things that genuinely float: dropdowns (`shadow-2`), sheets and the sticky contact bar (`shadow-3`).

### Iconography

One outline set, 24px grid, 1.5px stroke, inline SVG — **not an icon font** (icon fonts break under content blockers and are invisible to screen readers).

Icons the product actually needs: bed, bath, area, floor, facing, parking, lift, power backup, security, camera, video, heart, share, phone, filter, sort, map pin, verified tick, warning, close, chevron, search, plus, trash, edit.

An icon never carries meaning alone. A verified badge is a tick **plus** the word "Verified" **plus** `trust-600` — colour, shape and text, so it survives colour blindness and greyscale printing.

---

## The rules that came out of the research

Four non-negotiables. Each one exists because the research found a real, repeated failure in the incumbent's product.

1. **Filter and sort actions never lose state.** Not scroll position, not applied filters, not loaded results — not even when the API errors. The incumbent's users complain about exactly this, specifically and repeatedly. Being fast and never losing state is this product's clearest differentiator.
2. **One primary action per surface.** Two competing filled buttons measurably reduce clicks on both.
3. **Nothing is "Verified" without saying what was verified.** The badge means *these photos were taken at this property recently*. It does not mean ownership, documents, area or price were checked. The tooltip says so. Overclaiming here is a legal exposure, not a copy choice.
4. **Never render a listing's contact details before the reveal.** Not in the DOM, not in the API payload. Hiding a phone number in the UI while shipping it in JSON is a real and common leak.

---

## Accessibility floor

WCAG 2.1 AA, treated as a build requirement rather than an audit item.

- Text meets 4.5:1 on its own surface in **both** themes; large text and control borders meet 3:1.
- Every interactive element has a visible focus ring (`focus-ring`, 2px, 2px offset). Removing a focus outline without replacing it is a defect.
- Touch targets are at least 44×44px. On a phone this is the difference between a usable filter sheet and an unusable one.
- Result-count changes are announced to screen readers — otherwise filtering appears to do nothing.
- `prefers-reduced-motion` disables transforms and keeps only opacity fades.

---

## Using the tokens

Everything is a CSS custom property compiled from `tokens.json`. Components read tokens; they never carry a literal.

```css
.property-card {
  background: var(--surface-000);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  box-shadow: var(--shadow-0);
}
.property-card__price {
  font-family: var(--font-display);
  font-variant-numeric: tabular-nums;
  color: var(--ink-900);
}
```

If you find yourself typing a hex value or an odd pixel number into a component, the system is missing a token — add it here rather than working around it.
