'use client'

import { startTransition, useActionState, useEffect, useRef, useState, useTransition, type FormEvent } from 'react'
import Link from 'next/link'
import { submitAuth, type AuthFormState } from '@/app/login/actions'
import { Button } from '@/components/ui/Button'
import { clientProblem, codeProblem, emailProblem } from '@/lib/auth/messages'
import { BRAND } from '@/lib/brand'
import { AuthField, AuthNotice, GoogleButton } from './AuthParts'

const INITIAL: AuthFormState = { step: 'email', email: '' }
type Intent = 'request' | 'resend' | 'verify'
type Focus = 'email' | 'code' | null

/** Where focus belongs after a result: the field at fault, or the next field. */
function focusFor(state: AuthFormState): Focus {
  if (state.error) return state.error.field ?? null
  return state.step === 'code' && state.notice ? 'code' : null
}

const BUSY_TEXT: Record<Intent, string> = {
  request: 'Sending your code…',
  resend: 'Sending a new code…',
  verify: 'Checking your code…',
}

/**
 * Email one-time code and Google — the only two ways in.
 *
 * Behaviour lives in app/login/actions.ts and the Google route handlers;
 * this component only presents it. It never claims more than the server
 * said: a requested code is "emailed if this address can sign in", because
 * the server deliberately does not reveal whether an account exists.
 *
 * TWO PATHS, ONE ACTION (UI-07). Every form posts to the `submitAuth`
 * server action through `useActionState`, so without JavaScript each step
 * is an ordinary POST and the page comes back in the state the action
 * returned. With JavaScript, `onSubmit` takes over (React skips a form
 * action whose submit event was cancelled) and calls the same action
 * itself, for three things the form-action path cannot do:
 *   - check the field first, with the server's own rules and wording, so a
 *     typo costs no round trip;
 *   - refuse a second submission while one is in flight (also enforced by
 *     the busy Button);
 *   - catch a request that never reached the server. Through the form
 *     action, a lost connection threw into the route's error page and the
 *     typed address was gone; here it is a message beside the form.
 */
