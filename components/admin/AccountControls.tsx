'use client'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ACCOUNT_STATUSES, SELLER_ROLES, type AccountStatus, type SellerRole } from '@/lib/users/model'
import { afterRefresh } from '@/lib/a11y/after-refresh'
import { Button } from '@/components/ui/Button'
import { fieldControlClass, FormCheckbox, FormField } from '@/components/ui/FormField'

type Field = 'change' | 'reason' | 'accepted'
const FIELD_ID: Record<Field, string> = { change: 'account-status', reason: 'account-reason', accepted: 'account-confirm' }
const statusText = (s: AccountStatus) => (s === 'ACTIVE' ? 'Active' : 'Suspended')
const roleText = (r: string) => (r === 'OWNER' ? 'Owner' : r === 'AGENT' ? 'Agent' : r === 'BUILDER' ? 'Builder' : 'Unassigned')

/**
 * An admin's change to one account's status and seller role (Phase 23;
 * busy and focus, UI-11).
 *
 * As in ReviewDecision: fields stay enabled while saving (edits are
 * refused), the button keeps focus and refuses a second press, and pressing
 * it with something missing marks the field and focuses it — the button no
 * longer sits disabled without saying why.
 *
 * A recorded change refreshes the page; the profile's changed value
 * (`account-status-value` or `account-role-value`) takes focus and the
 * change is announced, because this form is remounted for the new version.
 * A stale or missing account (409/404) locks the form until it is
 * refreshed; Refresh account re-reads the server page in place, focus
 * returning to this form's heading.
 */
export function AccountControls({ id, version, status: initialStatus, role: initialRole }: { id: string; version: number; status: AccountStatus; role: SellerRole | null }) {
  const router = useRouter(), request = useRef<string | null>(null)
  const [status, setStatus] = useState(initialStatus), [role, setRole] = useState(initialRole ?? '')
  const [reason, setReason] = useState(''), [accepted, setAccepted] = useState(false), [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false), [error, setError] = useState(''), [conflict, setConflict] = useState(false)
  const [problems, setProblems] = useState<Partial<Record<Field, string>>>({})
  const locked = busy || saved || conflict
  const length = Array.from(reason.trim()).length
  const changed = status !== initialStatus || (role || null) !== initialRole
  const edit = (field: Field, apply: () => void) => {
    if (locked) return
    request.current = null; setAccepted(false); setError('')
    setProblems((p) => { const next = { ...p }; delete next[field]; return next })
    apply()
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (locked) return
    const found: Partial<Record<Field, string>> = {}
    if (!changed) found.change = 'Choose a different status or seller role to save a change.'
    if (length < 5) found.reason = 'Give a reason of at least 5 characters.'
    else if (length > 2000) found.reason = 'Shorten the reason to 2,000 characters or fewer.'
    if (!accepted) found.accepted = 'Confirm this change for this account.'
    setProblems(found)
    const first = (['change', 'reason', 'accepted'] as const).find((f) => found[f])
    if (first) { document.getElementById(FIELD_ID[first])?.focus(); return }
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
      setSaved(true)
      afterRefresh([status !== initialStatus ? 'account-status-value' : 'account-role-value', 'identity-title'],
        `Account change recorded. Marketplace status: ${statusText(status)}. Seller role: ${roleText(role)}.`)
      router.refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The change could not be confirmed. Retry the same change.') }
    finally { setBusy(false) }
  }

  // A newer version remounts this form (its key); if the version is the
  // same after all, the lock must not outlive the refresh either.
  function refresh() {
    setConflict(false); setSaved(false); setError(''); request.current = null; setAccepted(false)
    afterRefresh(['manage-account-heading', 'identity-title'])
    router.refresh()
  }

  return <form onSubmit={submit} noValidate aria-busy={busy} className="admin-decision">
    <div className="admin-decision-head">
      <h2 id="manage-account-heading" tabIndex={-1} className="font-display text-heading-3 font-semibold text-ink-900">Manage account</h2>
      <p className="mt-0.5 text-caption text-ink-700">Changes take effect at once and are recorded in this account’s private history.</p>
    </div>
    <fieldset aria-disabled={locked || undefined} className="min-w-0 space-y-4 p-4">
      <legend className="sr-only">Account change</legend>
      <FormField id={FIELD_ID.change} label="Marketplace status" error={problems.change}
        hint="Suspension blocks protected marketplace actions immediately, including existing sessions. Provider sign-in and already published listings remain available. Restoring access does not verify the account.">
        {(control) => <select {...control} value={status} onChange={(e) => edit('change', () => setStatus(e.target.value as AccountStatus))} className={fieldControlClass}>{ACCOUNT_STATUSES.map((s) => <option key={s} value={s}>{statusText(s)}</option>)}</select>}
      </FormField>
      <FormField id="seller-role" label="Assigned seller role"
        hint="An administrative classification. It grants no staff access or verification and does not change the seller type recorded on a listing.">
        {(control) => <select {...control} value={role} onChange={(e) => edit('change', () => setRole(e.target.value))} className={fieldControlClass}><option value="">Unassigned</option>{SELLER_ROLES.map((r) => <option key={r} value={r}>{roleText(r)}</option>)}</select>}
      </FormField>
      <FormField id={FIELD_ID.reason} label="Reason (required)" error={problems.reason} hint={<>5–2,000 characters. Recorded in the private admin history. {length}/2,000</>}>
        {(control) => <textarea {...control} rows={4} value={reason} onChange={(e) => edit('reason', () => setReason(e.target.value))} className={fieldControlClass} />}
      </FormField>
      <FormCheckbox id={FIELD_ID.accepted} label="I confirm this change for this account." error={problems.accepted}>
        {(control) => <input {...control} type="checkbox" checked={accepted} onChange={(e) => { if (locked) return; setAccepted(e.target.checked); setProblems((p) => { const next = { ...p }; delete next.accepted; return next }) }} className="size-5 shrink-0 accent-brand-600" />}
      </FormCheckbox>
    </fieldset>
    <div className="admin-decision-foot">
      {/* Suspension is the consequential change: said beside the button, not left to the select's colourless value. */}
      <p className="text-body-sm text-ink-900">{status !== initialStatus ? (status === 'SUSPENDED' ? 'This suspends the account: protected marketplace actions stop immediately, including in existing sessions.' : 'This restores marketplace access. It does not verify the account.') : (role || null) !== initialRole ? 'This changes the seller role only; marketplace access is unchanged.' : 'Choose a different status or seller role to change this account.'}</p>
      <Button type="submit" variant={status !== initialStatus && status === 'SUSPENDED' ? 'danger' : 'primary'} loading={busy} aria-disabled={saved || conflict || undefined} fullWidth className="mt-3">{busy ? 'Saving change…' : 'Save account change'}</Button>
      <p role="status" className="mt-2 text-body-sm text-ink-700">{saved ? 'Account change recorded.' : busy ? 'Saving account change.' : ''}</p>
      {error && <div role="alert" className="mt-3 text-body-sm text-danger-600"><p>{error}</p>
        <Button type="button" variant="secondaryBrand" className="mt-2 px-3" onClick={refresh}>Refresh account</Button></div>}
    </div>
  </form>
}
