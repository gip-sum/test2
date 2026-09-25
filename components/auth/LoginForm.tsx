'use client'

import { useActionState, useEffect, useRef, type ReactNode } from 'react'
import Link from 'next/link'
import { requestCode, verifyCode, type CodeState, type VerifyState } from '@/app/login/actions'
import { Button } from '@/components/ui/Button'
import { BRAND } from '@/lib/brand'

const initialCode: CodeState = { status: 'idle', message: '', email: '' }
const initialVerify: VerifyState = { status: 'idle', message: '' }

const inputClass =
  'mt-2 h-12 w-full rounded-md border border-border-strong bg-surface-000 px-3.5 text-body text-ink-900 placeholder:text-ink-500 hover:border-ink-500 aria-[invalid=true]:border-2 aria-[invalid=true]:border-danger-600'

/**
 * A message the form must not hide: an error (announced as an alert) or a
 * status. The icon and the wording carry the meaning; colour only repeats it.
 */
function Notice({ tone, role, id, children }: { tone: 'error' | 'info'; role: 'alert' | 'status'; id?: string; children: ReactNode }) {
  return (
    <p
      id={id}
      role={role}
      className={tone === 'error'
        ? 'flex gap-3 rounded-md border border-danger-600/30 bg-danger-100 p-3.5 text-body-sm text-ink-900'
        : 'flex gap-3 rounded-md border border-border-strong bg-surface-100 p-3.5 text-body-sm text-ink-700'}
    >
      <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false" className={`mt-px size-5 shrink-0 ${tone === 'error' ? 'text-danger-600' : 'text-brand-600'}`} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
        <circle cx="10" cy="10" r="7.5" />
        {tone === 'error' ? <path d="M10 6v4.5M10 13.6v.1" /> : <path d="M10 9v4.6M10 6.4v.1" />}
      </svg>
      <span>{children}</span>
    </p>
  )
}

/** Google's own "G", as its sign-in branding requires. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" className="size-5 shrink-0">
      <path className="google-red" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path className="google-blue" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path className="google-yellow" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path className="google-green" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}

/**
 * Email one-time code and Google — the only two ways in.
 *
 * Behaviour lives in app/login/actions.ts and the Google route handlers;
 * this component only presents it. It never claims more than the server
 * said: a requested code is "emailed if this address can sign in", because
 * the server deliberately does not reveal whether an account exists.
 */
