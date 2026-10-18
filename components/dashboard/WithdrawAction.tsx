'use client'
import { useEffect, useId, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { afterRefresh } from '@/lib/a11y/after-refresh'

/**
 * Withdraw from the dashboard, through the Phase 18 lifecycle endpoint.
 *
 * The same request the publishing page sends (draft id, the card's listing
 * version, `withdraw`), so the origin check, verified session, ownership
 * lookup and version guard all apply unchanged. A stale card is rejected by
 * the version guard rather than withdrawing something the seller did not see.
 *
 * Withdrawing a live listing takes it out of public view at once and only
 * review can bring it back, so a tap in a list of cards asks first — and the
 * card changes only when the server has done it, never optimistically: there
 * is no undo, and a "withdrawn" card that was not would be a false claim.
 *
 * Focus (UI-09): "Yes, withdraw" stays focused while busy (Button loading,
 * not disabled). On success focus moves to the confirmation, and once the
 * refreshed page arrives — where this control no longer exists — to the
 * card's heading, or the list heading if the card left the current filter,
 * with the outcome announced.
 */
export function WithdrawAction({ draftId, version, title, configured }: { draftId: string; version: number; title: string; configured: boolean }) {
  const router = useRouter(), questionId = useId(), questionRef = useRef<HTMLParagraphElement>(null), doneRef = useRef<HTMLParagraphElement>(null)
  const [confirming, setConfirming] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [done, setDone] = useState(false)
  useEffect(() => { if (confirming) questionRef.current?.focus() }, [confirming])
  useEffect(() => { if (done) doneRef.current?.focus() }, [done])

  if (!configured) return <p className="text-body-sm text-ink-700">Withdrawal is temporarily unavailable.</p>

  async function withdraw() {
    if (busy) return
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/posting/lifecycle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: draftId, version, action: 'withdraw' }), signal: AbortSignal.timeout(60000) })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : 'The listing could not be withdrawn. Reload and try again.')
      afterRefresh([`property-${draftId}`, 'properties-heading'], `${title} withdrawn. It is no longer public.`)
      setDone(true)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error && e.name !== 'TimeoutError' ? e.message : 'The listing could not be withdrawn. Reload and try again.')
    } finally { setBusy(false) }
  }

  if (done) return <p ref={doneRef} tabIndex={-1} role="status" className="text-body-sm font-semibold text-ink-900">Withdrawn. Updating your dashboard…</p>
  if (!confirming) return <Button type="button" variant="text" onClick={() => setConfirming(true)} className="text-danger-600">Withdraw<span className="sr-only"> {title}</span></Button>
  return <div role="group" aria-labelledby={questionId} className="basis-full rounded-md border border-border-strong bg-surface-100 p-3">
    <p id={questionId} ref={questionRef} tabIndex={-1} className="break-words text-body-sm text-ink-900">Withdraw “{title}”? It leaves public view immediately and must be reviewed again before it can return.</p>
    <div className="mt-2 flex flex-wrap gap-3">
      <Button type="button" variant="danger" onClick={withdraw} loading={busy}>{busy ? 'Withdrawing…' : 'Yes, withdraw'}</Button>
      <Button type="button" variant="secondary" aria-disabled={busy || undefined} onClick={() => { if (busy) return; setConfirming(false); setError('') }}>Cancel</Button>
    </div>
    {busy && <p role="status" className="mt-2 text-body-sm text-ink-700">Withdrawing…</p>}
    {error && <div role="alert" className="mt-2 text-body-sm text-danger-600"><p>{error}</p><Button type="button" variant="text" onClick={() => window.location.reload()}>Reload dashboard</Button></div>}
  </div>
}
