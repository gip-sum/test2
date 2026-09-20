# Button

The action a person takes, in four variants whose meaning is fixed by the system.

Exactly **one filled `primary` button per surface**. Two competing filled buttons measurably reduce clicks on both.

| Variant | Token | When |
|---|---|---|
| `primary` | `brand-600` / `on-brand` | The buyer's action: Search, Enquire, View Phone |
| `supply` | `supply-600` / `on-supply` | The seller's action: Post Property, Publish, Renew |
| `secondary` | `border-strong`, transparent fill | The alternative beside a primary |
| `tertiary` | text only, `brand-600` | Low-emphasis, inline |
| `danger` | `danger-600` | Destructive: Delete listing, Report |

**Rules**

- Sizes: `sm` 32px, `md` 40px, `lg` 48px. Minimum touch target is 44×44 — on phones use `lg` for anything a thumb must hit.
- **A loading button keeps its width.** Swap the label for a spinner; never let the button shrink, or everything beside it moves.
- Full width on phones, inline from `md` up.
- `primary` and `supply` must stay visually distinguishable without reading them. That is the whole point of two accent hues.
- Never hardcode `#fff` as the label colour — use `on-brand` / `on-supply`, which flip in dark theme.

**Consumer provides**: the label, an `onClick`, and `disabled` / `loading` flags. The system provides every colour, size and state.
