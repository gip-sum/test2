'use client'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ACCOUNT_STATUSES, SELLER_ROLES, type AccountStatus, type SellerRole } from '@/lib/users/model'
import { Button } from '@/components/ui/Button'

export function AccountControls({ id, version, status: initialStatus, role: initialRole }: { id: string; version: number; status: AccountStatus; role: SellerRole | null }) {
  const router = useRouter(), request = useRef<string | null>(null)
  const [status, setStatus] = useState(initialStatus), [role, setRole] = useState(initialRole ?? '')
  const [reason, setReason] = useState(''), [accepted, setAccepted] = useState(false), [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false), [error, setError] = useState(''), [conflict, setConflict] = useState(false)
  const length = Array.from(reason.trim()).length
  const valid = (status !== initialStatus || (role || null) !== initialRole) && length >= 5 && length <= 2000
  const reset = () => { request.current = null; setAccepted(false); setError('') }
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!valid || !accepted || busy || saved || conflict) return
    request.current ??= crypto.randomUUID()
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: id, version, status, role: role || null, reason, request: request.current, accepted }), signal: AbortSignal.timeout(15000) })
      const value = await response.json()
      if (!response.ok || value.saved !== true) {
        if (response.status === 409 || response.status === 404) setConflict(true)
        throw new Error(value.error || 'The change could not be confirmed. Retry the same change.')
      }
      setSaved(true); router.refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The change could not be confirmed. Retry the same change.') }
    finally { setBusy(false) }
  }
  return <form onSubmit={submit} aria-busy={busy} className="rounded-lg border border-border-subtle bg-surface-000 p-5">
    <h2 className="font-display text-heading-2 text-ink-900">Manage account</h2>
    <fieldset disabled={busy || saved || conflict} className="mt-4 space-y-4">
      <legend className="sr-only">Account change</legend>
      <div><label htmlFor="account-status" className="block text-label font-semibold">Marketplace status</label>
        <select id="account-status" value={status} onChange={e => { reset(); setStatus(e.target.value as AccountStatus) }} className="mt-2 min-h-11 w-full rounded-md border border-border-strong bg-surface-000 px-3 text-ink-900">{ACCOUNT_STATUSES.map(s => <option key={s} value={s}>{s === 'ACTIVE' ? 'Active' : 'Suspended'}</option>)}</select>
        <p className="mt-2 text-body-sm text-ink-700">Suspension blocks protected marketplace actions immediately, including existing sessions. Provider sign-in and already published listings remain available. Restoring access does not verify the account.</p></div>
      <div><label htmlFor="seller-role" className="block text-label font-semibold">Assigned seller role</label>
        <select id="seller-role" value={role} onChange={e => { reset(); setRole(e.target.value) }} className="mt-2 min-h-11 w-full rounded-md border border-border-strong bg-surface-000 px-3 text-ink-900"><option value="">Unassigned</option>{SELLER_ROLES.map(r => <option key={r} value={r}>{r === 'OWNER' ? 'Owner' : r === 'AGENT' ? 'Agent' : 'Builder'}</option>)}</select>
        <p className="mt-2 text-body-sm text-ink-700">An administrative classification. It grants no staff access or verification and does not change the seller type recorded on a listing.</p></div>
      <div><label htmlFor="account-reason" className="block text-label font-semibold">Reason (required)</label>
        <textarea id="account-reason" rows={4} value={reason} onChange={e => { reset(); setReason(e.target.value) }} aria-describedby="account-reason-help" className="mt-2 w-full rounded-md border border-border-strong bg-surface-000 p-3 text-ink-900" />
        <p id="account-reason-help" className="mt-1 text-body-sm text-ink-700">5–2,000 characters. Recorded in the private admin history. {length}/2,000</p></div>
      <label className="flex min-h-11 items-center gap-3 text-body-sm text-ink-900"><input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} className="size-5 shrink-0 accent-brand-600" />I confirm this change for this account.</label>
    </fieldset>
    <Button type="submit" disabled={!valid || !accepted || busy || saved || conflict} className="mt-4 px-5">{busy ? 'Saving change…' : 'Save account change'}</Button>
    <p role="status" className="mt-3 text-body-sm text-ink-700">{saved ? 'Account change recorded.' : busy ? 'Saving account change.' : ''}</p>
    {error && <div role="alert" className="mt-3 text-body-sm text-danger-600"><p>{error}</p></div>}
    {(error || saved) && <button type="button" onClick={() => window.location.reload()} className="min-h-11 font-semibold text-ink-900 underline">Refresh account</button>}
  </form>
}
