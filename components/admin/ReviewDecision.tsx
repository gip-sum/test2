'use client'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { decisionInput, type ReviewAction } from '@/lib/moderation/model'
import { afterRefresh } from '@/lib/a11y/after-refresh'
import { Button } from '@/components/ui/Button'
import { fieldControlClass, FormCheckbox, FormField, FormFieldset } from '@/components/ui/FormField'

type Field = 'days' | 'reason' | 'accepted'
const FIELD_ID: Record<Field, string> = { days: 'review-days', reason: 'review-reason', accepted: 'review-confirm' }
/**
 * The three decisions, each with what it does (UI-20) — the consequence
 * beside the choice, in words, so no one has to infer it from a colour or
 * remember the lifecycle. Order: the one that publishes, then the two that
 * return the listing to its seller.
 */
const ACTIONS = [
  ['APPROVE', 'Approve', 'Publishes this submitted copy to buyers for the days you set.'],
  ['REQUEST_CORRECTION', 'Request corrections', 'Not published. Returned to the seller with your reason to fix and re-submit.'],
  ['REJECT', 'Reject', 'Not published. The seller sees it was rejected, with your reason, and may re-submit.'],
] as const

/**
 * A staff decision on one submitted copy (Phase 22; busy and focus, UI-11).
 *
 * Busy: the fields stay enabled and the button stays focused, refusing a
 * second press (aria-disabled, UI-07). This form used to disable its
 * fieldset and button while saving, which dropped a keyboard user at
 * <body> — Enter in the days field submits, and that field then became
 * disabled under the cursor. Edits are refused while a decision is in
 * flight instead.
 *
 * Validation: the button no longer sits disabled until everything is
 * right, which told nobody what was missing. Pressing it checks the input
 * against the same rules the server applies (decisionInput), marks each
 * problem on its field and moves focus to the first.
 *
 * After a recorded decision the page refreshes, the listing leaves review
 * and this form is replaced; focus goes to the page's status badge
 * (`listing-status`), whose live region reads the new state.
 */
