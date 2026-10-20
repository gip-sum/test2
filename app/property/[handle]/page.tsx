import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PageShell } from '@/components/layout/PageShell'
import { Footer } from '@/components/navigation/Footer'
import { DevDataNotice } from '@/components/home/DevDataNotice'
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs'
import { AreaHeading, PropertyLayout, Section } from '@/components/property/PropertyLayout'
import { KeyDetails } from '@/components/property/KeyDetails'
import { AreaBreakdown } from '@/components/property/AreaBreakdown'
import { AmenityList } from '@/components/property/AmenityList'
import { DescriptionBlock } from '@/components/property/DescriptionBlock'
import { LocationBlock } from '@/components/property/LocationBlock'
import { SellerBlock } from '@/components/property/SellerBlock'
import { SimilarProperties } from '@/components/property/SimilarProperties'
import { PropertyDisclaimer } from '@/components/property/PropertyDisclaimer'
import { PropertyOverview } from '@/components/property/PropertyOverview'
import { SaveButton } from '@/components/property/SaveButton'
import { ContactCard, StickyContactBar } from '@/components/enquiry/ContactPanel'
import { getPropertyDetail } from '@/lib/property/queries'
import { getSimilarProperties } from '@/lib/property/similar'
import { parsePropertyHandle, propertyPath } from '@/lib/property/public-id'
import { getLocationById } from '@/lib/location/queries'
import { buildLandingUrl } from '@/lib/search/query'
import { formatConfiguration } from '@/lib/format/area'
import { BRAND, LAUNCH_CITY } from '@/lib/brand'
import { PROPERTY_TYPE_LABEL, type PropertyDetail } from '@/lib/property/types'
import { contactOfProperty, overviewOfProperty } from '@/lib/property/overview'

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

  const name = property.society ?? property.title
  const contact = contactOfProperty(property)

  return (
    <PageShell footer={<Footer />}>
      <PropertyLayout
        band={<><DevDataNotice /><div className="mt-3 lg:mt-4"><Breadcrumbs items={crumbs} currentFromSm /></div></>}
        photos={property.photos}
        title={title}
        saveAction={<SaveButton id={property.publicId} title={name} visualClassName="bg-surface-000 shadow-e2" />}
        overview={<PropertyOverview data={overviewOfProperty(property, society?.name)} />}
        aside={<ContactCard contact={contact} headingId="contact-heading" />}
        asideLabelledBy="contact-heading"
        after={similar.results.length > 0 ? <SimilarProperties results={similar.results} /> : undefined}
        phoneContact={{ bar: <StickyContactBar contact={contact} />, noScriptCard: <ContactCard contact={contact} /> }}
      >
        <Section id="details" title="Property details">
          <KeyDetails property={property} />
          <AreaHeading />
          <div className="mt-3">
            <AreaBreakdown property={property} />
          </div>
        </Section>

        {property.description && (
          <Section id="description" title="About this property">
            <DescriptionBlock text={property.description} />
          </Section>
        )}

        {property.amenities.length > 0 && (
          <Section id="amenities" title="Amenities">
            <AmenityList amenities={property.amenities} />
          </Section>
        )}

        <Section id="location" title="Location">
          <LocationBlock
            society={society?.name}
            locality={property.localityName}
            city={property.cityName}
            landmarks={property.nearbyLandmarks}
            moreHref={buildLandingUrl({ intent: property.intent, city: 'kolkata', locality: property.localitySlug })}
            addressNote="The exact address is not shown on this page."
          />
        </Section>

        {/* Who is selling, in the reading order on a phone; on desktop
            the contact card beside the content carries it. */}
        <Section id="seller" title="Listed by" className="lg:hidden">
          <SellerBlock property={property} />
        </Section>

        <div className="mt-10">
          <PropertyDisclaimer />
        </div>
      </PropertyLayout>

      <script
        type="application/ld+json"
        // Every field below is one the platform actually holds. Nothing is
        // inferred, and nothing is padded to satisfy a schema validator.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(property, title, crumbs)) }}
      />
    </PageShell>
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
