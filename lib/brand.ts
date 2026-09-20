/**
 * Brand configuration — SINGLE SOURCE OF TRUTH.
 *
 * ⚠️  TEMPORARY WORKING BRAND. "GharBazaar" is a working name, not a
 * client-approved identity. It replaces the earlier "KPM" placeholder so
 * the product stops shipping an obvious stub, and it is still expected to
 * change. `isPlaceholder` below stays true until it does.
 *
 * Everything brand-dependent reads from here, so the real name, domain,
 * tagline and logo drop in without restructuring the application:
 *   • the wordmark             components/navigation/Wordmark.tsx
 *   • page titles + templates  app/layout.tsx  (metadata.title.template)
 *   • canonical + OG URLs      metadataBase, below
 *   • footer identity + legal  components/navigation/Footer.tsx
 *   • email sender identity    Phase 5
 *   • sitemap + robots host    Phase 8
 *
 * To rebrand: change the values here and replace the four files in
 * public/brand/ plus app/icon.png, app/apple-icon.png and
 * app/opengraph-image.png. No component needs editing.
 *
 * Deliberately NOT here: page copy. The homepage H1 echoes `tagline` with
 * the city appended, but it lives in app/page.tsx because it is a heading
 * written for that page, not an identity value.
 */
export const BRAND = {
  /** Product name. Appears in titles, the footer and legal copy. */
  name: 'GharBazaar',
  /**
   * Compact form for title templates and tight spaces. Identical to `name`
   * today because the name is already short — the field stays so a longer
   * approved name does not have to fit everywhere `name` fits.
   */
  shortName: 'GharBazaar',
  /** Brand line, taken from the logo lockup. Footer and default title. */
  tagline: 'Find your place',
  /**
   * Fallback meta description for routes that do not set their own.
   * States what the site does. No counts, claims or metrics — there is no
   * inventory yet to make them true.
   */
  description:
    'Buy, rent and list flats, houses and builder floors across Kolkata. Search by locality, budget and configuration, then contact owners, agents and builders directly.',
  /**
   * Logo lockups. The rasters in public/brand/ are masters, not what
   * ships: next/image resizes and re-encodes them per request.
   *
   * The dark pair is a separate recolour rather than a CSS filter. The
   * wordmark's navy measures roughly 1.1:1 against the dark surface token,
   * and any filter strong enough to lift it also washes out the teal.
   */
  logo: {
    /** Mark + wordmark. Header and anywhere the lockup must stay short. */
    light: '/brand/logo.png',
    dark: '/brand/logo-dark.png',
    /** Mark + wordmark + tagline rule. Share cards, print, documents. */
    fullLight: '/brand/logo-full.png',
    fullDark: '/brand/logo-full-dark.png',
    /** Intrinsic size of the compact lockup, for aspect reservation. */
    width: 640,
    height: 215,
  },
  /**
   * Production origin. Placeholder until the domain is registered —
   * metadataBase needs an absolute URL for OG images and canonicals.
   */
  origin: process.env.NEXT_PUBLIC_SITE_ORIGIN ?? 'https://example.invalid',
  /** Support address shown in the footer and on error pages. */
  supportEmail: 'support@example.invalid',
  /**
   * True while the brand above is a working name. Gates the robots block
   * in app/layout.tsx and the footer's working-name notice.
   */
  isPlaceholder: true,
} as const

/** Launch geography. Kolkata city only in V0; the schema supports more. */
export const LAUNCH_CITY = {
  slug: 'kolkata',
  name: 'Kolkata',
  state: 'West Bengal',
} as const
