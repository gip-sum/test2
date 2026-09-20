# Responsive behaviour

Mobile is the product, not an adaptation of it. Design the 390px layout first; the desktop layout is what that becomes when there is room.

## Breakpoints

| Name | Range | Container | Columns | Gutter |
|---|---|---|---|---|
| `xs` | < 480px | fluid, 16px pad | 4 | 16px |
| `sm` | 480–767 | fluid, 16px pad | 4 | 16px |
| `md` | 768–1023 | 720px | 8 | 24px |
| `lg` | 1024–1279 | 960px | 12 | 24px |
| `xl` | 1280–1439 | 1200px | 12 | 32px |
| `2xl` | ≥ 1440 | 1320px | 12 | 32px |

Test at **390, 412, 768, 1024 and 1280**. 390 and 412 are the two phone widths that matter most in this market.

## What changes where

| Element | Phone (390–412) | Tablet (768) | Laptop (1024) | Desktop (1280+) |
|---|---|---|---|---|
| Header | Logo + account only | Condensed nav | Full nav | Full nav + header search on scroll |
| Search entry | Tap target → **full-screen sheet** | Inline, 2 fields | Full inline bar | Full inline bar |
| Filters | Sticky "Filters (3)" button → full-screen sheet, **apply on confirm** | Same sheet, wider | **Left rail appears**, apply on change | Left rail, sticky |
| Sort | Bottom sheet | Bottom sheet | Inline dropdown | Inline dropdown |
| Result cards | 1-up **horizontal** (image left 40%) | 2-up vertical | 2-up vertical | 3-up vertical |
| Property page | Single column + sticky bottom contact bar | Single column, wider gallery | Two columns, sticky right contact rail | Two columns + in-page nav |
| Gallery | Full-bleed swipe + counter | Full-bleed swipe | Primary + 2 thumbs | Primary + 4 thumbs |
| Primary CTAs | Full width, bottom third | Full width in column | Inline | Inline |
| Footer | Accordion groups | 2 columns | 4 columns | 4–5 columns |

## Phone rules

1. **Full-screen sheets, not inline multi-field forms.** One decision per screen.
2. **Apply on confirm, not on change.** A desktop rail can refresh live; on a phone every change triggering a reload is disorienting and wasteful. Put the pending count on the Apply button: "Show 248 properties".
3. **Horizontal result cards.** A vertical card shows about 1.5 results per phone screen; a horizontal card shows 3–4 while keeping the photo meaningful.
4. **Thumb zone.** Primary actions sit in the lower third. The most important button on a phone is at the bottom.
5. **No hover dependencies.** Anything reachable only on hover is unreachable on touch.
6. **Reserve every image box** with `aspect-ratio` so nothing shifts as photos load.
7. **Never hijack scroll.** No scroll-jacking, no overridden pull-to-refresh, and infinite scroll must not trap the footer — keep a "Load more" fallback.
