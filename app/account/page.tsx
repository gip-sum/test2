import type { ComponentType, ReactNode } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { PageShell } from '@/components/layout/PageShell'
import { ProfileForm } from '@/components/account/ProfileForm'
import { signOut } from '@/app/login/actions'
import { getVerifiedUser } from '@/lib/auth/session'
import { getBuyerProfile } from '@/lib/account/queries'
import { describeCount, describeUnread } from '@/lib/account/counts'
import { countUnreadNotifications, listLeads } from '@/lib/enquiry/queries'
import { listSaved, listSavedListings } from '@/lib/saved/queries'
import { getAllLocalitySlugs, getLocationBySlug } from '@/lib/location/queries'
import { Button } from '@/components/ui/Button'
import { CheckIcon, ChevronRightIcon, GridIcon, HeartIcon, HomeIcon, KeyIcon, MailIcon, PlusIcon } from '@/components/ui/icons'
import { cn } from '@/lib/cn'

export const metadata: Metadata = { title: 'Your account', robots: { index: false, follow: false } }

const knownDate = (value?: string | null): value is string => Boolean(value && !Number.isNaN(Date.parse(value)))

function showDate(value?: string | null) {
  if (!knownDate(value)) return 'Not available yet'
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone: 'Asia/Kolkata' }).format(new Date(value))
}

type Row = { href: string; label: string; note: string; status?: string | null; Icon: ComponentType<{ className?: string }>; supply?: boolean }

/**
 * The account (Phase 6; organised as a settings screen in UI-19): who you
 * are, the places your activity lives, your tools as a seller, your details,
 * and how you sign in — the same links, details and actions the page always
 * had, in groups. Nothing here is a new setting.
 *
 * Each group is one white list of rows, the way a phone's settings are,
 * rather than a stack of cards: every row is one 44px-plus link with its
 * icon, what it is and, where its query answered, its count — the same
 * reads and wording as the Activity hub (lib/account/counts), so the two
 * never disagree. Server-rendered; only the profile form hydrates.
 */
