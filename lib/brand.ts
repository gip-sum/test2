/**
 * Brand configuration — SINGLE SOURCE OF TRUTH.
 *
 * ⚠️  PLACEHOLDER. The production brand has not been chosen yet.
 *
 * Everything brand-dependent reads from here so the real name, domain and
 * wordmark can be dropped in without restructuring the application:
 *   • the wordmark             components/navigation/Wordmark.tsx
 *   • page titles + templates  app/layout.tsx  (metadata.title.template)
 *   • canonical + OG URLs      metadataBase, below
 *   • email sender identity    Phase 5
 *   • sitemap + robots host    Phase 8
 *
 * To rebrand: change the values here, replace the Wordmark mark, done.
 */
export const BRAND = {
  /** Full legal/product name. Appears in titles and legal copy. */
  name: 'Kolkata Property Marketplace',
  /** Compact form for the header wordmark and tight spaces. */
  shortName: 'KPM',
  /** One line. Used in metadata descriptions and the footer. */
  tagline: 'Find your next property in Kolkata',
  /**
   * Production origin. Placeholder until the domain is registered —
   * metadataBase needs an absolute URL for OG images and canonicals.
   */
  origin: process.env.NEXT_PUBLIC_SITE_ORIGIN ?? 'https://example.invalid',
  /** Support address shown in the footer and on error pages. */
  supportEmail: 'support@example.invalid',
  /** True once a real brand replaces this block. Gates nothing today. */
  isPlaceholder: true,
} as const

/** Launch geography. Kolkata city only in V0; the schema supports more. */
export const LAUNCH_CITY = {
  slug: 'kolkata',
  name: 'Kolkata',
  state: 'West Bengal',
} as const
