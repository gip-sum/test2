# FilterSheet

The full-screen filter surface on phones — apply-on-confirm, with a live count on the button.

**The single most important interaction rule in the product**: a filter or sort change must never lose scroll position, applied filters or loaded results — **not even when the API errors**. The research found this is the incumbent's most-complained-about failure, and getting it right is this product's clearest differentiator.

**Phone vs desktop**

- **Phone**: full-screen sheet, **apply on confirm**. The Apply button carries the pending count — "Show 248 properties" — so people can tune before committing to a reload.
- **Desktop (≥1024px)**: a sticky left rail that applies on change.

**Facet rules**

- Counts are computed **excluding that facet's own selection** — standard faceted-search semantics. Getting this wrong makes multi-select appear broken.
- Zero-count options are **shown disabled with their count**, never hidden.
- Every change updates the URL so a filtered search is shareable.
- "Clear all" is always reachable; each group can be reset on its own.

**Consumer provides**: the facet definitions with counts and the current filter object.
