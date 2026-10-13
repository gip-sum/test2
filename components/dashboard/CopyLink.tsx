'use client'
import { useId, useState } from 'react'

/** Copies the public listing address; shows it for copying by hand when the clipboard is unavailable. */
export function CopyLink({ path, title }: { path: string; title: string }) {
  const [state, setState] = useState<{ kind: 'idle' | 'copied' } | { kind: 'manual'; url: string }>({ kind: 'idle' })
  const inputId = useId()
  async function copy() {
    const url = new URL(path, window.location.origin).href
    try { await navigator.clipboard.writeText(url); setState({ kind: 'copied' }) } catch { setState({ kind: 'manual', url }) }
  }
  return <>
    <button type="button" onClick={copy} className="inline-flex min-h-11 items-center font-semibold text-brand-700 underline underline-offset-4">Copy link<span className="sr-only"> to {title}</span></button>
    <span role="status" className="inline-flex min-h-11 items-center text-body-sm text-ink-700 empty:hidden">{state.kind === 'copied' ? 'Link copied' : ''}</span>
    {state.kind === 'manual' && <span className="flex basis-full flex-col gap-1">
      <label htmlFor={inputId} className="text-body-sm text-ink-700">Copying is not available here. Select and copy this link:</label>
      <input id={inputId} readOnly value={state.url} onFocus={(e) => e.currentTarget.select()} autoFocus className="h-11 w-full min-w-0 rounded-md border border-border-subtle bg-surface-000 px-3 text-body-sm text-ink-900" />
    </span>}
  </>
}
