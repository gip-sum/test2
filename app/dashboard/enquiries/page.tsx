import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { OwnerShell } from '@/components/workspace/OwnerShell'
import { MailIcon } from '@/components/ui/icons'
import { getVerifiedUser } from '@/lib/auth/session'
import { listLeads, countUnreadNotifications, type Lead } from '@/lib/enquiry/queries'
import { getPropertySummary } from '@/lib/property/queries'
import { propertyPath } from '@/lib/property/public-id'
import { UUID } from '@/lib/media/types'
import { setLeadStatus, acknowledgeNotifications } from './actions'

export const metadata: Metadata = { title: 'Seller enquiries', robots: { index: false, follow: false } }

/**
 * The seller inbox. `?listing=<id>` narrows it to one real listing — the
 * dashboard's per-listing enquiry counts link here — and lives in the URL
 * like every other filter.
 */
export default async function SellerEnquiries({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = (await searchParams).listing
  const listingId = typeof raw === 'string' && UUID.test(raw) ? raw : undefined
  const user = await getVerifiedUser()
  if (!user) redirect(`/login?next=${encodeURIComponent('/dashboard/enquiries' + (listingId ? `?listing=${listingId}` : ''))}`)
  const [result, unread] = await Promise.all([listLeads(user, 'seller', { listingId }), countUnreadNotifications(user)])
  const listingTitle = listingId && result.ok ? result.rows[0]?.listing_title : undefined
  return <OwnerShell current="enquiries" title={listingId ? `Enquiries for ${listingTitle ?? 'this listing'}` : 'Enquiries received'} description="Buyer conversations and the next step for each lead." unread={unread}>
    {result.ok && <dl className="workspace-summary workspace-counts [&_dt]:text-caption [&_dt]:text-ink-700 [&_dd]:mt-1 [&_dd]:text-[26px] [&_dd]:font-semibold [&_dd]:leading-tight [&_dd]:text-ink-900" aria-label="Enquiries in this view">
      <div><dt>Shown enquiries</dt><dd>{result.rows.length}</dd></div>
      <div><dt>New</dt><dd>{result.rows.filter((lead) => lead.status === 'new').length}</dd></div>
      <div><dt>Contacted</dt><dd>{result.rows.filter((lead) => lead.status === 'contacted').length}</dd></div>
      <div><dt>Closed</dt><dd>{result.rows.filter((lead) => lead.status === 'closed').length}</dd></div>
    </dl>}
    <div className="workspace-toolbar mt-4">
      <div className="flex flex-wrap items-center gap-x-4">
        <p className="text-body-sm font-semibold text-ink-900">{listingId ? 'One listing' : 'All listings'}</p>
        {listingId && <Link href="/dashboard/enquiries" className="inline-flex min-h-11 items-center text-label font-semibold text-brand-700 underline underline-offset-4">All enquiries</Link>}
      </div>
      {unread !== null && <div className="flex flex-wrap items-center gap-x-4"><p className="text-body-sm text-ink-700">{unread} unread {unread === 1 ? 'notification' : 'notifications'}</p>{unread > 0 && <form action={acknowledgeNotifications}><button type="submit" className="min-h-11 text-label font-semibold text-brand-700 underline">Mark notifications read</button></form>}</div>}
    </div>
    {!result.ok ? <p role="alert" className="workspace-panel workspace-empty">{listingId ? 'Enquiries for this listing are temporarily unavailable. Please refresh this page.' : 'Your leads are temporarily unavailable. Please refresh this page.'}</p> :
      result.rows.length === 0 ? <div className="workspace-panel workspace-empty"><MailIcon className="mb-3 size-8 text-brand-700" /><h2 className="font-display text-heading-3">No enquiries received</h2><p className="mt-2 text-body-sm text-ink-700">{listingId ? 'Enquiries about this listing appear here when buyers get in touch.' : 'Enquiries appear here when buyers contact you about your active listings.'}</p></div> :
        <section aria-label="Received enquiries" className="workspace-panel overflow-hidden">
          <div aria-hidden="true" className="hidden grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1.2fr)] gap-5 border-b border-border-subtle bg-surface-100 px-4 py-3 text-caption font-semibold text-ink-700 lg:grid"><span>Buyer</span><span>Property / message</span><span>Follow-up</span></div>
          {result.rows.map((lead) => <LeadCard key={lead.id} lead={lead} filtered={Boolean(listingId)} />)}
        </section>}
  </OwnerShell>
}

function LeadCard({ lead, filtered }: { lead: Lead; filtered: boolean }) {
  const property = lead.listing_public_id ? getPropertySummary(lead.listing_public_id) : null
  const headingId = `enquiry-${lead.id}`
  return <article aria-labelledby={headingId} className="grid min-w-0 gap-4 border-b border-border-subtle bg-surface-000 p-4 last:border-b-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1.2fr)] lg:gap-5">
    <div className="min-w-0">
      <p className="break-words text-body-sm font-semibold text-ink-900">{lead.buyer_name}</p>
      <p className="mt-1 break-words text-caption text-ink-700">Buyer number: {lead.buyer_phone}</p>
      <p className="mt-2 text-caption text-ink-500">{lead.duplicate_of ? 'Follow-up · ' : ''}<time dateTime={lead.created_at}>{new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone: 'Asia/Kolkata' }).format(new Date(lead.created_at))}</time></p>
    </div>
    <div className="min-w-0">
    {/* A real listing may since have been withdrawn or expired, so its title is not linked to a public page that could 404. */}
    <h2 id={headingId} className="break-words text-body-sm font-semibold text-ink-900">{property ? <Link href={propertyPath(property.slug, property.publicId)} className="inline-flex min-h-11 items-center text-brand-700 underline">{property.society ?? property.title}</Link> : lead.listing_title}</h2>
    {lead.listing_id && !filtered && <Link href={`/dashboard/enquiries?listing=${lead.listing_id}`} className="inline-flex min-h-11 items-center text-body-sm font-semibold text-brand-700 underline underline-offset-4">All enquiries for this listing</Link>}
    {lead.message && <p className="mt-2 whitespace-pre-wrap break-words text-body-sm text-ink-700">{lead.message}</p>}
    </div>
    <form action={setLeadStatus} className="flex min-w-0 flex-wrap items-end gap-2 lg:content-start">
      <input type="hidden" name="enquiryId" value={lead.id} />
      <label className="flex min-w-0 flex-col gap-1 text-caption font-semibold text-ink-700">Lead status
        <select name="status" defaultValue={lead.status} className="min-h-11 rounded-md border border-border-strong bg-surface-000 px-3 text-body-sm text-ink-900"><option value="new">New</option><option value="contacted">Contacted</option><option value="closed">Closed</option></select>
      </label>
      <button type="submit" className="min-h-11 rounded-md border border-brand-700 px-3 text-label font-semibold text-brand-700 hover:bg-brand-100 focus-visible:outline-2 focus-visible:outline-focus-ring">Update status</button>
    </form>
  </article>
}
