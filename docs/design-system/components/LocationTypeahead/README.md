# LocationTypeahead

Search-as-you-type across the Kolkata place hierarchy, grouped by what kind of place each result is.

People type cities, localities, societies and landmarks interchangeably, so results are **grouped and typed** rather than presented as one flat list.

**Rules**

- **Show the count beside each suggestion** — "New Town · 1,240 properties". It materially improves which one people pick.
- Debounce ~250ms and **cancel in-flight requests** on each keystroke. Race conditions here cause flickering suggestions, a common and avoidable defect.
- Query the dedicated suggestion table, never the live property table — typeahead has a 120ms p95 budget.
- **Aliases resolve silently**: someone typing "Bangalore" or "Gurgaon" finds the canonical place. For Kolkata this matters for spellings like Bidhannagar / Salt Lake.
- Keyboard: ↑↓ move, Enter selects, Escape closes; the listbox carries `aria-activedescendant`.
- No results → offer the nearest matches and a "request this locality" path rather than a blank panel.

**Consumer provides**: the query string and a selection handler. The system provides grouping, counts and keyboard behaviour.
