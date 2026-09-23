import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PageShell } from '@/components/layout/PageShell'
import { Footer } from '@/components/navigation/Footer'
import { DevDataNotice } from '@/components/home/DevDataNotice'
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs'
import { Gallery } from '@/components/property/Gallery'
import { KeyDetails } from '@/components/property/KeyDetails'
import { AreaBreakdown } from '@/components/property/AreaBreakdown'
import { AmenityList } from '@/components/property/AmenityList'
import { DescriptionBlock } from '@/components/property/DescriptionBlock'
import { LocationBlock } from '@/components/property/LocationBlock'
import { SellerBlock } from '@/components/property/SellerBlock'
import { SimilarProperties } from '@/components/property/SimilarProperties'
import { PropertyDisclaimer } from '@/components/property/PropertyDisclaimer'
import { PriceDisplay } from '@/components/property/PriceDisplay'
import { SaveButton } from '@/components/property/SaveButton'
import { Badge } from '@/components/ui/Badge'
import { ContactCard, StickyContactBar } from '@/components/enquiry/ContactPanel'
import { getPropertyDetail } from '@/lib/property/queries'
import { getSimilarProperties } from '@/lib/property/similar'
import { parsePropertyHandle, propertyPath } from '@/lib/property/public-id'
import { getLocationById } from '@/lib/location/queries'
import { buildLandingUrl } from '@/lib/search/query'
import { formatConfiguration } from '@/lib/format/area'
import { formatPostedAt, isNewListing } from '@/lib/format/date'
import { BRAND, LAUNCH_CITY } from '@/lib/brand'
import { PROPERTY_TYPE_LABEL, type PropertyDetail } from '@/lib/property/types'

/**
 * The property page — the central conversion surface.
 *
 * Section order follows screen-spec §5 and the sequence a buyer decides in:
 * can I afford it, does it fit, where is it, who is selling, what else is
 * there. Everything on it is information the platform actually holds; no
 * section is rendered from an inference.
 *
 * STATUS CODES LIVE IN MIDDLEWARE. It decides the canonical 301 and 404
 * before rendering. The notFound() below is the backstop for a direct
 * render that bypassed middleware. An automatic loading.tsx boundary was
 * removed because it left the entire detail and enquiry form hidden when
 * JavaScript was disabled; a usable server-rendered form takes priority.
 *
 * Relative dates go stale in a cached render, so the page regenerates
 * hourly, matching the results route.
 */
export const revalidate = 3600

type Props = { params: Promise<{ handle: string }> }

async function resolve(props: Props): Promise<PropertyDetail> {
  const { handle } = await props.params
  const parsed = parsePropertyHandle(decodeURIComponent(handle))
  if (!parsed) notFound()
  const property = getPropertyDetail(parsed.publicId)
  if (!property) notFound()
  return property
}

function headline(p: PropertyDetail): string {
  const config = p.propertyType === 'STUDIO' ? 'Studio' : `${p.bedrooms} BHK`
  const type = PROPERTY_TYPE_LABEL[p.propertyType].toLowerCase()
  const verb = p.intent === 'rent' ? 'for rent' : 'for sale'
  return `${config} ${type} ${verb} in ${p.localityName}`
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const p = await resolve(props)
  const title = headline(p)
  const cover = p.photos.find((m) => m.url)?.url

  return {
    title,
    description:
      p.description?.slice(0, 155) ??
      `${title}. ${formatConfiguration(p.bedrooms, p.bathrooms)}, ${p.carpetArea} sqft carpet area, in ${p.localityName}, ${p.cityName}.`,
    alternates: { canonical: propertyPath(p.slug, p.publicId) },
    openGraph: {
      type: 'website',
      title,
      // Sample imagery must not travel as if it were this property's
      // photograph. Until real media exists, share cards use the site image.
      images: cover ? undefined : undefined,
    },
  }
}

