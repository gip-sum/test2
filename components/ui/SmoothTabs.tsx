'use client'

/**
 * Tabs with a sliding indicator (UI-05).
 *
 * Adapted from Kokonut UI "smooth-tab" v2.0.0 by @dorianbaffier —
 * github.com/kokonut-labs/kokonutui at commit
 * bb9120f8711b63eb5a7545976cac7493d49e616c,
 * components/kokonutui/smooth-tab.tsx. MIT License,
 * Copyright (c) 2025 kokonutUI. Adapted and owned by GharBazaar from here.
 *
 * Kept from Kokonut: the WAI-ARIA tabs keyboard model (roving tabindex,
 * Left/Right wrapping, Home/End, selection following focus); measuring the
 * tabs with a ResizeObserver and correcting for a transformed ancestor (our
 * Sheet scales from 0.97 while it opens); and the indicator technique — the
 * labels drawn a second time in the active colour, clipped to the
 * indicator, so every label is exactly the right colour at every point of
 * the slide with no colour tween.
 *
 * Changed: colours, radius, type and timing are GharBazaar tokens; the
 * indicator moves with a CSS transition (`--duration-base`,
 * `--ease-standard`) instead of a Motion spring, because our motion language
 * does not overshoot and a CSS transition costs no JavaScript (UI-05 measured
 * the Motion version; see docs/ui-modernization/UI-05-core-components.md);
 * a separate pill carries the active tab's shadow, which a clip-path would
 * cut off; and the selected tab is styled in plain CSS until the indicator
 * has been measured, so server HTML, a slow device or no JavaScript still
 * shows which tab is active.
 *
 * Removed: the swipeable panel track and its drag physics (our tabs switch
 * the content of one form, not separate panels, and a horizontal swipe
 * would fight the inputs inside it), icons and `lucide-react`, the demo
 * content, zinc colours and every `dark:` variant.
 *
 * Reduced motion: the global reduced-motion rule collapses the transition,
 * so the indicator jumps.
 */
import { type KeyboardEvent, useLayoutEffect, useRef, useState } from 'react'
import { cn } from '@/lib/cn'

export type TabItem<T extends string> = { value: T; label: string }

type Box = { left: number; top: number; width: number; height: number }

export function SmoothTabs<T extends string>({
  items,
  value,
  onChange,
  label,
  idPrefix,
  fullWidth = false,
  controls,
  className,
}: {
  items: TabItem<T>[]
  value: T
  onChange: (value: T) => void
  /** Accessible name for the tab list. */
  label: string
  /** Each tab's id is `${idPrefix}-${value}`. */
  idPrefix: string
  /** Stretch into equal parts — a phone form, where each tab is a big target. */
  fullWidth?: boolean
  /** Id of the region the tabs change, for aria-controls. */
  controls?: string
  className?: string
}) {
  const listRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  // Null until measured: the indicator does not exist before then and the
  // selected tab paints its own background.
  const [layout, setLayout] = useState<{ list: Box; tabs: Box[] } | null>(null)
  // The indicator glides only once the user has changed tab, so measuring
  // after a resize or a font swap never animates.
  const [interacted, setInteracted] = useState(false)
  const selected = Math.max(items.findIndex((item) => item.value === value), 0)

  useLayoutEffect(() => {
    const list = listRef.current
    if (!list) return
    let alive = true
    const measure = () => {
      if (!alive) return
      const box = list.getBoundingClientRect()
      // offsetWidth ignores transforms; only a real transform counts as scale.
      const ratio = box.width / (list.offsetWidth || 1)
      const scale = Math.abs(ratio - 1) < 0.01 ? 1 : ratio
      setLayout({
        list: { left: 0, top: 0, width: box.width / scale, height: box.height / scale },
        tabs: tabRefs.current.slice(0, items.length).map((tab) => {
          const r = tab?.getBoundingClientRect()
          return r
            ? { left: (r.left - box.left) / scale, top: (r.top - box.top) / scale, width: r.width / scale, height: r.height / scale }
            : { left: 0, top: 0, width: 0, height: 0 }
        }),
      })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(list)
    document.fonts?.ready.then(measure).catch(() => undefined)
    return () => {
      alive = false
      observer.disconnect()
    }
  }, [items.length])

  const select = (index: number) => {
    const next = items[index]
    if (!next) return
    setInteracted(true)
    if (next.value !== value) onChange(next.value)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const count = items.length
    const target = ({ ArrowRight: (index + 1) % count, ArrowLeft: (index - 1 + count) % count, Home: 0, End: count - 1 } as Record<string, number>)[event.key]
    if (target === undefined) return
    event.preventDefault()
    tabRefs.current[target]?.focus()
    select(target)
  }

  const rect = layout?.tabs[selected]
  const motion = interacted ? 'transition-[transform,width,clip-path] duration-(--duration-base) ease-standard' : undefined
  const tabLayout = cn('inline-flex h-11 items-center justify-center whitespace-nowrap rounded-full px-6 text-label', fullWidth && 'flex-1 lg:flex-none')

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      data-indicator={layout ? '' : undefined}
      className={cn('group/tabs relative isolate gap-1 rounded-full bg-surface-200 p-1', fullWidth ? 'flex w-full lg:inline-flex lg:w-auto' : 'inline-flex', className)}
    >
      {items.map((item, i) => {
        const isSelected = i === selected
        return (
          <button
            key={item.value}
            ref={(el) => { tabRefs.current[i] = el }}
            type="button"
            role="tab"
            id={`${idPrefix}-${item.value}`}
            aria-selected={isSelected}
            aria-controls={controls}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => select(i)}
            onKeyDown={(event) => onKeyDown(event, i)}
            className={cn(
              tabLayout,
              'transition-colors',
              isSelected
                // Before the indicator exists the selected tab is its own pill.
                ? 'bg-brand-600 text-on-brand shadow-e1 group-data-[indicator]/tabs:bg-transparent group-data-[indicator]/tabs:shadow-none'
                : 'text-ink-700 hover:bg-surface-000 hover:text-ink-900',
            )}
          >
            {item.label}
          </button>
        )
      })}
      {layout && rect && (
        <>
          {/* The pill: background and shadow, under the active labels. */}
          <span
            aria-hidden="true"
            className={cn('pointer-events-none absolute left-0 top-0 rounded-full bg-brand-600 shadow-e1', motion)}
            style={{ width: rect.width, height: rect.height, transform: `translate(${rect.left}px, ${rect.top}px)` }}
          />
          {/* The labels again in the active colour, clipped to the pill. */}
          <div
            aria-hidden="true"
            className={cn('pointer-events-none absolute inset-0 flex gap-1 p-1 text-on-brand', motion)}
            style={{
              clipPath: `inset(${rect.top}px ${layout.list.width - rect.left - rect.width}px ${layout.list.height - rect.top - rect.height}px ${rect.left}px round ${rect.height / 2}px)`,
            }}
          >
            {items.map((item) => <span key={item.value} className={tabLayout}>{item.label}</span>)}
          </div>
        </>
      )}
    </div>
  )
}
