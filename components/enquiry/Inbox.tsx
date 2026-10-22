import Link from 'next/link'
import { PriceDisplay } from '@/components/property/PriceDisplay'
import { PropertyImage } from '@/components/property/PropertyImage'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { BuildingIcon, CheckIcon, HomeIcon } from '@/components/ui/icons'
import type { Lead } from '@/lib/enquiry/queries'
import type { PropertyCard as DashboardCard } from '@/lib/dashboard/model'
import { getPropertySummary } from '@/lib/property/queries'
import { propertyPath } from '@/lib/property/public-id'
import { cn } from '@/lib/cn'
import { setLeadStatus } from '@/app/dashboard/enquiries/actions'

/**
 * The seller inbox's parts (UI-19): a row per enquiry for the list, and
 * the selected enquiry in full. Server components throughout; the only
 * client code is the status form's busy button (SubmitButton).
 */

/** The inbox URL; defaults are left out so the canonical address stays short. */
export function inboxHref({ listingId, enquiryId }: { listingId?: string; enquiryId?: string }) {
  const params = new URLSearchParams()
  if (listingId) params.set('listing', listingId)
  if (enquiryId) params.set('enquiry', enquiryId)
  const search = params.toString()
  return '/dashboard/enquiries' + (search ? `?${search}` : '')
}

/** What the inbox can say about the property an enquiry is about. */
export type PropertyContext = {
  title: string
  place: string | null
  price: number | null
  intent: 'buy' | 'rent' | null
  /** The listing's dashboard status, for a real listing the seller owns. */
  status: DashboardCard['status'] | null
  /** A public image: a demo photo, or a live listing's cover from its photo route at thumbnail width. */
  image: { url: string; isSample?: boolean; sizedByRoute?: boolean } | null
  /** Its public page, only while it has one. */
  href: string | null
  listingId: string | null
}

/**
 * The enquiry's property from what the seller already has: a demo
 * fixture's summary, or the seller's own dashboard card for a real listing
 * (its current title, place, price and status). A live listing's cover
 * comes from its public photo route at thumbnail width (the route resizes
 * it after its own check; lib/listings/photo-widths) rather than shipping
 * the full photo; a listing that is not public shows no photo. Falls back to the title the enquiry recorded.
 */
export function propertyContext(lead: Lead, cards: readonly DashboardCard[]): PropertyContext {
  if (lead.listing_public_id) {
    const p = getPropertySummary(lead.listing_public_id)
    if (p) return { title: p.society ?? p.title, place: `${p.localityName}, ${p.cityName}`, price: p.price, intent: p.intent, status: null, image: p.photos[0]?.url ? { url: p.photos[0].url, isSample: p.photos[0].isSample } : null, href: propertyPath(p.slug, p.publicId), listingId: null }
  }
  const card = lead.listing_id ? cards.find((c) => c.listing?.id === lead.listing_id) : undefined
  if (card && lead.listing_id) {
    const live = card.status === 'ACTIVE'
    return { title: card.title, place: card.place, price: card.price, intent: card.intent, status: card.status, image: live && card.coverId ? { url: `/api/listings/${lead.listing_id}/photos/${card.coverId}`, sizedByRoute: true } : null, href: live ? `/listing/${lead.listing_id}` : null, listingId: lead.listing_id }
  }
  return { title: lead.listing_title, place: null, price: null, intent: null, status: null, image: null, href: null, listingId: lead.listing_id }
}

const dayFormat = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })
const momentFormat = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })

/**
 * An enquiry's state, in words with a mark beside them — never colour
 * alone. New is the one that asks for action, so it is the one filled.
 */
export function EnquiryState({ status }: { status: Lead['status'] }) {
  if (status === 'new') return <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand-600 px-2 py-0.5 text-caption font-semibold text-on-brand"><span aria-hidden className="size-1.5 rounded-full bg-on-brand" />New</span>
  if (status === 'contacted') return <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border-subtle px-2 py-0.5 text-caption font-semibold text-ink-700"><CheckIcon className="size-3" />Contacted</span>
  return <span className="inline-flex shrink-0 items-center rounded-full bg-surface-200 px-2 py-0.5 text-caption font-semibold text-ink-500">Closed</span>
}

