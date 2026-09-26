import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { PageShell } from '@/components/layout/PageShell'
import { LoginForm } from '@/components/auth/LoginForm'
import { WayHomeScene } from '@/components/auth/WayHomeScene'
import { ScenePlayback } from '@/components/auth/ScenePlayback'
import { getVerifiedUser } from '@/lib/auth/session'
import { safeReturnPath } from '@/lib/auth/validation'
import { authConfig } from '@/lib/auth/provider'
import { googleAvailable } from '@/lib/auth/google'
import { BRAND } from '@/lib/brand'
import './login.css'

export const metadata: Metadata = { title: 'Log in or register', robots: { index: false, follow: false } }

/**
 * Sign-in and registration: email code or Google, nothing else.
 *
 * The scene beside the form is decoration with a job — it makes the
 * wait for an emailed code feel like arriving somewhere — but it carries
 * no information the form does not, and it never reflects auth state: a
 * picture of a letter being delivered would claim an email was sent when
 * the form deliberately does not say whether an address has an account.
 */
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ mode?: string; next?: string; error?: string }> }) {
  const { mode, next, error } = await searchParams
  const returnPath = safeReturnPath(next)
  if (await getVerifiedUser()) redirect(returnPath)
  return (
    <PageShell>
      <div className="login-stage">
        <div className="login-layout">
          <ScenePlayback className="login-art">
            <WayHomeScene className="login-scene" />
            <div className="login-art-copy">
              <p className="login-art-eyebrow"><span aria-hidden="true">✦</span> Your {BRAND.name} account</p>
              <p className="login-art-title">Welcome <em>home.</em></p>
              <p className="login-art-text">Save the homes you love and keep every enquiry in one place.</p>
            </div>
          </ScenePlayback>
          <div className="login-form-col">
            <LoginForm
              mode={mode === 'register' ? 'register' : 'login'}
              next={returnPath}
              configured={Boolean(authConfig())}
              googleConfigured={googleAvailable()}
              googleError={error === 'google'}
            />
          </div>
        </div>
      </div>
    </PageShell>
  )
}
