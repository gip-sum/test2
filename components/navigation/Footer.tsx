import Link from 'next/link'
import { getPopularLocalities } from '@/lib/location/queries'
import { buildSearchUrl } from '@/lib/search/query'
import { PROPERTY_TYPE_LABEL, type PropertyTypeCode } from '@/lib/property/types'
import { BRAND, LAUNCH_CITY } from '@/lib/brand'

/**
 * Footer as a crawl surface.
 *
 * Not decoration: these link clusters are how ranking authority reaches
 * the locality and filter landing pages, and how a visitor navigates the
 * catalogue laterally. Generated from the location tree rather than
 * hand-authored, so it cannot go stale.
 */
const TYPES: PropertyTypeCode[] = ['APARTMENT', 'INDEPENDENT_HOUSE', 'BUILDER_FLOOR', 'VILLA']

export function Footer() {
  const localities = getPopularLocalities().slice(0, 8)
  const city = LAUNCH_CITY.slug

  return (
    <footer className="mt-12 border-t border-border-subtle bg-surface-000">
      <div className="mx-auto max-w-[1320px] px-4 py-10 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
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
            {TYPES.map((t) => (
              <FooterLink
                key={t}
                href={buildSearchUrl({
                  intent: 'buy',
                  city,
                  localities: [],
                  propertyTypes: [t],
                  bedrooms: [],
                })}
              >
                {PROPERTY_TYPE_LABEL[t]} for sale
              </FooterLink>
            ))}
            {[2, 3].map((n) => (
              <FooterLink
                key={n}
                href={buildSearchUrl({
                  intent: 'buy',
                  city,
                  localities: [],
                  propertyTypes: [],
                  bedrooms: [n],
                })}
              >
                {n} BHK flats in {LAUNCH_CITY.name}
              </FooterLink>
            ))}
          </FooterGroup>

          <FooterGroup title={BRAND.shortName}>
            <FooterLink href="/post">Post a property</FooterLink>
            <FooterLink href={`/in/${city}`}>Localities in {LAUNCH_CITY.name}</FooterLink>
            <FooterLink href="/terms">Terms of use</FooterLink>
            <FooterLink href="/privacy">Privacy policy</FooterLink>
          </FooterGroup>
        </div>

        <div className="mt-8 border-t border-border-subtle pt-6">
          <p className="text-caption text-ink-500">
            {BRAND.name} — {BRAND.tagline}. Currently covering {LAUNCH_CITY.name},{' '}
            {LAUNCH_CITY.state}.
          </p>
          <p className="mt-1.5 max-w-3xl text-caption text-ink-500">
            Listings are posted by owners, agents and builders. We review listings against our
            content rules but do not verify ownership, documents, measurements or prices.
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