/**
 * One enquiry in the list: who, about which property, when, its state and
 * the start of the message. The whole row is one link to the enquiry. A
 * new enquiry is set in bold as well as marked New, the way an unread
 * message is, so state never depends on the colour of the mark.
 *
 * `current` is the enquiry the seller chose (aria-current). `shown` is the
 * newest, open beside the list from 1024px when nothing was chosen: marked
 * there only, because on a phone the list is the page and nothing is open.
 */
export function EnquiryRow({ lead, current, shown, href, property }: { lead: Lead; current: boolean; shown: boolean; href: string; property: PropertyContext }) {
  const fresh = lead.status === 'new'
  return <li>
    <Link href={href} aria-current={current ? 'true' : undefined} data-shown={shown || undefined} data-new={fresh || undefined}
      className={cn('inbox-row block min-w-0 border-b border-border-subtle px-4 py-3.5', current ? 'bg-brand-50' : 'hover:bg-surface-100')}>
      <span className="flex min-w-0 items-center gap-2">
        <EnquiryState status={lead.status} />
        <span className={cn('min-w-0 flex-1 truncate text-body', fresh ? 'font-semibold text-ink-900' : 'text-ink-700')}>{lead.buyer_name}</span>
        <time dateTime={lead.created_at} className="shrink-0 text-caption text-ink-500 tabular">{dayFormat.format(new Date(lead.created_at))}</time>
      </span>
      <span className="mt-1 flex min-w-0 items-center gap-1.5 text-caption text-ink-500">
        <HomeIcon className="size-3.5 shrink-0" /><span className="truncate">{property.title}</span>
        {lead.duplicate_of && <span className="shrink-0 rounded-sm bg-surface-200 px-1.5 font-semibold text-ink-700">Follow-up</span>}
      </span>
      <span className={cn('mt-1 line-clamp-2 break-words text-body-sm', lead.message ? (fresh ? 'text-ink-900' : 'text-ink-700') : 'italic text-ink-500')}>
        {lead.message ?? 'No message — the buyer left their number.'}
      </span>
    </Link>
  </li>
}

/**
 * The selected enquiry: the buyer and when they wrote, what they said, the
 * property it is about (enough to recognise it, never louder than the
 * message), and the one action the product has — the lead's status.
 */
