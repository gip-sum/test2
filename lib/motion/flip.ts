/**
 * FLIP for a list whose items change place (UI-08): First, Last, Invert,
 * Play. Before the change, `measure` records where each keyed item is; after
 * React has committed the new order, `play` moves each item back to where it
 * was with a transform and animates it home.
 *
 * Why the Web Animations API and not Motion's `layout` prop: the job is one
 * transform per moved item. Motion's layout animation needs its `domMax`
 * feature bundle (28.4 KB gzip measured in UI-06) and wraps every item in a
 * client `m.*` element; this is a few lines with no dependency, and the item
 * is in its new place in the DOM from the first frame — focus, the
 * accessibility tree and clicks are never waiting on the animation.
 * CSS alone cannot do it: there is no transition between two grid cells.
 *
 * Items carry `data-flip-key`. Timing comes from the motion tokens
 * (--duration-base, --ease-standard), read from the document so the scale
 * stays in one place. Reduced motion: nothing moves — the global CSS rule
 * does not reach the Web Animations API, so the preference is checked here.
 */
export type FlipSnapshot = Map<string, DOMRect>

export function measure(container: HTMLElement | null): FlipSnapshot {
  const rects: FlipSnapshot = new Map()
  for (const el of container?.querySelectorAll<HTMLElement>('[data-flip-key]') ?? []) {
    rects.set(el.dataset.flipKey!, el.getBoundingClientRect())
  }
  return rects
}

export function play(container: HTMLElement | null, before: FlipSnapshot, lead?: string) {
  if (!container || matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const root = getComputedStyle(document.documentElement)
  const duration = parseFloat(root.getPropertyValue('--duration-base')) || 200
  const easing = root.getPropertyValue('--ease-standard').trim() || 'ease'
  for (const el of container.querySelectorAll<HTMLElement>('[data-flip-key]')) {
    const from = before.get(el.dataset.flipKey!)
    if (!from) continue
    // A move interrupted mid-flight starts from where the item is now drawn,
    // not from its old cell: cancel first, then measure.
    for (const running of el.getAnimations()) if (running.id === 'flip') running.cancel()
    const to = el.getBoundingClientRect()
    const dx = from.left - to.left, dy = from.top - to.top
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue
    // The item the person moved travels above the ones making room for it.
    const raised = el.dataset.flipKey === lead
    if (raised) el.style.zIndex = '1'
    const animation = el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration, easing, id: 'flip' })
    if (raised) animation.addEventListener('finish', () => { el.style.zIndex = '' }, { once: true })
    if (raised) animation.addEventListener('cancel', () => { el.style.zIndex = '' }, { once: true })
  }
}
