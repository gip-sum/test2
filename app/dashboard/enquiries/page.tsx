import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { OwnerShell } from '@/components/workspace/OwnerShell'
import { MailIcon } from '@/components/ui/icons'
import { getVerifiedUser } from '@/lib/auth/session'
import { listLeads, countUnreadNotifications } from '@/lib/enquiry/queries'
import { loadDashboard } from '@/lib/dashboard/queries'
import { UUID } from '@/lib/media/types'
import { acknowledgeNotifications } from './actions'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { EnquiryDetail, EnquiryRow, inboxHref, propertyContext } from '@/components/enquiry/Inbox'
import { cn } from '@/lib/cn'

export const metadata: Metadata = { title: 'Seller enquiries', robots: { index: false, follow: false } }

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/**
 * The seller inbox (Phase 17; an inbox layout since UI-19).
 *
 * `?listing=<id>` narrows it to one real listing — the dashboard's
 * per-listing enquiry counts link here — and `?enquiry=<id>` selects one
 * enquiry. Both live in the URL like every other filter, so the page is
 * server-rendered, works without JavaScript, and back, refresh and a shared
 * link land on the same enquiry.
 *
 * From 1024px the list and the selected enquiry sit side by side; with
 * nothing selected the newest is shown. On a phone the list is the page,
 * and choosing an enquiry opens it on its own with a way back — the two are
 * never squeezed together.
 *
 * New and handled are the enquiry's own status (new, contacted, closed),
 * set by the seller. The unread count is the seller's notifications —
 * countUnreadNotifications, the same figure the dashboard and the sidebar
 * show — never a second calculation.
 */
export default async function SellerEnquiries({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  const one = (v: string | string[] | undefined) => (typeof v === 'string' && UUID.test(v) ? v : undefined)
  const listingId = one(params.listing), enquiryId = one(params.enquiry)
  const user = await getVerifiedUser()
  if (!user) redirect(`/login?next=${encodeURIComponent(inboxHref({ listingId, enquiryId }))}`)
  // The seller's own property cards give each enquiry its property's
  // current title, place, price and status; they are supplementary.
  const [result, unread, dashboard] = await Promise.all([listLeads(user, 'seller', { listingId }), countUnreadNotifications(user), loadDashboard(user)])
  const cards = dashboard.ok ? dashboard.cards : []
  const rows = result.ok ? result.rows : []
  const listingTitle = listingId && result.ok ? rows[0]?.listing_title ?? cards.find((c) => c.listing?.id === listingId)?.title : undefined
  const selected = rows.find((r) => r.id === enquiryId) ?? rows[0]
  const explicit = Boolean(enquiryId && selected?.id === enquiryId)
  const counts = { new: rows.filter((r) => r.status === 'new').length, contacted: rows.filter((r) => r.status === 'contacted').length, closed: rows.filter((r) => r.status === 'closed').length }

  return <OwnerShell current="enquiries" title={listingId ? `Enquiries for ${listingTitle ?? 'this listing'}` : 'Enquiries'} unread={unread}
    description={result.ok && rows.length > 0 ? [plural(rows.length, 'enquiry', 'enquiries'), counts.new ? `${counts.new} new` : null, counts.contacted ? `${counts.contacted} contacted` : null, counts.closed ? `${counts.closed} closed` : null].filter(Boolean).join(' · ') : 'Buyers who contact you about your listings, and the next step for each.'}>
    {!result.ok ? <ErrorState surface="workspace">{listingId ? 'Enquiries for this listing are temporarily unavailable. Please refresh this page.' : 'Your leads are temporarily unavailable. Please refresh this page.'}</ErrorState> :
      rows.length === 0 ? <EmptyState surface="workspace" icon={<MailIcon />} title="No enquiries received"
        action={<Link href="/dashboard" className="inline-flex min-h-11 items-center font-semibold text-brand-700 underline">Go to My properties</Link>}>
        {listingId ? 'Enquiries about this listing appear here when buyers get in touch.' : 'Enquiries appear here when buyers contact you about your active listings.'}
      </EmptyState> :
        <div className="inbox-grid">
          <section aria-labelledby="inbox-heading" className={cn('inbox-list dash-panel', explicit && 'max-lg:hidden')}>
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-border-subtle px-4 py-3">
              <h2 id="inbox-heading" className="font-display font-semibold text-ink-900">{listingId ? 'This listing' : 'All enquiries'} <span className="tabular font-normal text-ink-500">({rows.length})</span></h2>
              {listingId && <Link href={inboxHref({})} className="inline-flex min-h-11 items-center text-label font-semibold text-brand-700 hover:underline">All enquiries</Link>}
            </div>
            {unread !== null && unread > 0 && <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-border-subtle bg-brand-50 px-4 py-2">
              <p className="text-body-sm font-semibold text-ink-900">{plural(unread, 'unread notification', 'unread notifications')}</p>
              <form action={acknowledgeNotifications}><SubmitButton variant="text" className="text-label text-brand-700">Mark notifications read</SubmitButton></form>
            </div>}
            <ul aria-label="Enquiries" className="inbox-rows">
              {rows.map((lead) => <EnquiryRow key={lead.id} lead={lead} current={explicit && lead.id === selected?.id} shown={!explicit && lead.id === selected?.id} href={inboxHref({ listingId, enquiryId: lead.id })} property={propertyContext(lead, cards)} />)}
            </ul>
          </section>
          {selected && <section aria-labelledby="enquiry-heading" className={cn('inbox-detail', !explicit && 'max-lg:hidden')}>
            <Link href={inboxHref({ listingId })} className="mb-3 inline-flex min-h-11 items-center gap-1.5 text-label font-semibold text-brand-700 lg:hidden">
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M15 6l-6 6 6 6" /></svg>
              All enquiries
            </Link>
            <EnquiryDetail lead={selected} property={propertyContext(selected, cards)} filtered={Boolean(listingId)} />
          </section>}
        </div>}
  </OwnerShell>
}
