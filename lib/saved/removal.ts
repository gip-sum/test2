/**
 * The Saved list's removal event (UI-12): a confirmed removal on
 * /account/saved fires it just before the page refreshes, so SavedGrid can
 * measure the cards it is about to move. Its own module, so SaveButton —
 * on every public page — does not pull the grid into their bundles.
 */
export const SAVED_REMOVING = 'gb:saved-removing'