export function LoginForm({ mode, next, configured, googleConfigured, googleError }: {
  mode: 'login' | 'register'; next: string; configured: boolean; googleConfigured: boolean; googleError: boolean
}) {
  const [request, requestAction, requestPending] = useActionState(requestCode, initialCode)
  const [verify, verifyAction, verifyPending] = useActionState(verifyCode, initialVerify)
  const emailRef = useRef<HTMLInputElement>(null)
  const codeRef = useRef<HTMLInputElement>(null)

  // Focus follows the task (Phase 6, §6): back to the email field when it
  // was rejected, and on to the code field once a code has been requested —
  // otherwise the submit button that had focus unmounts and focus falls to
  // the top of the document. Each action returns a new state object, so a
  // second identical error still moves focus.
  useEffect(() => {
    if (request.status === 'error') emailRef.current?.focus()
    if (request.status === 'sent') codeRef.current?.focus()
  }, [request])
  useEffect(() => {
    if (verify.status === 'error') {
      codeRef.current?.focus()
      codeRef.current?.select()
    }
  }, [verify])

  const register = mode === 'register'
  return (
    <div className="login-card glass-panel rounded-[24px] border border-border-subtle p-5 shadow-e2 sm:p-9">
      <p className="hidden items-center gap-2 rounded-full border border-brand-600/15 bg-brand-100 px-3.5 py-1.5 text-overline font-semibold uppercase tracking-[0.1em] text-brand-700 sm:inline-flex">
        <span aria-hidden="true">✦</span> {register ? `New to ${BRAND.name}` : 'Welcome back'}
      </p>
      <h1 className="font-display text-heading-1 text-ink-900 sm:mt-4 sm:text-[36px] sm:leading-[1.1]">{register ? 'Create your account' : 'Log in'}</h1>
      <p className="mt-2 text-body text-ink-700">
        {register ? 'Save the homes you like and keep your enquiries together.' : 'Pick up your search where you left off.'}
      </p>

      {!configured && (
        <div className="mt-6">
          <Notice tone="info" role="alert">Account sign-in is unavailable while authentication is being set up.</Notice>
        </div>
      )}

      {configured && <>
        {googleError && (
          <div className="mt-6">
            <Notice tone="error" role="alert">Google sign-in was cancelled or could not be completed. You can try again or use email.</Notice>
          </div>
        )}

        {googleConfigured && <>
          <a
            href={`/api/auth/google/start?next=${encodeURIComponent(next)}`}
            className="mt-6 flex min-h-12 w-full items-center justify-center gap-3 rounded-md border border-border-strong bg-surface-000 px-4 text-label font-semibold text-ink-900 shadow-e1 transition-colors hover:border-brand-600 hover:bg-surface-100"
          >
            <GoogleMark />
            Continue with Google
          </a>
          <p className="login-divider mt-5 text-label">or use your email</p>
        </>}

        {request.status !== 'sent' ? (
          <form action={requestAction} className={googleConfigured ? 'mt-4 space-y-4' : 'mt-6 space-y-4'}>
            <input type="hidden" name="mode" value={mode} />
            <div>
              <label htmlFor="auth-email" className="block text-label font-semibold text-ink-900">Email address</label>
              <p id="auth-email-hint" className="mt-1 text-body-sm text-ink-500">We’ll email you a six-digit code to sign in.</p>
              <input
                ref={emailRef}
                id="auth-email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                required
                maxLength={254}
                placeholder="you@example.com"
                defaultValue={request.email}
                aria-invalid={request.status === 'error' || undefined}
                aria-describedby={request.message ? 'auth-email-hint auth-email-message' : 'auth-email-hint'}
                className={inputClass}
              />
            </div>
            {request.message && (
              <Notice id="auth-email-message" tone={request.status === 'error' ? 'error' : 'info'} role={request.status === 'error' ? 'alert' : 'status'}>
                {request.message}
              </Notice>
            )}
            <Button type="submit" size="lg" fullWidth loading={requestPending}>{register ? 'Create account with email' : 'Send sign-in code'}</Button>
          </form>
        ) : (
          <div className="mt-6">
            <Notice tone="info" role="status">{request.message}</Notice>
            <p className="mt-4 rounded-md border border-border-subtle bg-surface-100 px-3.5 py-3 text-label text-ink-700">
              Address: <span className="break-all font-semibold text-ink-900">{request.email}</span>
            </p>
            <form action={verifyAction} className="mt-5 space-y-4">
              <input type="hidden" name="email" value={request.email} />
              <input type="hidden" name="next" value={next} />
              <div>
                <label htmlFor="auth-code" className="block text-label font-semibold text-ink-900">Six-digit code</label>
                <input
                  ref={codeRef}
                  id="auth-code"
                  name="code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  autoComplete="one-time-code"
                  required
                  aria-invalid={verify.status === 'error' || undefined}
                  aria-describedby={verify.message ? 'auth-code-message' : undefined}
                  className={`${inputClass} h-14 text-center font-display text-[22px] tracking-[0.35em] tabular`}
                />
              </div>
              {verify.message && <Notice id="auth-code-message" tone="error" role="alert">{verify.message}</Notice>}
              <Button type="submit" size="lg" fullWidth loading={verifyPending}>Verify and continue</Button>
            </form>
            <button type="button" onClick={() => window.location.reload()} className="mt-4 inline-flex min-h-11 items-center text-label font-semibold text-brand-600 underline underline-offset-4">
              Use another email or request a new code
            </button>
          </div>
        )}

        <p className="mt-7 border-t border-border-subtle pt-5 text-body text-ink-700">
          {register ? 'Already registered? ' : 'New here? '}
          <Link className="font-semibold text-brand-600 underline underline-offset-4" href={`/login?mode=${register ? 'login' : 'register'}&next=${encodeURIComponent(next)}`}>
            {register ? 'Log in' : 'Create an account'}
          </Link>
        </p>
      </>}
    </div>
  )
}
