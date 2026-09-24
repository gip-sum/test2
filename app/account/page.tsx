import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { PageShell } from '@/components/layout/PageShell'
import { ProfileForm } from '@/components/account/ProfileForm'
import { signOut } from '@/app/login/actions'
import { getVerifiedUser } from '@/lib/auth/session'
import { getBuyerProfile } from '@/lib/account/queries'
import { getAllLocalitySlugs, getLocationBySlug } from '@/lib/location/queries'
import { Button } from '@/components/ui/Button'

export const metadata: Metadata = { title: 'Your account', robots: { index: false, follow: false } }

function showDate(value?: string | null) {
  if (!value || Number.isNaN(Date.parse(value))) return 'Not available yet'
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone: 'Asia/Kolkata' }).format(new Date(value))
}

export default async function AccountPage() {
  const user = await getVerifiedUser()
  if (!user) redirect('/login?next=%2Faccount')
  const result = await getBuyerProfile(user)
  const localities = getAllLocalitySlugs().map((slug) => ({ slug, name: getLocationBySlug(slug)?.name ?? slug }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return <PageShell><main className="mx-auto max-w-5xl px-4 py-9 sm:py-14">
    <div className="mb-8">
      <p className="text-overline uppercase tracking-widest text-brand-700">Your space</p>
      <h1 className="mt-2 font-display text-heading-1 text-ink-900">Your account</h1>
      <p className="mt-2 text-body text-ink-700">Manage your details and how you would like to find a home.</p>
    </div>
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_290px] lg:items-start">
      <section aria-label="Profile and preferences" className="glass-panel rounded-lg border border-border-subtle p-5 shadow-e2 sm:p-8">
        {!result.ok && <p role="alert" className="mb-6 rounded-md border border-border-strong bg-warn-100 p-4 text-body-sm text-ink-900">Your saved details are temporarily unavailable. Please try again later.</p>}
        <ProfileForm profile={result.ok ? result.profile : null} localities={localities} disabled={!result.ok} />
      </section>
      <aside className="space-y-6">
        <section className="glass-card rounded-lg border border-border-subtle p-5 shadow-e1">
          <h2 className="font-display text-heading-3 text-ink-900">Your shortlist</h2>
          <p className="mt-2 text-body-sm text-ink-700">Revisit the homes you saved while browsing.</p>
          <Link href="/account/saved" className="mt-3 inline-flex min-h-11 items-center text-label font-semibold text-brand-700 underline underline-offset-4">View saved properties</Link>
        </section>
        <section className="glass-card rounded-lg border border-border-subtle p-5 shadow-e1">
          <h2 className="font-display text-heading-3 text-ink-900">Your enquiries</h2>
          <p className="mt-2 text-body-sm text-ink-700">Track the properties you contacted and their current lead status.</p>
          <Link href="/account/enquiries" className="mt-3 inline-flex min-h-11 items-center text-label font-semibold text-brand-700 underline underline-offset-4">View enquiry history</Link>
        </section>
        <section className="glass-card rounded-lg border border-border-subtle p-5 shadow-e1" aria-labelledby="signin-title">
          <h2 id="signin-title" className="font-display text-heading-3 text-ink-900">Sign-in & settings</h2>
          <p className="mt-4 text-label text-ink-500">Email address</p>
          <p className="mt-1 break-all text-body text-ink-900">{user.email}</p>
          <p className="mt-2 text-body-sm text-ink-700">{user.email_confirmed_at ? 'Email confirmed' : 'Email confirmation status unavailable'}</p>
          <p className="mt-4 text-body-sm text-ink-700">Use your email code or Google to sign in. You can update your preferences in the form beside this card.</p>
          <form action={signOut} className="mt-5"><Button variant="secondary" type="submit">Log out</Button></form>
        </section>
        <section className="glass-card rounded-lg border border-border-subtle p-5 shadow-e1" aria-labelledby="activity-title">
          <h2 id="activity-title" className="font-display text-heading-3 text-ink-900">Account activity</h2>
          <dl className="mt-4 space-y-4 text-body-sm">
            <div><dt className="text-ink-500">Account created</dt><dd className="mt-1 font-semibold text-ink-900">{showDate(user.created_at)}</dd></div>
            <div><dt className="text-ink-500">Last sign-in</dt><dd className="mt-1 font-semibold text-ink-900">{showDate(user.last_sign_in_at)}</dd></div>
          </dl>
          <p className="mt-5 text-body-sm text-ink-700">Explore properties while your account details are saved.</p>
          <Link href="/buy/kolkata" className="mt-3 inline-flex min-h-11 items-center text-label text-brand-700 underline underline-offset-4">Browse properties</Link>
        </section>
      </aside>
    </div>
  </main></PageShell>
}
