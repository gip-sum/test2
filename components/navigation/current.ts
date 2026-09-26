import type { NavSection } from '@/lib/navigation/types'

/**
 * Where the visitor is, relative to a navigation section.
 *
 *  'page'    — on the section's own page (/buy/kolkata for Buy)
 *  'section' — somewhere inside it (/buy/kolkata/salt-lake/2-bhk)
 *  null      — elsewhere
 *
 * The two are told apart because they are announced differently:
 * aria-current="page" says "this link is where you are", "true" says
 * "you are within this". Localities is an in-page anchor with no path of
 * its own, so it is never current.
 */
export function sectionState(section: NavSection, pathname: string): 'page' | 'section' | null {
  if (!section.match.length) return null
  if (pathname === section.href) return 'page'
  return section.match.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)) ? 'section' : null
}
