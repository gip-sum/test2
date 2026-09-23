'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { requestCode, verifyCode, type CodeState, type VerifyState } from '@/app/login/actions'
import { Button } from '@/components/ui/Button'

const initialCode: CodeState = { status: 'idle', message: '', email: '' }
const initialVerify: VerifyState = { status: 'idle', message: '' }

export function LoginForm({ mode, next, configured, googleConfigured, googleError }: {
  mode: 'login' | 'register'; next: string; configured: boolean; googleConfigured: boolean; googleError: boolean
}) {
  const [request, requestAction, requestPending] = useActionState(requestCode, initialCode)
  const [verify, verifyAction, verifyPending] = useActionState(verifyCode, initialVerify)
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-000 p-5 shadow-e1 sm:p-8">
      <h1 className="font-display text-heading-1 text-ink-900">{mode === 'register' ? 'Create your account' : 'Log in'}</h1>
      {!configured && <p role="alert" className="mt-5 rounded-md border border-border-strong bg-surface-100 p-4 text-body text-ink-700">Account sign-in is unavailable while authentication is being set up.</p>}
      {configured && <>
      {googleError && <p role="alert" className="mt-5 rounded-md border border-border-strong bg-surface-100 p-4 text-body text-ink-700">Google sign-in was cancelled or could not be completed. You can try again or use email.</p>}
      {googleConfigured && <>
        <a href={`/api/auth/google/start?next=${encodeURIComponent(next)}`}
          className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-md border border-border-strong bg-surface-000 px-4 text-label font-semibold text-ink-900 hover:border-brand-600 focus-visible:outline-2 focus-visible:outline-focus-ring">
          <span aria-hidden className="font-display text-lg font-bold">G</span>
          Continue with Google
        </a>
        <p className="mt-5 text-center text-label text-ink-500">or use your email</p>
      </>}
      <p className="mt-2 text-body text-ink-700">Enter your email and we’ll send a six-digit sign-in code.</p>
      {request.status !== 'sent' ? (
        <form action={requestAction} className="mt-6 space-y-4">
          <input type="hidden" name="mode" value={mode} />
          <div>
            <label htmlFor="auth-email" className="block text-label font-semibold text-ink-900">Email address</label>
            <input id="auth-email" name="email" type="email" autoComplete="email" required maxLength={254}
              defaultValue={request.email} aria-invalid={request.status === 'error' || undefined}
              className="mt-1.5 h-12 w-full rounded-md border border-border-strong bg-surface-000 px-3 text-body text-ink-900 focus-visible:outline-2 focus-visible:outline-focus-ring" />
          </div>
          {request.message && <p role={request.status === 'error' ? 'alert' : 'status'} className="text-body text-ink-700">{request.message}</p>}
          <Button type="submit" size="lg" fullWidth loading={requestPending}>{mode === 'register' ? 'Create account with email' : 'Send sign-in code'}</Button>
        </form>
      ) : (
        <div className="mt-6">
          <p role="status" className="text-body text-ink-700">{request.message}</p>
          <p className="mt-2 text-label text-ink-700">Address: {request.email}</p>
          <form action={verifyAction} className="mt-5 space-y-4">
            <input type="hidden" name="email" value={request.email} />
            <input type="hidden" name="next" value={next} />
            <div>
              <label htmlFor="auth-code" className="block text-label font-semibold text-ink-900">Six-digit code</label>
              <input id="auth-code" name="code" type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6}
                autoComplete="one-time-code" required aria-invalid={verify.status === 'error' || undefined}
                className="mt-1.5 h-12 w-full rounded-md border border-border-strong bg-surface-000 px-3 text-body tracking-widest text-ink-900 focus-visible:outline-2 focus-visible:outline-focus-ring" />
            </div>
            {verify.message && <p role="alert" className="text-body text-danger-600">{verify.message}</p>}
            <Button type="submit" size="lg" fullWidth loading={verifyPending}>Verify and continue</Button>
          </form>
          <button type="button" onClick={() => window.location.reload()} className="mt-5 min-h-11 text-label font-semibold text-brand-600 underline">Use another email or request a new code</button>
        </div>
      )}
      <p className="mt-6 border-t border-border-subtle pt-5 text-body text-ink-700">
        {mode === 'register' ? 'Already registered? ' : 'New here? '}
        <Link className="font-semibold text-brand-600 underline" href={`/login?mode=${mode === 'register' ? 'login' : 'register'}&next=${encodeURIComponent(next)}`}>
          {mode === 'register' ? 'Log in' : 'Create an account'}
        </Link>
      </p>
      </>}
    </div>
  )
}
