'use client'
import { useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { snapshotFromUrl, snapshotUrl, DRAFT_KEYS, type DraftKey } from '@/lib/drafts/types'
import { UUID } from '@/lib/media/types'
import { Button } from '@/components/ui/Button'
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
  // The workspace's save strip before a draft exists (UI-17): what is and
  // is not kept, and the one action that starts keeping it.
  return <div className="border-b border-border-subtle bg-surface-000">
    <div className="home-container flex flex-wrap items-center gap-x-4 gap-y-2 py-2.5">
      <p className="flex min-w-0 flex-1 items-center gap-2 text-body-sm text-ink-700">
        <span aria-hidden className="size-2 shrink-0 rounded-full bg-border-strong" />
        <span>Not saved yet<span className="hidden sm:inline">. Save as draft to keep your answers and resume later</span>.</span>
      </p>
      <div className="flex items-center gap-2">
        <Link href="/post/drafts" className="inline-flex min-h-11 items-center rounded-full px-3 text-label text-brand-700 hover:bg-brand-50">My drafts</Link>
        <Button type="button" variant="secondaryBrand" className="rounded-full" onClick={start} loading={busy}>{busy ? 'Creating draft…' : 'Save as draft'}</Button>
      </div>
      {error && <p role="alert" className="w-full text-body-sm text-danger-600">{error} {login && <Link href={login} className="underline">Login/Register</Link>}</p>}
    </div>
  </div>
}
