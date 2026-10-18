'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/cn'
import { SAVED_REMOVING } from '@/lib/saved/removal'
import { useSaved } from './SavedProvider'

/**
 * `id` is a demo fixture's public id (`p_…`) or a real listing's id; the
 * saved list holds both.
 *
 * The button is a 44px square and the visible heart sits in a 44px circle
 * inside it (UI-06): hit-testing follows border-radius, so a round button
 * lost its corners as a touch target. `className` places the button;
 * `visualClassName` styles the circle (border, fill, shadow).
 *
 * While the request is in flight the button is aria-disabled, not disabled
 * (UI-08, the UI-07 Button rule): disabling it while focused sent keyboard
 * focus to <body>, so the confirmed state was never heard. When the server
 * confirms, the heart swells once (`data-heart`, app/globals.css).
 *
 * On the Saved list a confirmed removal refreshes the page and this card —
 * and the focused heart — leaves (UI-12). Before the refresh the heart
 * hands focus on (afterRefresh): to the next saved home's heart, else the
 * previous one's, else the count or the empty shortlist, and says what was
 * removed; SavedGrid slides the remaining cards into place. Nothing is
 * removed before the server confirms it.
 */
export function SaveButton({ id, title, className, visualClassName }: { id: string; title: string; className?: string; visualClassName?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const { state, ids, busy, toggle, retry } = useSaved()
  const saved = ids.has(id)
  const pending = busy.has(id)
  // The last change confirmed through THIS button. Re-keying the icon
  // restarts its animation; nothing confirmed here (saved state loading, the
  // same listing saved through another heart) never animates.
  const [confirmed, setConfirmed] = useState<{ count: number; kind: 'save' | 'unsave' } | null>(null)

  const onSavedList = pathname === '/account/saved'

  async function click(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()
    // currentTarget is gone after the await below.
    const button = event.currentTarget
    if (state === 'signed-out') {
      router.push(`/login?next=${encodeURIComponent(pathname)}`)
      return
    }
    if (state === 'error') { retry(); return }
    if (state !== 'ready' || pending) return
    const result = await toggle(id, !saved)
    if (result === 'ok') setConfirmed((last) => ({ count: (last?.count ?? 0) + 1, kind: saved ? 'unsave' : 'save' }))
    if (result === 'signed-out') router.push(`/login?next=${encodeURIComponent(pathname)}`)
    if (result === 'ok' && onSavedList) {
      const item = button.closest<HTMLElement>('[data-flip-key]')
      const neighbours = [item?.nextElementSibling, item?.previousElementSibling].map((el) => (el as HTMLElement | null)?.dataset.flipKey).filter(Boolean)
      // Loaded only here: the hearts on every public page never need it.
      const { afterRefresh } = await import('@/lib/a11y/after-refresh')
      afterRefresh([...neighbours.map((key) => `save-${key}`), 'saved-count', 'saved-empty'], `${title} removed from your saved properties.`)
      document.dispatchEvent(new Event(SAVED_REMOVING))
      router.refresh()
    }
  }

  return (
    <button
      type="button"
      id={onSavedList ? `save-${id}` : undefined}
      aria-pressed={state === 'ready' ? saved : undefined}
      aria-busy={pending}
      aria-label={state === 'loading' ? 'Checking saved status' : state === 'error' ? 'Retry loading saved properties' : saved ? `Remove ${title} from saved` : `Save ${title}`}
      aria-disabled={state === 'loading' || pending || undefined}
      onClick={click}
      className={cn('group relative z-10 grid size-11 place-items-center outline-none aria-disabled:opacity-60', state === 'loading' || pending ? 'cursor-progress' : null, className)}
    >
      <span
        className={cn(
          'grid size-11 place-items-center rounded-full border border-border-subtle bg-surface-000/95 group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-focus-ring',
          saved ? 'text-danger-600' : 'text-ink-700 group-hover:text-danger-600',
          visualClassName,
        )}
      >
        <svg key={confirmed?.count ?? 0} data-heart={confirmed?.kind} viewBox="0 0 24 24" className="size-5" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.75} strokeLinejoin="round" aria-hidden>
          <path d="M12 20s-7-4.4-7-9a4 4 0 017-2.6A4 4 0 0119 11c0 4.6-7 9-7 9z" />
        </svg>
      </span>
    </button>
  )
}
