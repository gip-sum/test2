'use client'
import { useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { snapshotFromUrl, snapshotUrl, DRAFT_KEYS, type DraftKey } from '@/lib/drafts/types'
import { UUID } from '@/lib/media/types'
export function StartDraft() {
  const router = useRouter(), identity = useRef<{ id: string; collection: string } | null>(null)
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [login, setLogin] = useState('')
  async function start() {
    setBusy(true); setError('')
    const url = new URL(location.href)
    const snapshot = snapshotFromUrl(url)
    const form = document.querySelector<HTMLFormElement>('form[action="/post"]')
    if (form) {
      for (const [k, v] of new FormData(form)) if ((DRAFT_KEYS as readonly string[]).includes(k) && typeof v === 'string') snapshot.input[k as DraftKey] = v
      if (snapshot.input.step === 'location-review') snapshot.input.step = 'location'
      else if (snapshot.input.step === 'pricing-review') snapshot.input.step = 'pricing'
      else snapshot.input.edit = '1'
    }
    identity.current ??= { id: crypto.randomUUID(), collection: UUID.test(url.searchParams.get('collection') ?? '') ? url.searchParams.get('collection')! : crypto.randomUUID() }
    try {
      const r = await fetch('/api/posting/drafts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...identity.current, snapshot }), signal: AbortSignal.timeout(20000) })
      const result = await r.json()
      if (r.status === 401) { setLogin(`/login?next=${encodeURIComponent(snapshotUrl(snapshot) + (url.searchParams.has('collection') ? `&collection=${encodeURIComponent(url.searchParams.get('collection')!)}` : ''))}`); throw Error('Sign in to save a draft and resume on another device.') }
      if (!r.ok) throw Error(result.error || 'Draft could not be created.')
      router.push(`/post/drafts/${result.draft.id}`)
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save draft. Retry.') }
    finally { setBusy(false) }
  }
  return <div className="mx-auto flex max-w-[1320px] flex-wrap items-center gap-3 px-4 pt-5 text-body-sm lg:px-8">
    <button type="button" onClick={start} disabled={busy} className="min-h-11 rounded-md bg-brand-600 px-4 font-semibold text-on-brand disabled:opacity-60">{busy ? 'Creating draft…' : 'Save as draft'}</button>
    <Link href="/post/drafts" className="inline-flex min-h-11 items-center px-2 font-semibold text-brand-700">My drafts</Link>
    <span className="text-ink-500">Enable autosave and resume later.</span>
    {error && <p role="alert" className="w-full text-danger-600">{error} {login && <Link href={login} className="underline">Login/Register</Link>}</p>}
  </div>
}
