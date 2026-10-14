'use client'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { decisionInput, type ReviewAction } from '@/lib/moderation/model'

export function ReviewDecision({ listing, submission, version }: { listing: string; submission: string; version: number }) {
  const router = useRouter(), request = useRef<string | null>(null)
  const [action, setAction] = useState<ReviewAction>('APPROVE'), [reason, setReason] = useState(''), [days, setDays] = useState('90')
  const [accepted, setAccepted] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [saved, setSaved] = useState(false)
  const reset = () => { request.current = null; setAccepted(false); setError('') }
  const label = action === 'APPROVE' ? 'Approve listing' : action === 'REJECT' ? 'Reject listing' : 'Request corrections'
  const valid = decisionInput({ listing, submission, version, action, reason, days: action === 'APPROVE' ? Number(days) : null, request: 'a9140f33-a429-46f3-9514-3e8f32f18189', accepted: true }) !== null
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (busy || saved || !accepted || !valid) return
    setBusy(true); setError('')
    request.current ??= crypto.randomUUID()
    try {
      const response = await fetch('/api/admin/moderation', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing, submission, version, action, reason, days: action === 'APPROVE' ? Number(days) : null, request: request.current, accepted }), signal: AbortSignal.timeout(20000) })
      const result = await response.json()
      if (!response.ok || result.saved !== true) throw new Error(result.error || 'Decision could not be confirmed. Retry the same decision.')
      setSaved(true); router.refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Decision could not be confirmed. Retry the same decision.') }
    finally { setBusy(false) }
  }
  return <form onSubmit={submit} aria-busy={busy} className="rounded-lg border border-border-subtle bg-surface-000 p-5">
    <h2 className="font-display text-heading-2 text-ink-900">Review decision</h2>
    <fieldset disabled={busy || saved} className="mt-4">
      <legend className="font-semibold text-ink-900">Choose a decision</legend>
      {([['APPROVE', 'Approve'], ['REJECT', 'Reject'], ['REQUEST_CORRECTION', 'Request corrections']] as const).map(([value, text]) => <label key={value} className="flex min-h-11 items-center gap-3 text-body-sm text-ink-900">
        <input type="radio" name="decision" value={value} checked={action === value} onChange={() => { reset(); setAction(value) }} className="size-5 accent-brand-600" />{text}
      </label>)}
      {action === 'APPROVE' && <div className="mt-3"><label htmlFor="review-days" className="block text-label font-semibold">Public validity in days</label><input id="review-days" type="number" min="1" max="180" step="1" value={days} onChange={e => { reset(); setDays(e.target.value) }} className="mt-2 min-h-11 w-full max-w-xs rounded-md border border-border-strong bg-surface-000 px-3 text-ink-900" /><p className="mt-2 text-body-sm text-ink-700">Approval makes this submitted copy public for 1–180 days. It does not certify ownership or property accuracy.</p></div>}
      <label htmlFor="review-reason" className="mt-4 block text-label font-semibold">{action === 'APPROVE' ? 'Review note (optional)' : 'Reason for the seller (required)'}</label>
      <textarea id="review-reason" value={reason} onChange={e => { reset(); setReason(e.target.value) }} rows={4} aria-describedby="review-reason-help" className="mt-2 w-full rounded-md border border-border-strong bg-surface-000 p-3 text-ink-900" />
      <p id="review-reason-help" className="mt-1 text-body-sm text-ink-700">Use 5–2,000 characters when giving a reason. The seller can read this note. {Array.from(reason.trim()).length}/2,000</p>
      <label className="mt-4 flex min-h-11 items-center gap-3 text-body-sm text-ink-900"><input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} className="size-5 shrink-0 accent-brand-600" />I confirm this decision for the submitted copy I reviewed.</label>
    </fieldset>
    <button type="submit" disabled={!valid || !accepted || busy || saved} className="mt-3 min-h-11 rounded-md bg-brand-600 px-5 font-semibold text-on-brand disabled:opacity-50">{busy ? 'Saving decision…' : label}</button>
    {(busy || saved) && <p role="status" className="mt-3 text-body-sm text-ink-700">{saved ? 'Decision recorded. Refreshing the review.' : 'Saving the review decision.'}</p>}
    {error && <div role="alert" className="mt-3 text-body-sm text-danger-600"><p>{error}</p><button type="button" onClick={() => router.refresh()} className="min-h-11 font-semibold underline">Refresh review</button></div>}
  </form>
}
