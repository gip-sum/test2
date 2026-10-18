'use client'

import { useEffect, useState, type InputHTMLAttributes, type ReactNode, type Ref } from 'react'
import { cn } from '@/lib/cn'

/*
 * The sign-in form's parts (UI-07). Each one is used more than once in the
 * form — two fields, five notices — and each fixes the same wiring in one
 * place: label above, hint and error tied to the field by
 * aria-describedby, invalid state on the field itself.
 *
 * Kept with the auth form rather than in components/ui: the enquiry,
 * profile and posting forms each draw fields their own way today, and
 * moving them is a posting-stage decision, not a side effect of this one.
 */

function NoticeIcon({ tone, className }: { tone: 'error' | 'info'; className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false" className={cn('mt-px size-5 shrink-0', tone === 'error' ? 'text-danger-600' : 'text-brand-600', className)} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <circle cx="10" cy="10" r="7.5" />
      {tone === 'error' ? <path d="M10 6v4.5M10 13.6v.1" /> : <path d="M10 9v4.6M10 6.4v.1" />}
    </svg>
  )
}

/**
 * A message about the form as a whole: an error (announced as an alert) or
 * a status. The icon and the wording carry the meaning; colour only repeats
 * it.
 */
export function AuthNotice({ tone, id, role, children }: { tone: 'error' | 'info'; id?: string; role?: 'alert' | 'status'; children: ReactNode }) {
  return (
    <p
      id={id}
      role={role ?? (tone === 'error' ? 'alert' : 'status')}
      className={tone === 'error'
        ? 'flex gap-3 rounded-md border border-danger-600/30 bg-danger-100 p-3.5 text-body-sm text-ink-900'
        : 'flex gap-3 rounded-md border border-border-strong bg-surface-100 p-3.5 text-body-sm text-ink-700'}
    >
      <NoticeIcon tone={tone} />
      <span className="min-w-0 break-words">{children}</span>
    </p>
  )
}

// text-body-lg (17px), not text-body (15px): Safari on iPhone zooms the
// whole page into any field set below 16px when it is focused, which throws
// the layout around just as the keyboard opens.
const INPUT =
  'mt-2 h-12 w-full rounded-md border border-border-strong bg-surface-000 px-3.5 text-body-lg text-ink-900 placeholder:text-ink-500 hover:border-ink-500 aria-[invalid=true]:border-2 aria-[invalid=true]:border-danger-600'

/**
 * A labelled field with an optional hint and an error beside it.
 *
 * The label stays visible above the field (never a placeholder standing in
 * for it). The error is an alert so it is heard even when focus is already
 * in the field, which is where Enter leaves it; `errorKey` changes on every
 * attempt so the same message, failed twice, is announced twice.
 */
export function AuthField({ id, label, hint, error, errorKey, inputRef, className, ...input }: {
  id: string
  label: string
  hint?: ReactNode
  error?: string
  errorKey?: number
  inputRef?: Ref<HTMLInputElement>
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'aria-invalid' | 'aria-describedby'>) {
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined
  return (
    <div>
      <label htmlFor={id} className="block text-label font-semibold text-ink-900">{label}</label>
      {hint && <p id={hintId} className="mt-1 text-body-sm text-ink-500">{hint}</p>}
      <input
        ref={inputRef}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(INPUT, className)}
        {...input}
      />
      {error && (
        <p key={errorKey} id={errorId} role="alert" className="mt-2 flex gap-2 text-body-sm font-medium text-danger-600">
          <NoticeIcon tone="error" className="mt-0 size-[18px]" />
          <span className="min-w-0 break-words">{error}</span>
        </p>
      )}
    </div>
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

/** The busy mark: the same ring the shared Button spins. */
export function BusyRing({ className }: { className?: string }) {
  return <span aria-hidden className={cn('size-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent', className)} />
}

/**
 * "Continue with Google": a link, so it works before and without
 * JavaScript, to the route that starts the PKCE flow.
 *
 * Once followed it shows that it is working and refuses a second press
 * until the browser leaves: a second start would replace the first
 * attempt's verifier cookie mid-flight. It re-arms itself in two cases
 * where the browser never left: the Back button restoring the page from
 * the back/forward cache with the busy state frozen (`pageshow`), and a
 * navigation that stopped — the Stop button, a dropped connection — after
 * REARM_MS, when a second press is a retry, not a double press.
 */
const REARM_MS = 10_000

export function GoogleButton({ href }: { href: string }) {
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    const reset = (event: PageTransitionEvent) => { if (event.persisted) setBusy(false) }
    window.addEventListener('pageshow', reset)
    return () => window.removeEventListener('pageshow', reset)
  }, [])
  useEffect(() => {
    if (!busy) return
    const timer = window.setTimeout(() => setBusy(false), REARM_MS)
    return () => window.clearTimeout(timer)
  }, [busy])
  return (
    <a
      href={href}
      aria-disabled={busy || undefined}
      aria-busy={busy || undefined}
      onClick={(event) => {
        if (busy) { event.preventDefault(); return }
        // A modified click opens a tab and leaves this page as it was.
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
        setBusy(true)
      }}
      className={cn(
        'relative mt-6 flex min-h-12 w-full items-center justify-center gap-3 rounded-md border border-border-strong bg-surface-000 px-4 text-label font-semibold text-ink-900 shadow-e1 transition-colors hover:border-brand-600 hover:bg-surface-100',
        busy && 'cursor-progress',
      )}
    >
      <GoogleMark />
      Continue with Google
      {/* In the button's right padding, so the label never moves. */}
      {busy && <BusyRing className="absolute right-4 text-ink-500" />}
    </a>
  )
}
