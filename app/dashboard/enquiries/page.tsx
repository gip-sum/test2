import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { PageShell } from '@/components/layout/PageShell'
import { getVerifiedUser } from '@/lib/auth/session'
import { listLeads, countUnreadNotifications } from '@/lib/enquiry/queries'
import { getPropertySummary } from '@/lib/property/queries'
import { propertyPath } from '@/lib/property/public-id'
import { setLeadStatus, acknowledgeNotifications } from './actions'

export const metadata: Metadata = { title: 'Seller enquiries', robots: { index: false, follow: false } }

export default async function SellerEnquiries() {
  const user = await getVerifiedUser()
  if (!user) redirect('/login?next=%2Fdashboard%2Fenquiries')
  const [result, unread] = await Promise.all([listLeads(user, 'seller'), countUnreadNotifications(user)])
  return <PageShell><div className="mx-auto max-w-5xl px-4 py-9 sm:py-14">
    <p className="text-overline uppercase tracking-widest text-brand-700">Seller inbox</p>
    <h1 className="mt-2 font-display text-heading-1 text-ink-900">Enquiries received</h1>
    {unread !== null && <div className="mt-2 flex flex-wrap items-center gap-3"><p className="text-body-sm text-ink-700">{unread} unread {unread === 1 ? 'notification' : 'notifications'}</p>{unread > 0 && <form action={acknowledgeNotifications}><button type="submit" className="min-h-11 text-label font-semibold text-brand-700 underline">Mark notifications read</button></form>}</div>}
    {!result.ok ? <p role="alert" className="glass-panel mt-7 rounded-lg p-6">Your leads are temporarily unavailable. Please refresh this page.</p> :
      result.rows.length === 0 ? <div className="glass-panel mt-7 rounded-lg p-6"><h2 className="font-display text-heading-3">No enquiries received</h2><p className="mt-2 text-body-sm text-ink-700">Enquiries appear here when a listing is assigned to your seller account.</p></div> :
        <div className="mt-7 grid gap-4 sm:grid-cols-2">{result.rows.map((lead) => {
          const property = getPropertySummary(lead.listing_public_id)
          return <article key={lead.id} className="glass-card rounded-lg border border-border-subtle p-5 shadow-e1">
            <h2 className="font-display text-heading-3">{property ? <Link href={propertyPath(property.slug, property.publicId)} className="text-brand-700 underline">{property.society ?? property.title}</Link> : lead.listing_title}</h2>
            <p className="mt-2 text-body-sm text-ink-700">{lead.duplicate_of ? 'Follow-up · ' : ''}{new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone: 'Asia/Kolkata' }).format(new Date(lead.created_at))}</p>
            <p className="mt-3 font-semibold text-ink-900">{lead.buyer_name}</p>
            <p className="text-body-sm text-ink-700">Buyer number: {lead.buyer_phone}</p>
            {lead.message && <p className="mt-3 whitespace-pre-wrap text-body-sm text-ink-900">{lead.message}</p>}
            <form action={setLeadStatus} className="mt-4 flex flex-wrap items-end gap-3">
              <input type="hidden" name="enquiryId" value={lead.id} />
              <label className="flex flex-col gap-1 text-label font-semibold">Lead status
                <select name="status" defaultValue={lead.status} className="min-h-11 rounded-md border border-border-subtle bg-surface-000 px-3 text-ink-900"><option value="new">New</option><option value="contacted">Contacted</option><option value="closed">Closed</option></select>
              </label>
              <button type="submit" className="min-h-11 rounded-md bg-brand-700 px-4 font-semibold text-white focus-visible:outline-2 focus-visible:outline-focus-ring">Update status</button>
            </form>
          </article>
        })}</div>}
  </div></PageShell>
}
