'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * The frame around the login scene, which stops the scene's animations
 * while none of it is on screen.
 *
 * On a phone the scene is a banner above the form, and it scrolls away as
 * soon as someone moves down to type. Browsers keep running CSS animations
 * on an element scrolled out of view, so without this the taxi, the
 * rickshaw, the walkers' strides and the tree would go on costing frames
 * (and battery) for nobody. Marking the frame lets way-home.css pause
 * every animation in the scene together: the story holds where it was and
 * picks up in step when the scene comes back, rather than the street
 * restarting or the people drifting out of time with the traffic.
 *
 * Deliberately CSS-driven rather than using the Web Animations API from
 * here: the scene stays a server-rendered picture with no script of its
 * own, and if this never hydrates, or IntersectionObserver is missing,
 * the scene simply plays, which is what it did before.
 */
export function ScenePlayback({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1]
        if (entry) setPaused(!entry.isIntersecting)
      },
      { threshold: 0 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className={className} data-scene-paused={paused ? '' : undefined}>
      {children}
    </div>
  )
}