export function LoginForm({ mode, next, configured, googleConfigured, googleProblem }: {
  mode: 'login' | 'register'; next: string; configured: boolean; googleConfigured: boolean; googleProblem: string | null
}) {
  const [serverState, serverAction] = useActionState(submitAuth, INITIAL)
  const [clientState, setClientState] = useState<AuthFormState | null>(null)
  const [pending, startSubmit] = useTransition()
  const [intent, setIntent] = useState<Intent | null>(null)
  // A successful code verification redirects; the form stays busy until the
  // next page replaces it rather than flashing back to idle.
  const [leaving, setLeaving] = useState(false)
  // Counts attempts, so an identical error twice is a new alert and moves
  // focus again.
  const [attempt, setAttempt] = useState(0)
  const emailRef = useRef<HTMLInputElement>(null)
  const codeRef = useRef<HTMLInputElement>(null)
  const focusNext = useRef<Focus>(null)
  // Set synchronously, so two submit events in one frame cannot both pass
  // before React re-renders with `pending`.
  const inFlight = useRef(false)
  const state = clientState ?? serverState
  // Without JavaScript the page is rendered afresh from each result, and
  // `autoFocus` is the only way to put focus where the result points.
  const serverFocus = clientState ? null : focusFor(serverState)

  // Focus follows the task (Phase 6, §6): to the field that was rejected,
  // and on to the code field once a code has been requested — otherwise the
  // submit button that had focus unmounts and focus falls to the top of the
  // document. A message about the attempt (a busy provider, a lost
  // connection) leaves focus where it was; its alert is announced there.
  useEffect(() => {
    const target = focusNext.current
    focusNext.current = null
    if (target === 'email') emailRef.current?.focus()
    if (target === 'code') {
      codeRef.current?.focus()
      codeRef.current?.select()
    }
  }, [clientState, attempt])

  function show(result: AuthFormState) {
    focusNext.current = focusFor(result)
    setClientState(result)
    setAttempt((n) => n + 1)
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (inFlight.current || pending || leaving) return
    const data = new FormData(event.currentTarget, (event.nativeEvent as SubmitEvent).submitter)
    const which = data.get('intent') as Intent
    const local = which === 'verify' ? codeProblem(data.get('code')) : which === 'request' ? emailProblem(data.get('email')) : null
    if (local) {
      const typed = which === 'request' ? String(data.get('email') ?? '') : state.email
      show({ ...state, email: typed, error: { field: which === 'verify' ? 'code' : 'email', message: local } })
      return
    }
    setIntent(which)
    inFlight.current = true
    startSubmit(async () => {
      try {
        const result = await submitAuth(state, data)
        // No result: the action redirected and Next is navigating.
        if (!result) { setLeaving(true); return }
        startTransition(() => show(result))
      } catch (error) {
        const typed = which === 'request' ? String(data.get('email') ?? '') : state.email
        startTransition(() => show({ ...state, email: typed, error: { message: clientProblem(error, navigator.onLine) } }))
      } finally {
        inFlight.current = false
      }
    })
  }

  const busy = (which: Intent) => (pending || leaving) && intent === which
  const register = mode === 'register'
  const fieldError = (field: 'email' | 'code') => state.error?.field === field ? state.error.message : undefined
  const formError = state.error && !state.error.field ? state.error.message : undefined
  const otherMode = `/login?mode=${register ? 'login' : 'register'}&next=${encodeURIComponent(next)}`
  const thisMode = `/login?mode=${mode}&next=${encodeURIComponent(next)}`

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
          <AuthNotice tone="info" role="alert">Account sign-in is unavailable while authentication is being set up.</AuthNotice>
        </div>
      )}

      {configured && <>
        {/* Spoken progress for the busy buttons; the spinner is decoration. */}
        <p role="status" className="sr-only">{intent && (pending || leaving) ? BUSY_TEXT[intent] : ''}</p>

        {googleProblem && (
          <div className="mt-6">
            <AuthNotice tone="error">{googleProblem}</AuthNotice>
          </div>
        )}

        {googleConfigured && <>
          <GoogleButton href={`/api/auth/google/start?next=${encodeURIComponent(next)}`} />
          <p className="login-divider mt-5 text-label">or use your email</p>
        </>}

        {state.step === 'email' ? (
          // noValidate: the browser's own bubbles are replaced by the same
          // messages the server sends, beside the field, on both paths.
          <form noValidate action={serverAction} onSubmit={submit} className={googleConfigured ? 'mt-4 space-y-4' : 'mt-6 space-y-4'}>
            <input type="hidden" name="mode" value={mode} />
            <AuthField
              inputRef={emailRef}
              id="auth-email"
              label="Email address"
              hint="We’ll email you a six-digit code to sign in."
              error={fieldError('email')}
              errorKey={attempt}
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              enterKeyHint="send"
              autoCapitalize="none"
              spellCheck={false}
              required
              maxLength={254}
              placeholder="you@example.com"
              defaultValue={state.email}
              autoFocus={serverFocus === 'email'}
            />
            {formError && <AuthNotice key={attempt} tone="error">{formError}</AuthNotice>}
            <Button type="submit" name="intent" value="request" size="lg" fullWidth loading={busy('request')}>
              {register ? 'Create account with email' : 'Send sign-in code'}
            </Button>
          </form>
        ) : (
          <div className="mt-6">
            {state.notice && <AuthNotice tone="info">{state.notice}</AuthNotice>}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-x-3 rounded-md border border-border-subtle bg-surface-100 px-3.5 py-1 text-label text-ink-700">
              <p className="min-w-0 py-2">Address: <span className="break-all font-semibold text-ink-900">{state.email}</span></p>
              {/* A plain link without JavaScript (a fresh email step); with
                  it, back to the email step with the address kept, so a
                  typo is one edit away. */}
              <a
                href={thisMode}
                onClick={(event) => {
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
                  event.preventDefault()
                  if (pending || leaving) return
                  focusNext.current = 'email'
                  setClientState({ step: 'email', email: state.email })
                  setAttempt((n) => n + 1)
                }}
                className="inline-flex min-h-11 items-center font-semibold text-brand-700 underline underline-offset-4"
              >
                Change email
              </a>
            </div>
            <form noValidate action={serverAction} onSubmit={submit} className="mt-5 space-y-4">
              <input type="hidden" name="email" value={state.email} />
              <input type="hidden" name="next" value={next} />
              <AuthField
                inputRef={codeRef}
                id="auth-code"
                label="Six-digit code"
                hint="It can take a minute to arrive. If you can’t find it, check your spam folder."
                error={fieldError('code')}
                errorKey={attempt}
                name="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                enterKeyHint="go"
                autoCapitalize="none"
                spellCheck={false}
                // Room for a pasted "123 456"; the server keeps the
                // six-digit rule.
                maxLength={12}
                required
                autoFocus={serverFocus === 'code'}
                className="h-14 text-center font-display text-[22px] tracking-[0.35em] tabular"
              />
              {formError && <AuthNotice key={attempt} tone="error">{formError}</AuthNotice>}
              <Button type="submit" name="intent" value="verify" size="lg" fullWidth loading={busy('verify')}>Verify and continue</Button>
            </form>
            <form noValidate action={serverAction} onSubmit={submit} className="mt-3 flex flex-wrap items-center gap-x-1 text-body-sm text-ink-700">
              <input type="hidden" name="email" value={state.email} />
              <input type="hidden" name="mode" value={mode} />
              <span>Didn’t get a code?</span>
              <Button type="submit" name="intent" value="resend" variant="tertiary" className="-ml-1 px-2 underline underline-offset-4" loading={busy('resend')}>
                Send a new code
              </Button>
            </form>
          </div>
        )}

        <p className="mt-7 border-t border-border-subtle pt-5 text-body text-ink-700">
          {register ? 'Already registered? ' : 'New here? '}
          {/* 44px to the finger, one line to the layout: the padding is
              handed back by equal negative margins (the UI-05 technique). */}
          <Link className="-my-3 inline-block py-3 font-semibold text-brand-600 underline underline-offset-4" href={otherMode}>
            {register ? 'Log in' : 'Create an account'}
          </Link>
        </p>
      </>}
    </div>
  )
}
