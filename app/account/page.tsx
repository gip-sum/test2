import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { PageShell } from '@/components/layout/PageShell'
import { signOut } from '@/app/login/actions'
import { getVerifiedUser } from '@/lib/auth/session'
import { Button } from '@/components/ui/Button'

export const metadata: Metadata = { title: 'Your account', robots: { index: false, follow: false } }

export default async function AccountPage() {
  const user = await getVerifiedUser()
  if (!user) redirect('/login?next=%2Faccount')
  return <PageShell><section className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
    <h1 className="font-display text-heading-1 text-ink-900">Your account</h1>
    <div className="mt-6 rounded-lg border border-border-subtle bg-surface-000 p-5 shadow-e1 sm:p-8">
      <h2 className="text-heading-3 text-ink-900">Signed in</h2>
      <p className="mt-2 break-all text-body text-ink-700">{user.email}</p>
      <p className="mt-4 text-body text-ink-700">Profile settings and saved properties are coming in later phases.</p>
      <form action={signOut} className="mt-6"><Button variant="secondary" type="submit">Log out</Button></form>
    </div>
  </section></PageShell>
}
