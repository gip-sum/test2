import type { ComponentType } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { GuestActivity } from '@/components/home/GuestActivity'
import { PageShell } from '@/components/layout/PageShell'
import { ChevronRightIcon, HeartIcon, MailIcon } from '@/components/ui/icons'
import { getVerifiedUser } from '@/lib/auth/session'
import { countUnreadNotifications, listLeads } from '@/lib/enquiry/queries'
import { listSaved } from '@/lib/saved/queries'

export const metadata: Metadata = { title: 'Your activity', robots: { index: false, follow: false } }

// listLeads and the notification count stop at 100 rows; a full page is
// "100 or more", never a precise-looking 100.
const LIMIT = 100

type Row = { href: string; title: string; body: string; status: string | null; Icon: ComponentType<{ className?: string }>; supply?: boolean }

/** What a count can truthfully say; null when it could not be read. */
function describe(count: number | null, one: string, many: string): string | null {
  if (count === null) return null
  if (count === 0) return 'None yet'
  if (count >= LIMIT) return `${LIMIT} or more ${many}`
  return `${count} ${count === 1 ? one : many}`
}

/**
 * The Activity tab's hub (Phase D): the minimum shell the phone bar needs.
 *
 * It links to what a visitor has already done, through the existing pages
 * and queries — no data model of its own. Each count comes from the same
 * query its page runs; when one cannot be read the link stays and the
 * count is left out, never guessed. Recently viewed, saved searches,
 * alerts and reveal history are not shown until their phases build them
 * (docs/ROADMAP.md, "Activity sections waiting on their phase").
 *
 * This route has a public guest landing. Private queries below run only
 * after verifying the user; other account routes remain guarded.
 */
export default async function ActivityPage() {
  const user = await getVerifiedUser()
  if (!user) return <GuestActivity />

  const [saved, sent, unread] = await Promise.all([listSaved(user), listLeads(user, 'buyer'), countUnreadNotifications(user)])

  const buying: Row[] = [
    {
      href: '/account/saved', title: 'Saved homes', body: 'The homes you tapped the heart on.', Icon: HeartIcon,
      status: describe(saved.ok ? saved.rows.length : null, 'saved home', 'saved homes'),
    },
    {
      href: '/account/enquiries', title: 'Your enquiries', body: 'Every listing you have asked about while signed in.', Icon: MailIcon,
      status: describe(sent.ok ? sent.rows.length : null, 'enquiry', 'enquiries'),
    },
  ]
  const listing: Row[] = [
    {
      href: '/dashboard/enquiries', title: 'Enquiries on your listings', body: 'Buyers and tenants who got in touch about a home you listed.', Icon: MailIcon, supply: true,
      // Unread only: the inbox's own "new" figure. Nothing unread says nothing.
      status: unread ? (unread >= LIMIT ? `${LIMIT} or more new` : `${unread} new`) : null,
    },
  ]

  return (
    <PageShell>
      <div className="mx-auto max-w-3xl px-4 py-9 sm:py-14">
        <p className="text-overline uppercase tracking-widest text-brand-700">Your space</p>
        <h1 className="mt-2 font-display text-heading-1 text-ink-900">Your activity</h1>
        <p className="mt-2 text-body text-ink-700">The homes you saved and the conversations you started, in one place.</p>
        <Group id="activity-buying" title="Finding a home" rows={buying} />
        <Group id="activity-listing" title="Your listings" rows={listing} />
      </div>
    </PageShell>
  )
}

function Group({ id, title, rows }: { id: string; title: string; rows: Row[] }) {
  return (
    <section aria-labelledby={id} className="mt-8">
      <h2 id={id} className="text-overline font-semibold uppercase tracking-[0.12em] text-ink-500">{title}</h2>
      <ul className="mt-3 grid gap-2">
        {rows.map(({ href, title: label, body, status, Icon, supply }) => (
          <li key={href}>
            <Link href={href} className="flex min-h-16 items-center gap-3 rounded-lg border border-border-subtle bg-surface-000 px-3 py-3 hover:border-border-strong">
              <span className={supply ? 'hub-icon hub-icon-supply' : 'hub-icon'} aria-hidden="true"><Icon className="size-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-ink-900">{label}</span>
                <span className="block text-body-sm text-ink-700">{body}</span>
                {status && <span className="mt-1 block text-body-sm font-semibold text-brand-700">{status}</span>}
              </span>
              <ChevronRightIcon className="size-4 shrink-0 text-ink-500" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
