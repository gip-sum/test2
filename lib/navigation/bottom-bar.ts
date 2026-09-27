/**
 * Where the phone's bottom bar is hidden (Phase D), in one place.
 *
 * Hidden during focused workflows — the posting flow, sign-in, admin — and
 * on the property page, whose sticky contact bar takes its place: stacking
 * a six-item bar under a primary call to action on a 390px screen leaves
 * neither usable.
 *
 * Shared by the bar and the header's menu button. The bar carries Menu, so
 * the header shows its own menu button exactly where the bar is hidden:
 * one menu control per screen, never two (same name, same dialog) and
 * never none. A page can force the bar on (the 404 under /property has no
 * contact bar to stand in for it); `forced` keeps the two in step there too.
 */
export const BOTTOM_BAR_HIDDEN_PREFIXES = ['/post', '/login', '/admin', '/property'] as const

export function bottomBarShown(pathname: string, forced = false): boolean {
  return forced || !BOTTOM_BAR_HIDDEN_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}
