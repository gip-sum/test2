import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { PageShell } from '@/components/layout/PageShell'
import { getVerifiedUser } from '@/lib/auth/session'
import { listLeads, listLeadEvents } from '@/lib/enquiry/queries'
import { getPropertySummary } from '@/lib/property/queries'
import { propertyPath } from '@/lib/property/public-id'

export const metadata: Metadata = { title: 'My enquiries', robots: { index: false, follow: false } }

export default async function MyEnquiries() {
  const user = await getVerifiedUser()
  if (!user) redirect('/login?next=%2Faccount%2Fenquiries')
  const result = await listLeads(user, 'buyer')
  const events = result.ok ? await listLeadEvents(user, result.rows.map((row) => row.id)) : null
  return <PageShell><div className="mx-auto max-w-5xl px-4 py-9 sm:py-14">
    <p className="text-overline uppercase tracking-widest text-brand-700">Your space</p>
    <h1 className="mt-2 font-display text-heading-1 text-ink-900">My enquiries</h1>
    <p className="mt-2 text-body text-ink-700">Enquiries you sent while signed in.</p>
    {!result.ok ? <p role="alert" className="glass-panel mt-7 rounded-lg p-6">Your enquiries are temporarily unavailable. Please refresh this page.</p> :
      result.rows.length === 0 ? <div className="glass-panel mt-7 rounded-lg p-6"><h2 className="font-display text-heading-3">No enquiries yet</h2><p className="mt-2">Explore homes and contact a seller when you find one you like.</p><Link href="/buy/kolkata" className="mt-4 inline-flex min-h-11 items-center text-brand-700 underline">Browse properties</Link></div> :
        <div className="mt-7 grid gap-4 sm:grid-cols-2">{result.rows.map((lead) => {
          const property = getPropertySummary(lead.listing_public_id)
          const history = events?.filter((event) => event.enquiry_id === lead.id)
          return <article key={lead.id} className="glass-card rounded-lg border border-border-subtle p-5 shadow-e1">
            <h2 className="font-display text-heading-3 text-ink-900">{property ? <Link className="text-brand-700 underline underline-offset-4" href={propertyPath(property.slug, property.publicId)}>{property.society ?? property.title}</Link> : lead.listing_title}</h2>
            <p className="mt-2 text-body-sm text-ink-700">Sent {new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone: 'Asia/Kolkata' }).format(new Date(lead.created_at))} · Status: {lead.status}</p>
            {lead.duplicate_of && <p className="mt-2 text-body-sm text-ink-700">Follow-up enquiry</p>}
            {lead.message && <p className="mt-3 whitespace-pre-wrap text-body-sm text-ink-900">{lead.message}</p>}
            {history?.length ? <div className="mt-4 border-t border-border-subtle pt-3"><h3 className="font-semibold">History</h3><ol className="mt-2 list-inside list-disc text-body-sm text-ink-700">{history.map((event, index) => <li key={`${event.created_at}-${index}`}>{event.event_type === 'status_changed' ? `Status changed to ${event.status}` : event.event_type === 'repeated' ? 'Follow-up recorded' : 'Enquiry recorded'}</li>)}</ol></div> : events === null ? <p role="alert" className="mt-3 text-body-sm">Lead history is temporarily unavailable.</p> : null}
          </article>
        })}</div>}
    <Link href="/account" className="mt-8 inline-flex min-h-11 items-center text-brand-700 underline">Back to account</Link>
  </div></PageShell>
}