export default async function PropertyPage(props: Props) {
  const property = await resolve(props)
  const society = property.societyLocationId
    ? getLocationById(property.societyLocationId)
    : undefined
  const similar = getSimilarProperties(property)
  const title = headline(property)

  const crumbs = [
    { label: LAUNCH_CITY.name, href: buildLandingUrl({ intent: property.intent, city: 'kolkata' }) },
    {
      label: property.localityName,
      href: buildLandingUrl({
        intent: property.intent,
        city: 'kolkata',
        locality: property.localitySlug,
      }),
    },
    { label: title },
  ]

  return (
    <PageShell footer={<Footer />}>
      <DevDataNotice />

      <article className="mx-auto max-w-[1320px] px-4 pb-8 pt-4 lg:px-8 lg:pt-5">
        <Breadcrumbs items={crumbs} />

        <div className="mt-4 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-8">
          <div className="min-w-0">
            <Gallery photos={property.photos} title={title} />

            {/* Header block — §5 item 3 */}
            <header className="mt-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <PriceDisplay
                    amount={property.price}
                    intent={property.intent}
                    size="detail"
                    areaForRate={property.intent === 'buy' ? property.carpetArea : undefined}
                  />
                  {(property.deposit != null ||
                    property.maintenanceMonthly != null ||
                    property.isNegotiable) && (
                    <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-body-sm text-ink-700">
                      {property.deposit != null && (
                        <span className="tabular">
                          Deposit ₹{property.deposit.toLocaleString('en-IN')}
                        </span>
                      )}
                      {property.maintenanceMonthly != null && (
                        <span className="tabular">
                          Maintenance ₹{property.maintenanceMonthly.toLocaleString('en-IN')}/mo
                        </span>
                      )}
                      {property.isNegotiable && <span>Negotiable</span>}
                    </p>
                  )}
                </div>
                <SaveButton title={title} className="shrink-0" />
              </div>

              <h1 className="mt-3 font-display text-heading-2 text-ink-900 lg:text-heading-1">
                {property.society ?? property.title}
              </h1>
              <p className="mt-1 text-body text-ink-700">
                {formatConfiguration(property.bedrooms, property.bathrooms)} ·{' '}
                {PROPERTY_TYPE_LABEL[property.propertyType]}
              </p>
              <p className="mt-0.5 text-body-sm text-ink-500">
                {society ? `${society.name}, ` : ''}
                {property.localityName}, {property.cityName}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {isNewListing(property.postedAt) && <Badge tone="brand">New</Badge>}
                {property.isPriceReduced && <Badge tone="supply">Price reduced</Badge>}
                <span className="text-caption text-ink-500">{formatPostedAt(property.postedAt)}</span>
              </div>
            </header>

            {/* Contact, inline on desktop only — the phone path is the
                sticky bar below, which would duplicate this on mobile. */}
            <div className="mt-5 lg:hidden">
              <SellerBlock property={property} />
            </div>

            <Section id="details" title="Property details">
              <KeyDetails property={property} />
            </Section>

            {property.amenities.length > 0 && (
              <Section id="amenities" title="Amenities">
                <AmenityList amenities={property.amenities} />
              </Section>
            )}

            {property.description && (
              <Section id="description" title="About this property">
                <DescriptionBlock text={property.description} />
              </Section>
            )}

            <Section id="area" title="Area breakdown">
              <AreaBreakdown property={property} />
            </Section>

            <Section id="location" title="Location">
              <LocationBlock property={property} societyName={society?.name} />
            </Section>

            <div className="mt-8">
              <PropertyDisclaimer />
            </div>
          </div>

          {/* Desktop: sticky contact and seller. */}
          <aside className="hidden lg:sticky lg:top-20 lg:block">
            <ContactCard property={property} />
            <div className="mt-4">
              <SellerBlock property={property} />
            </div>
          </aside>
        </div>

        {similar.results.length > 0 && (
          <div className="mt-10">
            <SimilarProperties results={similar.results} />
          </div>
        )}
      </article>

      {/* Reserves the strip the fixed bar occupies, so the disclaimer and
          the footer are never trapped underneath it. */}
      <div className="h-20 lg:hidden" aria-hidden />
      <StickyContactBar property={property} />

      <script
        type="application/ld+json"
        // Every field below is one the platform actually holds. Nothing is
        // inferred, and nothing is padded to satisfy a schema validator.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(property, title, crumbs)) }}
      />
    </PageShell>
  )
}

function Section({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section aria-labelledby={`${id}-heading`} className="mt-8">
      <h2 id={`${id}-heading`} className="font-display text-heading-3 text-ink-900">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  )
}

function jsonLd(p: PropertyDetail, title: string, crumbs: Array<{ label: string; href?: string }>) {
  const origin = BRAND.origin.replace(/\/$/, '')
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'RealEstateListing',
        name: title,
        url: `${origin}${propertyPath(p.slug, p.publicId)}`,
        datePosted: p.postedAt,
        ...(p.description ? { description: p.description } : {}),
        address: {
          '@type': 'PostalAddress',
          addressLocality: p.localityName,
          addressRegion: 'West Bengal',
          addressCountry: 'IN',
        },
        offers: {
          '@type': 'Offer',
          price: p.price,
          priceCurrency: 'INR',
          availability: 'https://schema.org/InStock',
        },
        ...(p.bedrooms ? { numberOfBedrooms: p.bedrooms } : {}),
        ...(p.bathrooms ? { numberOfBathroomsTotal: p.bathrooms } : {}),
        floorSize: { '@type': 'QuantitativeValue', value: p.carpetArea, unitCode: 'FTK' },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: crumbs.map((c, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: c.label,
          ...(c.href ? { item: `${origin}${c.href}` } : {}),
        })),
      },
    ],
  }
}
