'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

type State = 'loading' | 'signed-out' | 'ready' | 'error'
type SavedContextValue = {
  state: State
  ids: ReadonlySet<string>
  busy: ReadonlySet<string>
  error: string | null
  toggle: (id: string, save: boolean) => Promise<'ok' | 'signed-out' | 'error'>
  retry: () => void
}

const SavedContext = createContext<SavedContextValue | null>(null)

export function SavedProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>('loading')
  const [ids, setIds] = useState<ReadonlySet<string>>(() => new Set())
  const [busy, setBusy] = useState<ReadonlySet<string>>(() => new Set())
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/saved', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (response.status === 401) { setState('signed-out'); return }
        if (!response.ok) throw new Error('Could not load saved properties. Try again.')
        const data: unknown = await response.json()
        if (!data || typeof data !== 'object' || !('ids' in data) || !Array.isArray(data.ids) ||
          !data.ids.every((id: unknown) => typeof id === 'string')) throw new Error('Could not load saved properties. Try again.')
        setIds(new Set(data.ids))
        setError(null)
        setState('ready')
      })
      .catch(() => { if (!controller.signal.aborted) { setError('Could not load saved properties. Try again using a save button.'); setState('error') } })
    return () => controller.abort()
  }, [version])

  const retry = useCallback(() => { setError(null); setState('loading'); setVersion((n) => n + 1) }, [])
  const toggle = useCallback(async (id: string, save: boolean) => {
    if (state === 'signed-out') return 'signed-out' as const
    if (state !== 'ready' || busy.has(id)) return 'error' as const
    setBusy((previous) => new Set(previous).add(id))
    setError(null)
    try {
      const response = await fetch('/api/saved', {
        method: save ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicId: id }),
        cache: 'no-store',
      })
      if (response.status === 401) { setState('signed-out'); return 'signed-out' as const }
      if (!response.ok) throw new Error('Could not update saved properties. Try again.')
      setIds((previous) => { const next = new Set(previous); if (save) next.add(id); else next.delete(id); return next })
      return 'ok' as const
    } catch {
      setError('Could not update saved properties. Try again.')
      return 'error' as const
    } finally {
      setBusy((previous) => { const next = new Set(previous); next.delete(id); return next })
    }
  }, [state, busy])

  return <SavedContext.Provider value={{ state, ids, busy, error, toggle, retry }}>
    {error && <p role="alert" className="fixed bottom-24 left-4 z-50 max-w-sm rounded-md border border-danger-600 bg-surface-000 p-3 text-body-sm text-ink-900 shadow-e2">{error}</p>}
    {children}
  </SavedContext.Provider>
}

export function useSaved() {
  const context = useContext(SavedContext)
  if (!context) throw new Error('Save controls require SavedProvider')
  return context
}
