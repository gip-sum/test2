'use client'

import { useEffect, useState } from 'react'

/**
 * The answer, pinned above the bottom bar on phones while the full result
 * is out of view.
 *
 * On a phone the fields fill the first screen and the result sits below
 * them, so without this the number a person is adjusting towards is never
 * visible while they adjust. It hides whenever the result panel is on
 * screen (so the answer is never shown twice), once it has been scrolled
 * past, and from 1024px, where the
 * result is a sticky column beside the form. Tapping it jumps to the
 * breakdown.
 */
export function ResultPeek({ targetId, label, value }: { targetId: string; label: string; value: string | null }) {
  // Hidden until measured, and whenever the result is on screen or already
  // scrolled past — below it, the pinned bar would only cover the footer.
  const [hidden, setHidden] = useState(true)
  useEffect(() => {
    const target = document.getElementById(targetId)?.closest('section')
    if (!target) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry) setHidden(entry.isIntersecting || entry.boundingClientRect.top < 0)
    }, { threshold: 0.15 })
    observer.observe(target)
    return () => observer.disconnect()
  }, [targetId])

  if (!value) return null
  return (
    <a href={`#${targetId}`} className="calc-peek" data-hidden={hidden || undefined} aria-hidden={hidden || undefined} tabIndex={hidden ? -1 : undefined}>
      <span className="min-w-0">
        <span className="block text-caption text-ink-700">{label}</span>
        <span className="tabular block truncate text-body-lg font-bold text-ink-900">{value}</span>
      </span>
      <span className="shrink-0 text-label text-brand-700">Details ↓</span>
    </a>
  )
}
