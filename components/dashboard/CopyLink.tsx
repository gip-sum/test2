'use client'
import { useId, useState } from 'react'
import { Button } from '@/components/ui/Button'

/**
 * Copies the public listing address; shows it for copying by hand when the
 * clipboard is unavailable (never a silent "copied"). Focus stays on the
 * button; the status is cleared first so a second copy is announced again
 * (UI-12).
 */
export function CopyLink({ path, title }: { path: string; title: string }) {
  const [state, setState] = useState<{ kind: 'idle' | 'copied' } | { kind: 'manual'; url: string }>({ kind: 'idle' })
  const inputId = useId()
  async function copy() {
    const url = new URL(path, window.location.origin).href
    setState({ kind: 'idle' })
    try { await navigator.clipboard.writeText(url); setState({ kind: 'copied' }) } catch { setState({ kind: 'manual', url }) }
  }
  return <>
    <Button type="button" variant="text" onClick={copy} className="text-brand-700">Copy link<span className="sr-only"> to {title}</span></Button>
    <span role="status" className="inline-flex min-h-11 items-center text-body-sm text-ink-700 empty:hidden">{state.kind === 'copied' ? 'Link copied' : ''}</span>
    {state.kind === 'manual' && <span className="flex basis-full flex-col gap-1">
      <label htmlFor={inputId} className="text-body-sm text-ink-700">Copying is not available here. Select and copy this link:</label>
      <input id={inputId} readOnly value={state.url} onFocus={(e) => e.currentTarget.select()} autoFocus className="h-11 w-full min-w-0 rounded-md border border-border-subtle bg-surface-000 px-3 text-body-sm text-ink-900" />
    </span>}
  </>
}
