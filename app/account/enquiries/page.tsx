import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { PageShell } from '@/components/layout/PageShell'
import { getVerifiedUser } from '@/lib/auth/session'
import { listBuyerEnquiries } from '@/lib/enquiry/queries'
import { getPropertySummary } from '@/lib/property/queries'
import { propertyPath } from '@/lib/property/public-id'
import { SELLER_LABEL } from '@/lib/property/types'
import type { LeadStatus, NotificationStatus } from '@/lib/enquiry/types'

export const metadata: Metadata = { title: 'Your enquiries', robots: { index: false, follow: false } }

const leadLabel: Record<LeadStatus, string> = { NEW: 'Sent', CONTACTED: 'Seller contacted you', CLOSED: 'Closed' }
const deliveryLabel: Record<NotificationStatus, string> = {
  PENDING: 'Notification pending', DELIVERED: 'Delivery accepted', FAILED: 'Notification needs retry', UNCONFIGURED: 'Notification unavailable',
}

function showDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(value))
}

export default async function EnquiryHistoryPage() {
  const user = await getVerifiedUser()
  if (!user) redirect('/login?next=%2Faccount%2Fenquiries')
  const result = await listBuyerEnquiries(user)
  return <PageShell><main className="mx-auto max-w-5xl px-4 py-9 sm:py-14">
    <p className="text-overline uppercase tracking-widest text-brand-700">Your space</p>
    <h1 className="mt-2 font-display text-heading-1 text-ink-900">Your enquiries</h1>
    <p className="mt-2 text-body text-ink-700">A private history of the properties you contacted while signed in.</p>
    {!result.ok ? <section role="alert" className="glass-panel mt-8 rounded-lg border border-border-subtle p-6">
      <h2 className="font-display text-heading-3">Your enquiries are temporarily unavailable</h2>
      <p className="mt-2 text-body-sm">Please refresh this page in a moment.</p>
    </section> : result.rows.length === 0 ? <section className="glass-panel mt-8 rounded-lg border border-border-subtle p-7 sm:p-10">
      <h2 className="font-display text-heading-3 text-ink-900">No enquiries yet</h2>
      <p className="mt-2 text-body text-ink-700">When you contact a seller while signed in, the enquiry will appear here.</p>
      <Link href="/buy/kolkata" className="mt-6 inline-flex min-h-11 items-center rounded-md bg-brand-700 px-5 font-semibold text-white focus-visible:outline-2 focus-visible:outline-focus-ring">Browse properties</Link>
    </section> : <div className="mt-7 grid gap-5 md:grid-cols-2">
      {result.rows.map((enquiry) => {
        const property = getPropertySummary(enquiry.listingPublicId)
        return <article key={enquiry.id} className="glass-card rounded-lg border border-border-subtle p-5 shadow-e1">
          <div className="flex flex-wrap gap-2 text-caption font-semibold">
            <span className="rounded-full bg-brand-100 px-2.5 py-1 text-brand-700">{leadLabel[enquiry.status]}</span>
            <span className="rounded-full bg-surface-100 px-2.5 py-1 text-ink-700">{deliveryLabel[enquiry.notificationStatus]}</span>
            {enquiry.duplicateOf && <span className="rounded-full bg-warn-100 px-2.5 py-1 text-ink-900">Repeat enquiry</span>}
          </div>
          <h2 className="mt-4 font-display text-heading-3 text-ink-900">{enquiry.listingTitle}</h2>
          <p className="mt-1 text-body-sm text-ink-700">{enquiry.listingLocality}</p>
          <dl className="mt-4 grid gap-3 text-body-sm sm:grid-cols-2">
            <div><dt className="text-ink-500">Sent</dt><dd className="mt-1 font-semibold text-ink-900">{showDate(enquiry.createdAt)}</dd></div>
            <div><dt className="text-ink-500">Posted by</dt><dd className="mt-1 font-semibold text-ink-900">{enquiry.sellerName ?? SELLER_LABEL[enquiry.sellerType]}</dd></div>
          </dl>
          {enquiry.message && <div className="mt-4"><p className="text-caption font-semibold text-ink-500">Your message</p><p className="mt-1 whitespace-pre-wrap text-body-sm text-ink-700">{enquiry.message}</p></div>}
          {property ? <Link href={propertyPath(property.slug, property.publicId)} className="mt-4 inline-flex min-h-11 items-center text-label font-semibold text-brand-700 underline underline-offset-4">View property</Link> : <p className="mt-4 text-body-sm text-ink-500">This listing is no longer available.</p>}
        </article>
      })}
    </div>}
    <Link href="/account" className="mt-8 inline-flex min-h-11 items-center text-label text-brand-700 underline underline-offset-4">Back to account</Link>
  </main></PageShell>
}