export function EnquiryDetail({ lead, property, filtered }: { lead: Lead; property: PropertyContext; filtered: boolean }) {
  return <article aria-labelledby="enquiry-heading" className="dash-panel">
    <header className="border-b border-border-subtle px-5 pb-4 pt-5">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-ink-500">
        <EnquiryState status={lead.status} />
        <span>Received <time dateTime={lead.created_at}>{momentFormat.format(new Date(lead.created_at))}</time> IST</span>
        {lead.duplicate_of && <><span aria-hidden>·</span><span className="font-semibold text-ink-700">Follow-up from the same number</span></>}
      </p>
      <div className="mt-3 flex min-w-0 items-center gap-3">
        <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-full bg-brand-50 font-display text-heading-3 font-semibold text-brand-700">{lead.buyer_name.trim().charAt(0).toUpperCase() || '?'}</span>
        <div className="min-w-0">
          <h2 id="enquiry-heading" tabIndex={-1} className="break-words font-display text-heading-2 text-ink-900 outline-none">{lead.buyer_name}</h2>
          <p className="text-body text-ink-700">Buyer number: <span className="font-semibold tabular text-ink-900 select-all">{lead.buyer_phone}</span></p>
        </div>
      </div>
    </header>

    <div className="grid gap-5 px-5 py-5">
      <section aria-labelledby="enquiry-message">
        <h3 id="enquiry-message" className="text-caption font-semibold uppercase tracking-wide text-ink-500">Message</h3>
        {lead.message
          ? <blockquote className="mt-2 whitespace-pre-wrap break-words rounded-md border-l-4 border-brand-600 bg-surface-100 px-4 py-3 text-body text-ink-900">{lead.message}</blockquote>
          : <p className="mt-2 rounded-md bg-surface-100 px-4 py-3 text-body-sm italic text-ink-500">The buyer sent no message, only their number.</p>}
      </section>

      <section aria-labelledby="enquiry-property">
        <h3 id="enquiry-property" className="text-caption font-semibold uppercase tracking-wide text-ink-500">About</h3>
        <div className="mt-2 flex min-w-0 items-start gap-3 rounded-md border border-border-subtle p-3">
          <div className="relative w-20 shrink-0 overflow-hidden rounded-md sm:w-24">
            {property.image
              ? <PropertyImage src={property.image.url} alt="" isSample={property.image.isSample} sizedByRoute={property.image.sizedByRoute} sizes="96px" className="aspect-[4/3]" />
              : <span className="flex aspect-[4/3] items-center justify-center bg-surface-200 text-ink-500"><BuildingIcon className="size-6" /></span>}
          </div>
          <div className="min-w-0 flex-1">
            {property.status && <StatusBadge status={property.status} className="mb-1" />}
            <p className="break-words text-body font-semibold text-ink-900">{property.title}</p>
            {property.place && <p className="text-body-sm text-ink-700">{property.place}</p>}
            {property.price !== null && property.intent && <PriceDisplay amount={property.price} intent={property.intent} className="mt-0.5 [&_p:first-child]:text-body-sm [&_p:first-child]:font-semibold" />}
            <p className="mt-1 flex flex-wrap gap-x-4">
              {property.href && <Link href={property.href} className="inline-flex min-h-11 items-center text-label font-semibold text-brand-700 hover:underline">View listing</Link>}
              {property.listingId && !filtered && <Link href={inboxHref({ listingId: property.listingId })} className="inline-flex min-h-11 items-center text-label font-semibold text-brand-700 hover:underline">All enquiries for this listing</Link>}
            </p>
          </div>
        </div>
      </section>

      <LeadStatusForm lead={lead} />
    </div>
  </article>
}

const STATUSES: { value: Lead['status']; label: string; note: string }[] = [
  { value: 'new', label: 'New', note: 'Not yet answered' },
  { value: 'contacted', label: 'Contacted', note: 'You have replied' },
  { value: 'closed', label: 'Closed', note: 'Nothing more to do' },
]

/**
 * The lead's status — the inbox's one action (Phase 17), unchanged: the
 * same server action and the same three values, as radio choices with a
 * submit instead of a select, so all three are visible at once. A plain
 * form post without JavaScript; busy while it runs (SubmitButton, UI-09).
 */
function LeadStatusForm({ lead }: { lead: Lead }) {
  return <form action={setLeadStatus} className="rounded-md bg-surface-100 p-4">
    <input type="hidden" name="enquiryId" value={lead.id} />
    <fieldset>
      <legend className="text-body-sm font-semibold text-ink-900">Lead status</legend>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        {STATUSES.map((s) => <label key={s.value} className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-md border border-border-subtle bg-surface-000 px-3 py-2 has-checked:border-brand-600 has-checked:bg-brand-50 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand-600">
          <input type="radio" name="status" value={s.value} defaultChecked={lead.status === s.value} className="size-4 shrink-0 accent-brand-600" />
          <span className="min-w-0"><span className="block text-body-sm font-semibold text-ink-900">{s.label}</span><span className="block text-caption text-ink-500">{s.note}</span></span>
        </label>)}
      </div>
    </fieldset>
    <SubmitButton variant="primary" className="mt-3 max-sm:w-full">Update status<span className="sr-only"> for {lead.buyer_name}</span></SubmitButton>
  </form>
}
