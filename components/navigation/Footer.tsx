import Link from 'next/link'
import { getPopularLocalities } from '@/lib/location/queries'
import { FILTER_SLUGS, buildLandingUrl } from '@/lib/search/query'
import { PROPERTY_TYPE_LABEL, type PropertyTypeCode } from '@/lib/property/types'
import { BRAND, LAUNCH_CITY } from '@/lib/brand'

/**
 * Footer as a crawl surface.
 *
 * Not decoration: these link clusters are how ranking authority reaches
 * the locality and filter landing pages, and how a visitor navigates the
 * catalogue laterally. Generated from the location tree rather than
 * hand-authored, so it cannot go stale.
 *
 * Landing URLs throughout (Phase C): the query-string form of the same
 * search (/buy/kolkata?type=APARTMENT) is a second address for the landing
 * page, and a crawl surface that links to it splits the page in two.
 */
const TYPES: Array<{ type: PropertyTypeCode; slug: string }> = [
  { type: 'APARTMENT', slug: 'flats' },
  { type: 'INDEPENDENT_HOUSE', slug: 'independent-houses' },
  { type: 'BUILDER_FLOOR', slug: 'builder-floors' },
  { type: 'VILLA', slug: 'villas' },
]

export function Footer() {
  const localities = getPopularLocalities().slice(0, 8)
  const city = LAUNCH_CITY.slug

  return (
    <footer className="site-footer mt-12 border-t border-border-subtle bg-surface-000">
      <div className="mx-auto max-w-[1320px] px-4 py-10 lg:px-8">
        <div className="footer-intro"><Link href="/" className="font-display text-heading-1 text-brand-700">{BRAND.name}</Link><p>A better tomorrow.<br /><em>At home.</em></p></div>
        {/* Two columns even on phones: four single-column link lists made
            the footer longer than a screen and a half. */}
        <div className="grid grid-cols-2 gap-x-5 gap-y-8 lg:grid-cols-4">
          <FooterGroup title={`Buy in ${LAUNCH_CITY.name}`}>
            {localities.slice(0, 6).map((l) => (
              <FooterLink key={l.slug} href={`/buy/${city}/${l.slug}`}>
                Property in {l.name}
              </FooterLink>
            ))}
          </FooterGroup>

          <FooterGroup title={`Rent in ${LAUNCH_CITY.name}`}>
            {localities.slice(0, 6).map((l) => (
              <FooterLink key={l.slug} href={`/rent/${city}/${l.slug}`}>
                Rent in {l.name}
              </FooterLink>
            ))}
          </FooterGroup>

          <FooterGroup title="By property type">
            {TYPES.map(({ type, slug }) => (
              <FooterLink key={type} href={buildLandingUrl({ intent: 'buy', city, slug })}>
                {PROPERTY_TYPE_LABEL[type]} for sale
              </FooterLink>
            ))}
            {/* "Homes", not "flats": the 2-bhk page holds every type. */}
            {(['2-bhk', '3-bhk'] as const).map((slug) => (
              <FooterLink key={slug} href={buildLandingUrl({ intent: 'buy', city, slug })}>
                {FILTER_SLUGS[slug]!.label} homes in {LAUNCH_CITY.name}
              </FooterLink>
            ))}
          </FooterGroup>

          <FooterGroup title={BRAND.shortName}>
            <FooterLink href="/">Home</FooterLink>
            <FooterLink href="/post">Post a property</FooterLink>
            <FooterLink href="/#localities">Localities in {LAUNCH_CITY.name}</FooterLink>
            <FooterLink href="/calculators/budget">Home budget calculator</FooterLink>
            <FooterLink href="/calculators/emi">Home loan EMI calculator</FooterLink>
            {/* No terms or privacy links until those pages exist: their text
                has to come from the client, and a link to a 404 is worse
                than no link. */}
          </FooterGroup>
        </div>

        <div className="mt-8 border-t border-border-subtle pt-6">
          <p className="text-caption text-ink-500">
            {BRAND.name} — {BRAND.tagline}. Currently covering {LAUNCH_CITY.name},{' '}
            {LAUNCH_CITY.state}.
          </p>
          <p className="mt-1.5 max-w-3xl text-caption text-ink-500">
            Listings are posted by owners, agents and builders. The current catalogue contains sample data. Independently verify ownership, documents, measurements and prices.
            Confirm these independently before any payment.
          </p>
          {BRAND.isPlaceholder ? (
            <p className="mt-1.5 text-caption text-ink-500">
              {BRAND.name} is a temporary working name. The final brand has not been chosen.
            </p>
          ) : null}
        </div>
      </div>
    </footer>
  )
}

function FooterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-overline uppercase text-ink-500">{title}</h2>
      <ul className="mt-3 flex flex-col gap-2">{children}</ul>
    </div>
  )
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="rounded-md text-body-sm text-ink-700 hover:text-brand-600 hover:underline">
        {children}
      </Link>
    </li>
  )
}
