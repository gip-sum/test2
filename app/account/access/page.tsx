import type { Metadata } from 'next'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { PageShell } from '@/components/layout/PageShell'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { ACCESS_COOKIE } from '@/lib/auth/cookies'
import { authRequest, validUser, type AuthUser } from '@/lib/auth/provider'
import { marketplaceAccess } from '@/lib/auth/access'
import { signOut } from '@/app/login/actions'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Marketplace account access', robots: { index: false, follow: false } }
export default async function AccountAccessPage() {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value
  if (!token) redirect('/login?next=%2Faccount')
  const identity = await authRequest<AuthUser>('/user', 'GET', undefined, token)
  const access = identity.ok && validUser(identity.data) ? await marketplaceAccess(token) : 'unavailable'
  if (access === 'active') redirect('/account')
  return <PageShell><div className="mx-auto max-w-xl px-4 py-12"><h1 className="font-display text-heading-1 text-ink-900">{access === 'suspended' ? 'Marketplace access suspended' : 'Account access unavailable'}</h1>
    <p role="status" className="mt-4 text-body text-ink-700">{access === 'suspended' ? 'Your account cannot use protected marketplace features while suspended. You can still browse public listings and sign out. Access returns when an administrator restores the account.' : 'We could not confirm your marketplace access. Please try again shortly.'}</p>
    <div className="mt-6 flex flex-wrap gap-4"><Link href="/account/access" className="inline-flex min-h-11 items-center rounded-md bg-brand-600 px-4 font-semibold text-on-brand">Check access again</Link><Link href="/" className="inline-flex min-h-11 items-center font-semibold text-ink-900 underline">Browse homes</Link><form action={signOut}><SubmitButton variant="text" className="text-ink-900">Sign out</SubmitButton></form></div>
  </div></PageShell>
}
