'use client'

import { useEffect, useRef, type ReactNode } from 'react'

/**
 * A property card's secondary actions (UI-18), behind one "More" control.
 *
 * A native <details> disclosure, not an ARIA menu: it opens and shows its
 * links without JavaScript, the links stay ordinary links in tab order, and
 * a screen reader hears "More actions for <title>, collapsed". The client
 * layer only adds what a popup is expected to do — Escape and a press
 * outside close it, Escape hands focus back to the control — and closes
 * every other card's menu when one opens, so two never overlap.
 *
 * Kokonut's Morph Popover and Profile Dropdown were considered and not
 * used: both are Motion components (about 30 KB gzip on a route that has
 * none) for a morph this list does not need.
 */
export function CardMenu({ label, children }: { label: string; children: ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null)
  useEffect(() => {
    const menu = ref.current
    if (!menu) return
    const close = (focus: boolean) => {
      if (!menu.open) return
      menu.open = false
      if (focus) menu.querySelector('summary')?.focus()
    }
    const onPointer = (event: PointerEvent) => { if (!menu.contains(event.target as Node)) close(false) }
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && menu.contains(document.activeElement)) { event.preventDefault(); close(true) } }
    const onToggle = () => {
      if (!menu.open) return
      for (const other of document.querySelectorAll<HTMLDetailsElement>('details[data-card-menu][open]')) if (other !== menu) other.open = false
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    menu.addEventListener('toggle', onToggle)
    return () => { document.removeEventListener('pointerdown', onPointer); document.removeEventListener('keydown', onKey); menu.removeEventListener('toggle', onToggle) }
  }, [])
  return (
    <details ref={ref} data-card-menu className="card-menu relative">
      <summary aria-label={label} className="flex size-11 cursor-pointer list-none items-center justify-center rounded-full border border-border-strong text-ink-700 hover:bg-surface-200 hover:text-ink-900 [&::-webkit-details-marker]:hidden">
        <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>
      </summary>
      <div className="card-menu-panel absolute right-0 z-20 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-lg border border-border-subtle bg-surface-000 p-1.5 shadow-e2">
        {children}
      </div>
    </details>
  )
}