export function ReviewDecision({ listing, submission, version }: { listing: string; submission: string; version: number }) {
  const router = useRouter(), request = useRef<string | null>(null)
  const [action, setAction] = useState<ReviewAction>('APPROVE'), [reason, setReason] = useState(''), [days, setDays] = useState('90')
  const [accepted, setAccepted] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [saved, setSaved] = useState(false)
  const [problems, setProblems] = useState<Partial<Record<Field, string>>>({})
  const locked = busy || saved
  const label = action === 'APPROVE' ? 'Approve listing' : action === 'REJECT' ? 'Reject listing' : 'Request corrections'
  const length = Array.from(reason.trim()).length
  // Any edit makes it a different decision: a new request id and a fresh confirmation.
  const edit = (field: Field | null, apply: () => void) => {
    if (locked) return
    request.current = null; setAccepted(false); setError('')
    if (field) setProblems((p) => { const next = { ...p }; delete next[field]; return next })
    apply()
  }

  function check(): Partial<Record<Field, string>> {
    const found: Partial<Record<Field, string>> = {}
    if (action === 'APPROVE' && !(/^\d+$/.test(days) && Number(days) >= 1 && Number(days) <= 180)) found.days = 'Enter a whole number of days from 1 to 180.'
    if (length > 2000) found.reason = 'Shorten the reason to 2,000 characters or fewer.'
    else if (action !== 'APPROVE' && length < 5) found.reason = 'Give the seller a reason of at least 5 characters.'
    else if (length > 0 && length < 5) found.reason = 'A review note needs at least 5 characters, or leave it empty.'
    if (!accepted) found.accepted = 'Confirm this decision for the submitted copy you reviewed.'
    // Anything else the server would refuse (control characters in the reason).
    if (!found.days && !found.reason && decisionInput({ listing, submission, version, action, reason, days: action === 'APPROVE' ? Number(days) : null, request: 'a9140f33-a429-46f3-9514-3e8f32f18189', accepted: true }) === null) found.reason = 'Remove unsupported characters from the reason.'
    return found
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (locked) return
    const found = check()
    setProblems(found)
    const first = (['days', 'reason', 'accepted'] as const).find((f) => found[f])
    if (first) { document.getElementById(FIELD_ID[first])?.focus(); return }
    setBusy(true); setError('')
    request.current ??= crypto.randomUUID()
    try {
      const response = await fetch('/api/admin/moderation', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing, submission, version, action, reason, days: action === 'APPROVE' ? Number(days) : null, request: request.current, accepted }), signal: AbortSignal.timeout(20000) })
      const result = await response.json()
      if (!response.ok || result.saved !== true) throw new Error(result.error || 'Decision could not be confirmed. Retry the same decision.')
      setSaved(true)
      afterRefresh(['listing-status'])
      router.refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Decision could not be confirmed. Retry the same decision.') }
    finally { setBusy(false) }
  }

  const consequence = action === 'APPROVE' ? `Buyers will see this listing for ${/^\d+$/.test(days) ? `${days} days` : 'the days you set'} once you approve.`
    : action === 'REJECT' ? 'The listing stays private and the seller is told it was rejected.' : 'The listing stays private and goes back to the seller to correct.'
  return <form onSubmit={submit} noValidate aria-busy={busy} className="admin-decision">
    <div className="admin-decision-head">
      <h2 id="review-decision-heading" tabIndex={-1} className="font-display text-heading-3 font-semibold text-ink-900">Your decision</h2>
      <p className="mt-0.5 text-caption text-ink-700">Recorded against this submitted copy and shown in its history.</p>
    </div>
    <div aria-disabled={locked || undefined} className="space-y-4 p-4">
      <FormFieldset messageId="review-action" legend="Choose a decision">
        <div className="mt-2 grid gap-2">
          {/* The radio's name is the decision; its consequence is its description, so a screen reader hears "Reject, radio button" and then what it does. */}
          {ACTIONS.map(([value, text, note]) => <label key={value} data-action={value} className="admin-choice">
            <input type="radio" name="decision" value={value} checked={action === value} onChange={() => edit(null, () => setAction(value))} aria-describedby={`decision-${value}-note`} className="mt-0.5 size-5 shrink-0 accent-brand-600" />
            <span className="min-w-0"><span className="block text-body-sm font-semibold text-ink-900">{text}</span><span id={`decision-${value}-note`} aria-hidden className="block text-caption text-ink-700">{note}</span></span>
          </label>)}
        </div>
      </FormFieldset>
      {action === 'APPROVE' && <FormField id={FIELD_ID.days} label="Public validity in days" error={problems.days}
        hint="Approval makes this submitted copy public for 1–180 days. It does not certify ownership or property accuracy.">
        {(control) => <input {...control} type="number" inputMode="numeric" min="1" max="180" step="1" value={days} onChange={(e) => edit('days', () => setDays(e.target.value))} className={`${fieldControlClass} max-w-xs`} />}
      </FormField>}
      <FormField id={FIELD_ID.reason} label={action === 'APPROVE' ? 'Review note' : 'Reason for the seller (required)'} optional={action === 'APPROVE'} error={problems.reason}
        hint={<>Use 5–2,000 characters when giving a reason. The seller can read this note. {length}/2,000</>}>
        {(control) => <textarea {...control} rows={4} value={reason} onChange={(e) => edit('reason', () => setReason(e.target.value))} className={fieldControlClass} />}
      </FormField>
      <FormCheckbox id={FIELD_ID.accepted} label="I confirm this decision for the submitted copy I reviewed." error={problems.accepted}>
        {(control) => <input {...control} type="checkbox" checked={accepted} onChange={(e) => { if (locked) return; setAccepted(e.target.checked); setProblems((p) => { const next = { ...p }; delete next.accepted; return next }) }} className="size-5 shrink-0 accent-brand-600" />}
      </FormCheckbox>
    </div>
    <div className="admin-decision-foot">
      {/* What pressing will do, said again beside the button: a consequential action is never only a colour. */}
      <p className="text-body-sm text-ink-900">{consequence}</p>
      <Button type="submit" variant={action === 'REJECT' ? 'danger' : action === 'REQUEST_CORRECTION' ? 'secondary' : 'primary'} loading={busy} aria-disabled={saved || undefined} fullWidth className="mt-3">{busy ? 'Saving decision…' : label}</Button>
      <p role="status" className="mt-2 text-body-sm text-ink-700">{saved ? 'Decision recorded. Refreshing the review.' : busy ? 'Saving the review decision.' : ''}</p>
      {error && <div role="alert" className="mt-3 text-body-sm text-danger-600"><p>{error}</p>
        <Button type="button" variant="secondaryBrand" className="mt-2 px-3" onClick={() => { afterRefresh(['review-decision-heading', 'listing-status']); router.refresh() }}>Refresh review</Button></div>}
    </div>
  </form>
}
