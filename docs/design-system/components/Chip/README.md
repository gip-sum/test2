# Chip

Two different controls that look related: a filter chip you toggle, and an applied chip you remove.

Keeping these visually distinct matters — one adds a constraint, the other removes it.

**Filter chip** — a toggle inside the filter panel. Selected uses `brand-100` fill with a `brand-600` border, so selection reads without relying on colour alone.

**Applied chip** — sits above the results showing what is currently constraining them, each with an × to remove, plus "Clear all".

**Rules**

- **Applied chips read in human language**, never parameter values: `₹40L – ₹60L`, not `pmin=4000000`. `2, 3 BHK`, not `bhk=2,3`.
- **Zero-count options are shown disabled with their count, never hidden.** Hiding an option makes users think the filter is broken.
- Counts appear on filter chips wherever the facet service can supply them.
- Minimum 44px touch height on phones; the × has its own 44px target.

**Consumer provides**: the option list with counts, selection state, and remove handlers.
