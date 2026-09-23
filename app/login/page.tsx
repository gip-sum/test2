import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { PageShell } from '@/components/layout/PageShell'
import { LoginForm } from '@/components/auth/LoginForm'
import { getVerifiedUser } from '@/lib/auth/session'
import { safeReturnPath } from '@/lib/auth/validation'
import { authConfig } from '@/lib/auth/provider'

export const metadata: Metadata = { title: 'Log in or register', robots: { index: false, follow: false } }

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ mode?: string; next?: string }> }) {
  const { mode, next } = await searchParams
  const returnPath = safeReturnPath(next)
  if (await getVerifiedUser()) redirect(returnPath)
  return <PageShell><div className="mx-auto max-w-lg px-4 py-10 sm:py-16"><LoginForm mode={mode === 'register' ? 'register' : 'login'} next={returnPath} configured={Boolean(authConfig())} /></div></PageShell>
}
