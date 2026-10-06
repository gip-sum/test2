'use client'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { DRAFT_KEYS, parseSnapshot, sameSnapshot, snapshotFromUrl, snapshotOf, type Draft, type DraftKey, type Snapshot } from '@/lib/drafts/types'

type Recovery = { revision: number; snapshot: Snapshot }
export function DraftEditor({ initial, children }: { initial: Draft; children: ReactNode }) {
  const router = useRouter(), root = useRef<HTMLDivElement>(null)
  const latest = useRef(snapshotOf(initial)), saved = useRef(snapshotOf(initial)), revision = useRef(initial.revision)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null), running = useRef<Promise<boolean> | null>(null)
  const blocked = useRef(false), leaving = useRef(false)
  const [status, setStatus] = useState('Saved to your account'), [error, setError] = useState(''), [conflict, setConflict] = useState(false)
  const [recovery, setRecovery] = useState<Recovery | null>(null), [moving, setMoving] = useState(false)
  const key = `gb-draft:v1:${initial.owner_id}:${initial.id}`
  function stash() {
    try { sessionStorage.setItem(key, JSON.stringify({ revision: revision.current, snapshot: latest.current })) } catch { /* Account saving still works if browser storage is disabled. */ }
  }
  function clean() { try { sessionStorage.removeItem(key) } catch {} }
  useEffect(() => {
    try {
      const raw = JSON.parse(sessionStorage.getItem(key) ?? 'null'), snapshot = parseSnapshot(raw?.snapshot)
      if (snapshot && Number.isInteger(raw.revision) && !sameSnapshot(snapshot, saved.current)) {
        blocked.current = true
        // Restore browser-only recovery state after hydration; it is not available on the server.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRecovery({ revision: raw.revision, snapshot })
      }
    } catch {}
    const warn = (e: BeforeUnloadEvent) => { if (!sameSnapshot(latest.current, saved.current)) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', warn)
    return () => { window.removeEventListener('beforeunload', warn); if (timer.current) clearTimeout(timer.current) }
  }, [key])
  async function flush(): Promise<boolean> {
    if (timer.current) clearTimeout(timer.current)
    if (blocked.current) return false
    if (running.current) return running.current
    const task = (async () => {
      while (!sameSnapshot(latest.current, saved.current)) {
        const snapshot = latest.current
        setStatus('Saving…'); setError('')
        try {
          const r = await fetch('/api/posting/drafts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: initial.id, revision: revision.current, snapshot }), signal: AbortSignal.timeout(20000) })
          const data = await r.json()
          if (!r.ok) {
            if (r.status === 409) { blocked.current = true; setConflict(true) }
            throw Error(data.error || 'Draft could not be saved.')
          }
          revision.current = data.draft.revision; saved.current = snapshot
          if (sameSnapshot(latest.current, saved.current)) clean(); else stash()
        } catch (e) { setStatus('Not saved to your account'); setError(e instanceof Error ? e.message : 'Save failed. Retry when connected.'); return false }
      }
      setStatus('Saved to your account'); return true
    })()
    running.current = task
    try { return await task } finally { running.current = null }
  }
  function capture(form: HTMLFormElement, submit = false): Snapshot {
    const input = { ...latest.current.input }
    // All named controls are included, including blank values; absent radio groups clear stale choices.
    for (const control of Array.from(form.elements)) {
      if (control instanceof HTMLInputElement || control instanceof HTMLSelectElement || control instanceof HTMLTextAreaElement) {
        if ((DRAFT_KEYS as readonly string[]).includes(control.name)) delete input[control.name as DraftKey]
      }
    }
    for (const [k, v] of new FormData(form)) if ((DRAFT_KEYS as readonly string[]).includes(k) && typeof v === 'string') input[k as DraftKey] = v
    if (!submit) {
      if (input.step === 'location-review') input.step = 'location'
      else if (input.step === 'pricing-review') input.step = 'pricing'
      else input.edit = '1'
    } else delete input.edit
    return { path: '/post', input }
  }
  function changed(target: EventTarget) {
    if (blocked.current || leaving.current) return
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement) || !target.form || target.type === 'file') return
    latest.current = capture(target.form); stash(); setStatus('Unsaved changes')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => { void flush() }, 700)
  }
  async function move(snapshot: Snapshot) {
    if (leaving.current || blocked.current) return
    if (sameSnapshot(snapshot, saved.current) && !running.current) return
    leaving.current = true; setMoving(true); latest.current = snapshot; stash()
    if (await flush()) router.refresh()
    // Keep the form disabled after a failed step change until Retry completes it.
    // Otherwise old controls could overwrite the pending destination snapshot.
  }
  async function restore() {
    if (!recovery) return
    if (recovery.revision !== revision.current) { setConflict(true); setError('The account draft changed since these unsent edits. Load the latest version to avoid overwriting it.'); return }
    latest.current = recovery.snapshot; blocked.current = false; setRecovery(null)
    await move(latest.current)
  }
  function reload() { clean(); blocked.current = false; latest.current = saved.current; window.location.reload() }
  return <div ref={root}>
    <div className="mx-auto max-w-[1320px] px-4 pt-5 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-subtle bg-brand-100 p-4">
        <div><p className="font-semibold text-ink-900">Private draft</p><p role="status" className="text-body-sm text-ink-700">{status}</p></div>
        <button type="button" disabled={moving || !!recovery || conflict} onClick={async () => { if (await flush()) router.push(`/post/drafts/${initial.id}/preview`) }} className="min-h-11 px-3 font-semibold text-brand-700">Preview property</button>
        <button type="button" disabled={moving || !!recovery || conflict} onClick={async () => { if (await flush()) router.push('/post/drafts') }} className="min-h-11 px-3 font-semibold text-brand-700">Save & exit</button>
      </div>
      <noscript><p>JavaScript is required to edit and autosave this draft. <Link href="/post/drafts">Return to drafts</Link>.</p></noscript>
      {error && <div role="alert" className="mt-3 rounded-md border border-border-strong p-4 text-danger-600"><p>{error}</p>{conflict ? <button type="button" onClick={reload} className="min-h-11 underline">Discard unsent edits and load latest</button> : <button type="button" onClick={async () => { if (await flush()) { if (leaving.current) router.refresh() } }} className="min-h-11 underline">Retry save</button>}</div>}
      {recovery && <div role="alert" className="mt-3 rounded-md border border-border-strong p-4 text-ink-900"><p>Unsent changes were recovered from this tab. They are not saved to your account.</p><button type="button" onClick={restore} className="min-h-11 px-3 font-semibold text-brand-700">Restore unsent changes</button><button type="button" onClick={reload} className="min-h-11 px-3 underline">Keep account version</button></div>}
    </div>
    <div inert={moving || !!recovery || conflict} onChangeCapture={e => changed(e.target)} onSubmitCapture={e => {
      if (!(e.target instanceof HTMLFormElement) || e.target.getAttribute('action') !== '/post') return
      e.preventDefault(); void move(capture(e.target, true))
    }} onClickCapture={e => {
      const anchor = (e.target as HTMLElement).closest('a')
      if (!anchor || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const url = new URL(anchor.href)
      if (url.origin !== location.origin || !['/post', '/post/photos'].includes(url.pathname)) return
      e.preventDefault(); e.stopPropagation()
      const next = snapshotFromUrl(url), form = root.current?.querySelector<HTMLFormElement>('form[action="/post"]')
      if (form) {
        const partial = capture(form)
        for (const control of Array.from(form.elements)) if ((control instanceof HTMLInputElement || control instanceof HTMLSelectElement || control instanceof HTMLTextAreaElement) && control.type !== 'hidden' && (DRAFT_KEYS as readonly string[]).includes(control.name)) {
          const k = control.name as DraftKey
          if (partial.input[k] !== undefined) next.input[k] = partial.input[k]; else delete next.input[k]
        }
      }
      void move(next)
    }}>{children}</div>
  </div>
}
