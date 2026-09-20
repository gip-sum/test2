# SearchBar

The homepage entry point — the single control the whole funnel passes through.

**Phone**: a tap target that opens a **full-screen sheet**, one decision per screen. Inline multi-field entry does not work at 390px.
**Desktop**: one horizontal bar — location grows, type and budget are fixed, submit at the end.

**Rules**

- **Intent tabs are part of the search, not a filter.** Buy and Rent are different products with different economics and different field sets. Switching tabs keeps the localities and clears the budget — a ₹80 L buy budget is nonsense as rent — and says so.
- Location accepts **multiple selections** as chips. Real people search "Salt Lake or New Town or Rajarhat".
- Submitting navigates to the pretty SEO URL for that intent and place, never to a query-string route.
- The button says "Search"; when a count is known it says "Show 248 properties".

**Consumer provides**: the selected intent, chips and filters, plus a submit handler.
