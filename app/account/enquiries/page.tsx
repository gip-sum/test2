import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { PageShell } from '@/components/layout/PageShell'
import { getVerifiedUser } from '@/lib/auth/session'
import { listLeads, listLeadEvents } from '@/lib/enquiry/queries'
import type { Lead } from '@/lib/enquiry/queries'
import { getPropertySummary } from '@/lib/property/queries'
import { propertyPath } from '@/lib/property/public-id'
import { buttonClassName } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { MailIcon, SearchIcon } from '@/components/ui/icons'

export const metadata: Metadata = { title: 'My enquiries', robots: { index: false, follow: false } }

/**
 * The status the seller has set, in the inbox's own words (UI-19's New /
 * Contacted / Closed), with what it means from this side. It is the
 * seller's mark, so it says so: the platform does not know whether a
 * reply actually arrived.
 */
const STATUS: Record<Lead['status'], { label: string; note: string }> = {
  new: { label: 'New', note: 'the seller has not marked it answered yet' },
  contacted: { label: 'Contacted', note: 'the seller has marked it answered' },
  closed: { label: 'Closed', note: 'the seller has closed it' },
}
const sent = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone: 'Asia/Kolkata' })

/**
 * The enquiries a signed-in buyer sent (Phase 17). UI-22 brought it into
 * the account pages' frame — the mint band and 1400px frame of Saved
 * (UI-19), white cards, the status in words — from the pre-redesign layout
 * that printed the raw status codes. What it reads and shows is unchanged.
 */
export default async function MyEnquiries() {
  const user = await getVerifiedUser()
  if (!user) redirect('/login?next=%2Faccount%2Fenquiries')
  const result = await listLeads(user, 'buyer')
  const events = result.ok ? await listLeadEvents(user, result.rows.map((row) => row.id)) : null
  const count = result.ok ? result.rows.length : null

  return <PageShell>
    <header className="search-band">
      <div className="home-container flex flex-wrap items-end justify-between gap-x-6 gap-y-4 pb-6 pt-7 lg:pb-8 lg:pt-10">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-overline uppercase text-brand-600">
            <span aria-hidden className="h-0.5 w-6 shrink-0 rounded-full bg-brand-500" />
            <Link href="/account" className="-my-3 inline-flex min-h-11 items-center hover:underline">Your account</Link>
          </p>
          <h1 className="mt-2 font-display text-heading-2 text-ink-900 lg:text-display-1">My enquiries</h1>
          <p className="mt-1.5 text-body text-ink-700 lg:text-body-lg">
            {count ? <><span className="font-semibold text-ink-900 tabular">{count}</span> {count === 1 ? 'enquiry' : 'enquiries'} you sent while signed in</> : 'Enquiries you sent while signed in.'}
          </p>
        </div>
        {count ? <Link href="/buy/kolkata" className={buttonClassName({ variant: 'secondary' })}><SearchIcon className="size-4" />Find more homes</Link> : null}
      </div>
    </header>

    <div className="home-container py-6 lg:py-9">
      {!result.ok ? <ErrorState surface="card" title="Your enquiries are temporarily unavailable">Please try refreshing this page in a moment.</ErrorState>
        : result.rows.length === 0 ? <EmptyState surface="card" icon={<MailIcon />} className="mx-auto max-w-2xl" title="No enquiries yet"
          action={<><Link href="/buy/kolkata" className={buttonClassName({ variant: 'primary' })}>Browse homes for sale</Link><Link href="/rent/kolkata" className={buttonClassName({ variant: 'secondary' })}>Browse homes to rent</Link></>}>
          When you contact a seller about a home while signed in, the enquiry and what the seller has done with it appear here.
        </EmptyState>
          : <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{result.rows.map((lead) => {
            const property = lead.listing_public_id ? getPropertySummary(lead.listing_public_id) : null
            // A real listing links to its public page; if it has since left
            // public view, that page says so honestly.
            const href = property ? propertyPath(property.slug, property.publicId) : lead.listing_id ? `/listing/${lead.listing_id}` : null
            const history = events?.filter((event) => event.enquiry_id === lead.id)
            const state = STATUS[lead.status]
            return <article key={lead.id} className="flex flex-col rounded-lg border border-border-subtle bg-surface-000 p-5 shadow-e1">
              <h2 className="text-body-lg font-semibold text-ink-900">{href ? <Link className="-my-3 inline-flex min-h-11 items-center text-brand-700 underline underline-offset-4 hover:decoration-2" href={href}>{property ? property.society ?? property.title : lead.listing_title}</Link> : lead.listing_title}</h2>
              <p className="mt-1 text-body-sm text-ink-700">Sent {sent.format(new Date(lead.created_at))}{lead.duplicate_of && ' · Follow-up enquiry'}</p>
              <p className="mt-3 text-body-sm text-ink-700"><span className="font-semibold text-ink-900">{state?.label ?? lead.status}</span>{state && ` — ${state.note}`}</p>
              {lead.message && <p className="mt-3 whitespace-pre-wrap border-t border-border-subtle pt-3 text-body-sm text-ink-900">{lead.message}</p>}
              {history?.length ? <div className="mt-4 border-t border-border-subtle pt-3">
                <h3 className="text-label font-semibold text-ink-900">History</h3>
                <ol className="mt-2 grid gap-1 text-body-sm text-ink-700">{history.map((event, index) => <li key={`${event.created_at}-${index}`}>{event.event_type === 'status_changed' ? `Marked ${STATUS[event.status]?.label ?? event.status}` : event.event_type === 'repeated' ? 'Follow-up recorded' : 'Enquiry recorded'}</li>)}</ol>
              </div> : events === null ? <p role="alert" className="mt-3 text-body-sm text-ink-700">Its history is temporarily unavailable.</p> : null}
            </article>
          })}</div>}
    </div>
  </PageShell>
}
