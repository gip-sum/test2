# Field

A labelled form control with reserved space for helper and error text, so validation never shifts the layout.

Used everywhere a person types: the posting wizard, the contact form, admin search.

**Rules**

- **A real `<label>` above the field. Never placeholder-as-label** — placeholders vanish on focus and are invisible to screen readers.
- **Helper and error share one reserved line.** The slot is always present, so showing an error cannot push the page down. This is how a 6-step form stays stable while validating.
- Height 40px (`md`) or 48px (`lg`). Use `lg` on phones.
- Error state sets `danger-600` on the border *and* shows text — never colour alone.
- Required fields are marked on the label, not with a placeholder asterisk.
- Numeric fields (price, area) use `inputmode="numeric"` and tabular numerals.

**Consumer provides**: label, value, `onChange`, and optionally `error`, `helper`, `required`.