export default async function AccountPage() {
  const user = await getVerifiedUser()
  if (!user) redirect('/login?next=%2Faccount')
  const [result, saved, savedListings, sent, unread] = await Promise.all([getBuyerProfile(user), listSaved(user), listSavedListings(user), listLeads(user, 'buyer'), countUnreadNotifications(user)])
  const localities = getAllLocalitySlugs().map((slug) => ({ slug, name: getLocationBySlug(slug)?.name ?? slug }))
    .sort((a, b) => a.name.localeCompare(b.name))
  const name = result.ok ? result.profile?.full_name?.trim() || null : null
  const listingSaves = savedListings.ok ? savedListings.rows.length : savedListings.missing ? 0 : null

  const activity: Row[] = [
    { href: '/account/saved', label: 'Saved homes', note: 'Homes you tapped the heart on', Icon: HeartIcon,
      status: describeCount(saved.ok && listingSaves !== null ? saved.rows.length + listingSaves : null, 'saved home', 'saved homes') },
    { href: '/account/enquiries', label: 'My enquiries', note: 'Listings you asked about while signed in', Icon: MailIcon,
      status: describeCount(sent.ok ? sent.rows.length : null, 'enquiry', 'enquiries') },
    { href: '/account/activity', label: 'Activity', note: 'Everything you have saved and started, in one place', Icon: GridIcon },
  ]
  const selling: Row[] = [
    // No count, as on the Activity hub: the dashboard's figures need its own reads.
    { href: '/dashboard', label: 'My properties', note: 'Drafts and listings, with their status', Icon: HomeIcon, supply: true },
    { href: '/dashboard/enquiries', label: 'Seller inbox', note: 'Buyers who contacted you about a listing', Icon: MailIcon, supply: true, status: describeUnread(unread) },
    { href: '/post', label: 'Post a property', note: 'Free; stays private until you submit it', Icon: PlusIcon, supply: true },
  ]

  return <PageShell>
    {/* Identity on the mint band (UI-15's band), the working surfaces on white below. */}
    <header className="search-band">
      <div className="home-container flex items-center gap-4 pb-6 pt-7 lg:gap-5 lg:pb-8 lg:pt-10">
        <span aria-hidden className="grid size-14 shrink-0 place-items-center rounded-full bg-brand-600 font-display text-heading-2 text-on-brand lg:size-16">{(name ?? user.email).charAt(0).toUpperCase()}</span>
        <div className="min-w-0">
          <h1 className="font-display text-heading-2 text-ink-900 lg:text-display-1">Your account</h1>
          <p className="mt-1 min-w-0 text-body text-ink-700">
            {name && <><span className="font-semibold text-ink-900">{name}</span><span aria-hidden> · </span></>}
            <span className="break-all">{user.email}</span>
            {knownDate(user.created_at) && <span className="max-sm:block"><span aria-hidden className="max-sm:hidden"> · </span>Member since {showDate(user.created_at)}</span>}
          </p>
        </div>
      </div>
    </header>

    <div className="home-container grid gap-x-8 gap-y-7 py-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start lg:py-9">
      <div className="grid gap-7 lg:sticky lg:top-24">
        <Group id="account-activity" title="Your activity" rows={activity} />
        <Group id="account-selling" title="Selling" rows={selling} />
      </div>

      <div className="grid min-w-0 gap-7">
        {/* The form's own h2s ("Your details", "Property preferences") are
            the outline here; the group label is visual, the region named. */}
        <section aria-label="Profile">
          <p aria-hidden className="px-1 text-overline font-semibold uppercase tracking-[0.12em] text-ink-500">Profile</p>
          <div className="mt-2.5 rounded-lg border border-border-subtle bg-surface-000 p-5 shadow-e1 sm:p-7">
            {!result.ok && <p role="alert" className="mb-6 rounded-md border border-border-strong bg-warn-100 p-4 text-body-sm text-ink-900">Your saved details are temporarily unavailable. Please try again later.</p>}
            <ProfileForm profile={result.ok ? result.profile : null} localities={localities} disabled={!result.ok} />
          </div>
        </section>

        <section aria-labelledby="account-security">
          <GroupHeading id="account-security">Sign-in &amp; security</GroupHeading>
          <dl className="mt-2.5 divide-y divide-border-subtle rounded-lg border border-border-subtle bg-surface-000 shadow-e1">
            <Detail label="Email address">
              <span className="break-all">{user.email}</span>
              <span className="mt-1 flex items-center gap-1 text-body-sm font-normal text-ink-700">
                {user.email_confirmed_at ? <><CheckIcon className="size-4 text-brand-700" />Email confirmed</> : 'Email confirmation status unavailable'}
              </span>
            </Detail>
            <Detail label="How you sign in"><span className="font-normal text-ink-700">With a code sent to your email, or with Google</span></Detail>
            <div className="grid gap-px sm:grid-cols-2 sm:divide-x sm:divide-border-subtle">
              <Detail label="Account created">{showDate(user.created_at)}</Detail>
              <Detail label="Last sign-in" className="max-sm:border-t max-sm:border-border-subtle">{showDate(user.last_sign_in_at)}</Detail>
            </div>
          </dl>
          <form action={signOut} className="mt-4"><Button variant="secondary" type="submit" className="max-sm:w-full"><KeyIcon className="size-4" />Log out</Button></form>
        </section>
      </div>
    </div>
  </PageShell>
}

function GroupHeading({ id, children }: { id: string; children: ReactNode }) {
  return <h2 id={id} className="px-1 text-overline font-semibold uppercase tracking-[0.12em] text-ink-500">{children}</h2>
}

/** One settings group: a heading and a single white list of rows, each a whole-row link. */
function Group({ id, title, rows }: { id: string; title: string; rows: Row[] }) {
  return <section aria-labelledby={id}>
    <GroupHeading id={id}>{title}</GroupHeading>
    <ul className="mt-2.5 divide-y divide-border-subtle overflow-hidden rounded-lg border border-border-subtle bg-surface-000 shadow-e1">
      {rows.map(({ href, label, note, status, Icon, supply }) => <li key={href}>
        <Link href={href} className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-brand-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-600">
          <span aria-hidden className={cn('hub-icon', supply && 'hub-icon-supply')}><Icon className="size-5" /></span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-ink-900">{label}</span>
            <span className="block text-body-sm text-ink-700">{note}</span>
            {status && <span className="mt-1.5 inline-block rounded-full bg-brand-50 px-2.5 py-0.5 text-caption font-semibold text-brand-700 tabular">{status}</span>}
          </span>
          <ChevronRightIcon className="size-4 shrink-0 text-ink-500" />
        </Link>
      </li>)}
    </ul>
  </section>
}

function Detail({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return <div className={cn('px-4 py-3.5', className)}>
    <dt className="text-body-sm text-ink-500">{label}</dt>
    <dd className="mt-0.5 font-semibold text-ink-900">{children}</dd>
  </div>
}
